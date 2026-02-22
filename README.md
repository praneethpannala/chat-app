# Zync 💬

A real-time chat application built with React, NestJS, Socket.IO, Firebase, MongoDB, Redis, and Kafka — deployed with Docker and NGINX load balancing.

---

## Tech Stack

**Frontend**
- React.js
- Tailwind CSS
- Socket.IO Client
- Firebase Authentication (Google Sign-In)
- Axios
- React Router DOM
- Lucide React (icons)
- Emoji Picker React

**Backend**
- NestJS (TypeScript)
- Socket.IO
- MongoDB + Mongoose
- Redis (online/offline status)
- Kafka (message streaming)
- Firebase Admin SDK (token verification)

**DevOps**
- Docker + Docker Compose
- NGINX (load balancer + HTTPS)
- GitHub Actions (CI/CD)
- SSL (self-signed certificates for local)

---

## Project Structure

```
chat-app/
├── frontend/               # React app
│   ├── src/
│   │   ├── components/     # Login, Chat, Sidebar, ChatWindow, InputBar, ChatHeader
│   │   ├── hooks/          # useSocket.js
│   │   ├── firebase/       # Firebase config
│   │   ├── tests/          # Jest test files
│   │   └── AuthContext.js  # Auth context provider
│   ├── nginx.conf          # Frontend NGINX config
│   └── Dockerfile
├── backend/                # NestJS app
│   ├── src/
│   │   ├── chat/           # Socket.IO gateway
│   │   ├── messages/       # Messages module
│   │   ├── users/          # Users module
│   │   ├── redis.service.ts
│   │   ├── kafka.service.ts
│   │   └── auth.guard.ts
│   └── Dockerfile
├── nginx/                  # Load balancer config
│   ├── nginx.conf
│   └── certs/              # SSL certificates
├── docker-compose.yml
└── .env                    # Root env for Docker Compose
```

---

## Prerequisites

- Node.js v18+
- npm v9+
- Docker Desktop
- Git
- OpenSSL (for SSL certificates)
- Firebase project with Google Sign-In enabled

---

## Environment Variables

Create the following `.env` files:

**`frontend/.env`**
```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
```

**`backend/.env`**
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/zync
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKER=localhost:9092
FIREBASE_PROJECT_ID=
```

**`chat-app/.env`** (for Docker Compose)
```
FIREBASE_PROJECT_ID=
```

---

## Setup & Installation

### Development Mode

**Step 1 — Clone the repository**
```bash
git clone <your-repo-url>
cd chat-app
```

**Step 2 — Generate SSL certificates**
```bash
cd nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "//CN=localhost"
cd ../..
```

**Step 3 — Start infrastructure (MongoDB, Redis, Kafka)**
```bash
docker-compose up -d mongodb redis zookeeper kafka
```

**Step 4 — Start backend**
```bash
cd backend
npm install
npm run start:dev
```

**Step 5 — Start frontend**
```bash
cd frontend
npm install
npm start
```

Access the app at `http://localhost:3000`

---

### Production Mode (Full Docker)

```bash
docker-compose up -d --build
```

Access the app at:
- `http://localhost:3000` (frontend)
- `https://localhost` (via NGINX load balancer)

---

## Docker Services

| Service | Image | Port |
|---|---|---|
| MongoDB | mongo:6 | 27017 |
| Redis | redis:alpine | 6379 |
| Zookeeper | confluentinc/cp-zookeeper:7.4.0 | 2181 |
| Kafka | confluentinc/cp-kafka:7.4.0 | 9092 |
| Backend 1 | custom | 3001 |
| Backend 2 | custom | 3002 |
| Backend 3 | custom | 3003 |
| Frontend | custom | 3000 |
| NGINX | nginx:alpine | 80, 443 |

---

## Load Balancing

NGINX distributes traffic across 3 backend instances using the `least_conn` algorithm — requests are routed to the backend with the fewest active connections.

```
User Request (HTTPS)
        ↓
NGINX (port 443)
        ↓
├── backend1:3001
├── backend2:3002
└── backend3:3003
```

---

## Running Tests

**Frontend (with coverage):**
```bash
cd frontend
npm test -- --watchAll=false --coverage
```

**Backend (with coverage):**
```bash
cd backend
npm run test -- --coverage
```

Both achieve **80%+ test coverage**.

---

## Features

- Google Sign-In with Firebase Authentication
- Real-time messaging with Socket.IO
- Message history stored in MongoDB
- Online/offline status tracking with Redis
- Message streaming with Kafka
- Message status indicators (sent ✓, delivered ✓✓, read ✓✓ in blue)
- Emoji picker
- Clear chat (for current user only)
- User search in sidebar
- Real user profiles with Google photos
- NGINX load balancing with HTTPS
- Docker containerization
- GitHub Actions CI/CD pipeline

---

## CI/CD

GitHub Actions automatically runs on every push to `main` or `dev`:
- Installs dependencies
- Builds backend (TypeScript compilation)
- Builds frontend (React production build)
- Runs Jest tests for both frontend and backend

---

## Startup Sequence (After System Restart)

1. Start Docker Desktop
2. Run `docker-compose up -d` (starts MongoDB, Redis, Kafka)
3. Run `cd backend && npm run start:dev`
4. Run `cd frontend && npm start`
