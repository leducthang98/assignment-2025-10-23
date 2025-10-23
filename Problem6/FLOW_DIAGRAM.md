# Flow Diagrams

---

## Complete Score Update Flow

```
User completes action
        |
        v
Client calls API
POST /api/action/complete
Authorization: Bearer {jwt}
Body: { actionId, data }
        |
        v
Server validates JWT
        |
        v
Check rate limit
(10 requests per minute)
        |
        +-- Exceeded --> Reject 429
        |
        v
Validate action
- Check if actionId exists
- Check if already completed
- Validate action-specific data
        |
        +-- Invalid --> Reject 400
        |
        v
Determine points (server-side)
- Look up points for this action type
- Cannot be specified by client
        |
        v
Start database transaction
        |
        v
Update user score in database
        |
        v
Insert audit log (in same transaction)
        |
        +-- Duplicate detected --> Rollback, return 400
        +-- Database error --> Rollback, return 500
        |
        v
Commit transaction
        |
        v
Update Redis cache (atomic operation)
- Add score to sorted set
- Retrieve current top 10
        |
        v
Compare with previous top 10
(check user IDs, not just scores)
        |
        +-- No membership change --> Return response
        |
        +-- Membership changed
            |
            v
        Publish update to Redis channel
            |
            v
        WebSocket servers receive message
            |
            v
        Broadcast to connected clients
            |
            v
        Clients update leaderboard UI
```

---

## Authentication Flow

```
Client request
        |
        v
Extract JWT from Authorization header
        |
        +-- Missing --> 401 Unauthorized
        |
        v
Verify JWT signature
        |
        +-- Invalid --> 401 Invalid Token
        |
        v
Check expiration
        |
        +-- Expired --> 401 Token Expired
        |
        v
Extract userId from token
        |
        v
Process request
```

---

## Cache Strategy

```
GET /api/leaderboard
        |
        v
Query Redis: leaderboard:top10
        |
        +-- Cache Hit (95%) --> Return data (5ms)
        |
        +-- Cache Miss (5%)
                |
                v
        Query PostgreSQL
        ORDER BY score DESC
        LIMIT 10
                |
                v
        Store in Redis
                |
                v
        Return data (50ms)
```

---

## WebSocket Broadcast

```
Score update occurs
        |
        v
Calculate new top 10
        |
        v
Compare with cached top 10
        |
        +-- No change --> Skip broadcast (95% of updates)
        |
        +-- Changed
            |
            v
        Publish to Redis channel
            |
            v
        All WebSocket servers receive
            |
            v
        Broadcast to connected clients
        (10,000+ connections)
            |
            v
        Clients update UI
```

---

## Rate Limiting

```
Request arrives
        |
        v
Check Redis: ratelimit:{userId}
        |
        v
Get current count
        |
        +-- Count >= 10 --> Reject 429
        |                   "Too many requests"
        |
        +-- Count < 10
            |
            v
        Increment counter
        Set TTL: 60 seconds
            |
            v
        Allow request
```

---

## Database Failover

```
Primary database fails
        |
        v
Health check detects failure
(< 5 seconds)
        |
        v
Promote replica to primary
        |
        v
Update connection strings
        |
        v
Application reconnects
        |
        v
Service restored
(< 30 seconds downtime)
```

---

## Concurrent Updates

```
Request A                Request B
--------                 --------
BEGIN                    
                         BEGIN
UPDATE score            
                         UPDATE score
                         (waits for lock)
COMMIT                  
(releases lock)         
                         (acquires lock)
                         COMMIT

Result: Both applied correctly
```

---

**Notes:**
- All flows use JWT for authentication
- Rate limiting prevents abuse
- Redis caching for performance
- Only broadcast when top 10 actually changes

---

## Key Technical Considerations

### Transaction Management
**Challenge:** Score update and audit log must maintain consistency under concurrent load.  
**Approach:** Single database transaction ensures atomic writes across both tables.  
**Outcome:** Data integrity guaranteed even during failures or high concurrency.

### Race Condition Prevention
**Challenge:** Cache updates and change detection must be accurate under concurrent modifications.  
**Approach:** Atomic Redis operations combine update and retrieval without timing gaps.  
**Outcome:** Consistent top 10 detection prevents duplicate or missed broadcasts.
