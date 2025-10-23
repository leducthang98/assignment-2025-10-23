## Technical Specification

---

## Overview

Live-updating top 10 leaderboard with secure score updates. Users complete actions to increase their scores, with real-time WebSocket updates to all connected clients.

---

## Requirements

1. Display top 10 users by score
2. Real-time updates when scores change
3. User actions increase scores
4. Secure API for score updates (authenticated users only)
5. Handle 10,000+ concurrent users

---

## Architecture

```
┌──────────────┐          ┌──────────────────┐          ┌──────────────┐
│   Client     │─────────▶│   API Server     │─────────▶│  PostgreSQL  │
│  (Browser)   │          │  + WebSocket     │          │   Database   │
│              │          │                  │          └──────────────┘
│  HTTP/WS     │◀─────────│                  │
└──────────────┘          └────────┬─────────┘
                                   │
                                   ▼
                               ┌─────────┐
                               │  Redis  │
                               │  Cache  │
                               └─────────┘
```

### Stack

- **Backend**: Node.js / Go
- **Database**: PostgreSQL (primary + replicas)
- **Cache**: Redis (for leaderboard + pub/sub)
- **WebSocket**: Socket.io / ws library

---

## Data Models

### User
- `id` - UUID
- `username` - String (unique)
- `score` - Integer (default: 0)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Score History (Audit)
- `id` - UUID
- `user_id` - Foreign key to users
- `action_id` - String (action type, e.g., "quiz_123")
- `score_change` - Integer (points earned)
- `created_at` - Timestamp

**Note:** Combination of `user_id` + `action_id` should be unique to prevent duplicate completions.

---

## API Endpoints

### GET /api/leaderboard

Returns top 10 users ordered by score.

**Response Fields:**
- `users` - Array of user objects
  - `userId` - User identifier
  - `username` - Display name
  - `score` - Current score
  - `rank` - Position (1-10)
- `updatedAt` - Last modification timestamp

### POST /api/action/complete

Validates action completion and updates score automatically.

**Headers:**
- `Authorization: Bearer {jwt}` - Required

**Request Body:**
- `actionId` - Action identifier (e.g., "quiz_123", "level_5")
- `data` - Action-specific data for validation (optional)

**Response Fields:**
- `success` - Completion status
- `pointsEarned` - Points awarded for this action
- `newScore` - Updated total score
- `rank` - Current leaderboard position

**Error Codes:**
- `400` - Invalid action or already completed
- `401` - Not authenticated
- `429` - Rate limit exceeded (10 requests/minute)

**Note:** Points are determined server-side based on action type. Client cannot specify point values.

### WS /api/leaderboard/live

WebSocket connection for real-time leaderboard updates.

**Connection:**
- URL: `ws://localhost:3000/api/leaderboard/live`
- Authentication: JWT token in connection params or initial frame

**Server Message:**
- `type` - Message type ("LEADERBOARD_UPDATE")
- `data` - Updated leaderboard data
  - `users` - Top 10 array (same structure as GET endpoint)
  - `updatedAt` - Timestamp

---

## WebSocket Connection Management

**Connection Lifecycle:**
1. Client connects with JWT token
2. Server validates and sends initial leaderboard
3. Server sends PING every 30 seconds
4. Client must respond with PONG within 10 seconds
5. Connection closed if no response (prevents zombie connections)

**Reconnection:**
- Automatic retry on disconnect
- Exponential backoff: 1s → 2s → 4s → 8s → 16s (max 30s)
- Full leaderboard refresh after reconnect

**Connection Limits:**
- Max 2,000 connections per WebSocket server
- Max 2 connections per user
- Oldest connection dropped if limit exceeded

---

## Error Handling

**Standard Error Format:**
- Error code (machine-readable)
- Human-readable message

**Error Codes:**
- `401 UNAUTHORIZED` - Missing/invalid token → Redirect to login
- `401 TOKEN_EXPIRED` - JWT expired → Refresh token and retry
- `429 RATE_LIMIT_EXCEEDED` - Too many requests → Wait and retry (includes `retryAfter` field)
- `400 INVALID_ACTION` - Action doesn't exist → Show error to user
- `400 ALREADY_COMPLETED` - Duplicate action → Show completion status
- `500 INTERNAL_SERVER_ERROR` - Server error → Retry with backoff

**Partial Failure Handling:**
- Database updated but cache fails → Return success (DB is source of truth, cache reconciles later)
- WebSocket broadcast fails → Return success (clients get update on next poll)
- Retry policy: Database (no auto-retry), Cache (fail gracefully), WebSocket (best-effort)

---

## Testing Strategy

**1. Unit Tests (80% coverage)**
- Score calculation logic
- Duplicate action prevention
- Rate limit enforcement
- JWT validation
- Top 10 ranking calculation

**2. Integration Tests**
- Full score update flow (DB + cache + WebSocket)
- Authentication and authorization
- Rate limiting under load
- Cache invalidation
- Error scenarios (DB failure, cache failure)

**3. WebSocket Tests**
- Broadcast when top 10 changes
- Reconnection handling
- Heartbeat/ping-pong mechanism
- Multiple concurrent connections

**4. Load Tests**
- 1,000 concurrent GET requests (target: < 5ms p95)
- 100 score updates/second (target: < 50ms p95)
- 10,000 WebSocket connections
- Rate limit testing (10 req/min per user)

**5. Manual Testing Checklist**
- [ ] Leaderboard displays correctly
- [ ] Real-time updates across browser tabs
- [ ] Duplicate action rejection
- [ ] Rate limiting (15 rapid requests)
- [ ] WebSocket reconnection after network loss
- [ ] JWT validation (invalid/expired tokens)
- [ ] Correct ranking order

---

## Security

### Authentication
- JWT tokens (15 min expiry)
- Required for all score updates
- HTTPS only in production

### Rate Limiting
- 10 score updates per user per minute
- Prevents spam/abuse
- Returns 429 if exceeded

### Input Validation
- Points must be positive (1-100 range)
- Action IDs validated against whitelist
- SQL injection prevention (parameterized queries)

---

## Concurrency & Consistency

### Transaction Management
Database operations must be wrapped in transactions to maintain data integrity.

**Atomic operations:**
- Score update and audit log insertion must execute together
- If audit log fails, score update must rollback
- Return new total score after successful commit

**Rollback triggers:**
- Duplicate action detection (unique constraint violation)
- Database connection failures
- Any validation error during execution

### Race Condition Prevention

**Issue:** Concurrent score updates may cause cache/broadcast inconsistencies when checking if top 10 changed.

**Requirements:**
- Cache update and top 10 retrieval must be atomic
- Use Redis pipelining to batch operations without time gaps
- Compare leaderboard membership by user IDs, not just scores
- Detect changes before broadcasting to reduce unnecessary traffic

**Implementation notes:**
- Avoid separate "check then update" patterns
- Ensure idempotent broadcasts (safe to retry on network failures)
- Handle edge cases where multiple users tie at same score

---

## Data Flow

```
1. User completes action in browser
   ↓
2. Client: POST /api/action/complete
   Headers: Authorization: Bearer {jwt}
   Body: { actionId, data }
   ↓
3. Server validates JWT
   ↓
4. Check rate limit (10/min)
   ↓
5. Validate action (exists? already completed?)
   ↓
6. Server determines points for this action type
   ↓
7. Database: UPDATE users SET score = score + points
   ↓
8. Insert audit log
   ↓
9. Update Redis cache
   ↓
10. Check if top 10 changed
   ↓
11. If yes: Publish to Redis pub/sub
   ↓
12. WebSocket servers broadcast update
   ↓
13. All clients receive new leaderboard
```

---

## Database Schema

**users table**
- Primary key: UUID
- Username must be unique, max 50 characters
- Score defaults to 0, indexed in descending order for fast leaderboard queries
- Timestamps for creation and last update

**score_history table (audit log)**
- Links to user via foreign key
- Stores action ID and score change amount
- Unique constraint on (user_id, action_id) prevents duplicate completions
- Timestamp for audit trail

**actions table**
- Action ID as primary key (e.g., "quiz_001")
- Name and description for reference
- Points value (server authoritative, cannot be modified by client)

**Example action definitions:**
- Quiz completion: 10 points
- Level completion: 50 points  
- Daily login: 5 points

---

## Caching Strategy

### Redis Structure

**Leaderboard (Sorted Set)**
- Key: `leaderboard:top10`
- Stores top 10 users
- Updated on score change
- TTL: None (persistent)

**Rate Limiting (Counter)**
- Key: `ratelimit:{userId}`
- Increments per request
- TTL: 60 seconds

**Pub/Sub**
- Channel: `leaderboard:updates`
- Broadcasts when top 10 changes

### Cache Flow

```
GET /leaderboard
   ↓
Check Redis cache
   ↓
Hit? → Return (5ms)
   ↓
Miss? → Query DB → Cache → Return (50ms)
```

---

## Performance

### Targets
- **Read latency**: < 5ms (cached)
- **Update latency**: < 50ms
- **WebSocket broadcast**: < 100ms
- **Concurrent users**: 10,000+
- **Updates/second**: 100+

### Optimization
- Cache top 10 in Redis
- Only broadcast when top 10 actually changes (~5% of updates)
- Connection pooling for database
- Horizontal scaling for WebSocket servers

---

## High Availability

### Setup
- 2+ API servers (load balanced)
- PostgreSQL with 1 read replica
- Redis with persistence (AOF)
- Auto-scaling at CPU > 70%

### Backup
- Database: Daily backups (30-day retention)
- Redis: RDB snapshots every 6 hours

### Monitoring
- Response time (p95, p99)
- Error rate
- WebSocket connection count
- Database connection pool

---

## Deployment

### Environment Variables
- Database connection string
- Redis connection string  
- JWT signing secret (secure random key)
- Server port (default 3000)
- Rate limit threshold (default 10 requests/minute)

### Infrastructure
- 2 API/WebSocket servers
- 1 PostgreSQL primary + 1 replica
- 1 Redis instance
- Load balancer (NGINX)

---

## Future Enhancements

1. **Detailed Action Tracking**: Store which specific actions users completed
2. **Multiple Leaderboards**: Daily, weekly, all-time
3. **User Profiles**: View individual user history
4. **Admin Panel**: Manual score adjustments
5. **Analytics**: Track popular actions, engagement metrics

---

## Implementation Timeline

**Week 1-2**: Database, API, authentication  
**Week 3**: WebSocket real-time updates  
**Week 4**: Redis caching, optimization  
**Week 5-6**: Testing, deployment, monitoring

**Total**: 6 weeks with 2-3 engineers