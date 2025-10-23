# Problem 5 - CRUD API

REST API built with Express, TypeScript, and SQLite.

## Setup

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

Server starts at `http://localhost:3000`

### Build for production
```bash
npm run build
npm start
```

## API Endpoints

### Create Resource
```
POST /api/resources
Body: { "name": "Resource Name", "description": "Optional", "status": "active" }
```

### List Resources
```
GET /api/resources?status=active&name=search&page=1&limit=10
```

### Get Resource by ID
```
GET /api/resources/:id
```

### Update Resource
```
PUT /api/resources/:id
Body: { "name": "Updated", "description": "New desc", "status": "inactive" }
```

### Delete Resource
```
DELETE /api/resources/:id
```

## Architecture

```
src/
├── app.ts                    # Express setup
├── server.ts                 # Entry point
├── database/
│   └── db.ts                # SQLite connection
├── models/
│   └── Resource.ts          # Data access layer
├── services/
│   └── resourceService.ts   # Business logic
├── controllers/
│   └── resourceController.ts # Request handlers
├── dtos/
│   └── resource.dto.ts      # Input validation
├── errors/
│   └── AppError.ts          # Custom errors
├── middleware/
│   └── errorHandler.ts      # Error handling
├── routes/
│   └── resourceRoutes.ts    # API routes
└── types/
    └── index.ts             # TypeScript interfaces
```

**Key features:**
- DTO validation for input
- Service layer for business logic
- Custom error handling
- Proper TypeScript typing
- Pagination with max limit (100)
- SQLite auto-initialization

