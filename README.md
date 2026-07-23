# EFE Taxi Dispatch System

A production-ready **Taxi Dispatch Management System** built for **R&T Group of Taxi**.

![Tech Stack](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat&logo=nuxt.js)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?style=flat&logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)

---

## 🚀 Features

- **JWT Authentication** with HttpOnly cookies (Admin, Dispatcher, HR roles)
- **Driver Management** — Full CRUD with photo upload and license expiry tracking
- **Taxi Fleet Management** — Status tracking (Available / On Trip / Maintenance)
- **Dispatch System** — Auto-generated dispatch numbers (`DSP-YYYYMMDD-0001`)
- **Dashboard** — Real-time stats with weekly trend charts
- **Audit Logging** — Every user action is logged with IP and browser
- **Notification System** — In-app notifications with unread badge
- **Role-Based Access Control** — Fine-grained permissions per role

---

## 📋 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Nuxt 4, Vue 3, TypeScript, Tailwind CSS v4, Nuxt UI v4 |
| State | Pinia, VueUse |
| Backend | Nuxt Nitro (Server API) |
| Database | MongoDB 7 with Mongoose |
| Auth | JWT + HttpOnly Cookies |
| Validation | Zod |
| Deployment | Docker, Nginx, PM2 |

---

## 🛠 Development Setup

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)

### 1. Install dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. Seed the database
```bash
npm run seed
```

### 4. Start development server
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 🔐 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Dispatcher | `dispatcher1` | `Dispatcher@123` |
| HR | `hr1` | `HR@123` |

> ⚠️ **Change all passwords before production deployment!**

---

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# Run database seed inside container
docker-compose exec app node server/seeds/seed.ts

# View logs
docker-compose logs -f app
```

---

## 📁 Project Structure

```
EFE/
├── app/                    # Nuxt frontend
│   ├── assets/css/         # Global styles + branding
│   ├── components/         # Reusable Vue components
│   ├── layouts/            # default.vue, auth.vue
│   ├── middleware/          # Auth + guest route guards
│   ├── pages/              # All application pages
│   └── stores/             # Pinia stores
├── server/                 # Nitro backend
│   ├── api/                # RESTful API routes
│   ├── middleware/          # Auth middleware
│   ├── models/             # Mongoose models
│   ├── repositories/       # Data access layer
│   ├── services/           # Business logic
│   ├── seeds/              # Database seeder
│   └── utils/              # Shared utilities
├── types/                  # TypeScript interfaces
├── public/                 # Static assets + uploads
├── nuxt.config.ts
├── Dockerfile
└── docker-compose.yml
```

---

## 📄 API Endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Auth |
| GET | `/api/auth/me` | Auth |
| GET/POST | `/api/drivers` | Auth |
| GET/PUT/DELETE | `/api/drivers/:id` | Auth |
| GET/POST | `/api/taxi-units` | Auth/Admin |
| PUT/DELETE | `/api/taxi-units/:id` | Admin |
| GET/POST | `/api/dispatches` | Auth |
| PUT | `/api/dispatches/:id` | Auth |
| GET | `/api/dashboard` | Auth |
| GET | `/api/notifications` | Auth |
| GET | `/api/audit-logs` | Admin |
| POST | `/api/uploads/drivers` | Auth |

---

## 🔑 Role Permissions

| Feature | Admin | Dispatcher | HR |
|---------|-------|------------|-----|
| Dashboard | ✅ | ✅ | ✅ |
| View Drivers | ✅ | ✅ | ✅ |
| Manage Drivers | ✅ | ❌ | ✅ |
| View Dispatches | ✅ | ✅ | ❌ |
| Create Dispatch | ✅ | ✅ | ❌ |
| Manage Taxi Fleet | ✅ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ |
| User Settings | ✅ | ❌ | ❌ |

---

## 📝 License

© 2024 R&T Group of Taxi. All rights reserved.
