# unistay_boarding_discovery_platform

## Backend Node.js API

A Node.js + Express + TypeScript REST API for the UniStay Boarding Discovery Platform.

### Stack

- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: JWT (access + refresh tokens)
- **Validation**: Zod
- **Email**: Nodemailer (Gmail SMTP)
- **File Upload**: Multer + Cloudinary
- **Security**: Helmet + CORS + Rate Limiting

### Project Structure

```
backend-node/
├── prisma/
│   └── schema.prisma       # Prisma data model
├── src/
│   ├── config/             # Environment config & Prisma client
│   ├── controllers/        # Route handlers (auth, user, admin)
│   ├── middleware/         # Auth, error handler, upload, validate
│   ├── routes/             # Express routers
│   ├── utils/              # JWT, hashing, email, cloudinary helpers
│   ├── validators/         # Zod schemas
│   ├── app.ts              # Express app setup
│   └── index.ts            # Server entry point
├── .env.example
├── package.json
└── tsconfig.json
```

### API Endpoints

#### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login (rate limited: 5/min/IP) |
| POST | `/refresh` | Refresh access token (rotation) |
| POST | `/logout` | Revoke refresh token |
| GET  | `/verify-email?token=...` | Verify email address |
| POST | `/resend-verification` | Resend verification email |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with token |

#### User (`/api/v1/users`) — requires Bearer token
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/me` | Get current user profile |
| PUT  | `/me` | Update profile |
| PUT  | `/me/password` | Change password |
| PUT  | `/me/profile-image` | Upload profile image |

#### Admin (`/api/v1/admin`) — requires ADMIN role
| Method | Path | Description |
|--------|------|-------------|
| GET   | `/users` | List users (paginated, filterable) |
| GET   | `/users/:id` | Get user by ID |
| PATCH | `/users/:id/deactivate` | Deactivate user |
| PATCH | `/users/:id/activate` | Activate user |

### Setup

#### Prerequisites
- Node.js 18+
- PostgreSQL database

#### Installation

```bash
cd backend-node

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

#### Environment Variables

See [`.env.example`](./backend-node/.env.example) for all required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — JWT signing secrets
- `SMTP_USER` / `SMTP_PASS` — Gmail SMTP credentials (App Password)
- `CLOUDINARY_*` — Cloudinary credentials for image uploads

#### Running Tests

```bash
cd backend-node
npm test
```

### Response Format

**Success:**
```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Human readable message",
  "details": [...],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
