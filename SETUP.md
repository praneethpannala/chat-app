# Zync — Setup Guide

---

## Prerequisites

Make sure you have the following installed:

| Tool | Version | Download |
|---|---|---|
| Node.js | v18+ | https://nodejs.org |
| npm | v9+ | Included with Node.js |
| Docker Desktop | Latest | https://docker.com |
| Git | Latest | https://git-scm.com |
| OpenSSL | Latest | https://slproweb.com/products/Win32OpenSSL.html |

---

## Step 1 — Clone the Repository

```bash
git clone <your-repo-url>
cd chat-app
```

---

## Step 2 — Configure Environment Variables

**`frontend/.env`**
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

**`backend/.env`**
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/zync
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKER=localhost:9092
FIREBASE_PROJECT_ID=your_project_id
```

**`chat-app/.env`** (root folder — for Docker Compose)
```
FIREBASE_PROJECT_ID=your_project_id
```

---

## Step 3 — Generate SSL Certificates

Open Git Bash and run:

```bash
cd chat-app/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "//CN=localhost"
```

You should see `cert.pem` and `key.pem` created in the `certs` folder.

---

## Option A — Run Locally (Development Mode)

Best for development — faster, no need to rebuild Docker images on every change.

### 1. Start infrastructure with Docker

```bash
cd chat-app
docker-compose up -d mongodb redis zookeeper kafka
```

Wait about 30 seconds for Kafka to fully start.

### 2. Install and start backend

```bash
cd backend
npm install
npm run start:dev
```

Backend runs at `http://localhost:3001`

### 3. Install and start frontend

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

### 4. Open the app

Go to `http://localhost:3000` in your browser and login with Google.

---

## Option B — Run with Docker (Production Mode)

Runs everything in Docker including NGINX load balancer and 3 backend instances.

### 1. Build and start all containers

```bash
cd chat-app
docker-compose up -d --build
```

First build takes 10-15 minutes. Subsequent builds are faster.

### 2. Verify all containers are running

```bash
docker ps
```

You should see all 9 containers:

```
zync-nginx
zync-frontend
zync-backend1
zync-backend2
zync-backend3
zync-kafka
zync-redis
zync-mongodb
zync-zookeeper
```

### 3. Open the app

- Frontend: `http://localhost:3000`
- HTTPS via NGINX: `https://localhost`

> Note: You'll see a browser security warning for the self-signed SSL certificate.
> Click **Advanced** → **Proceed to localhost** to continue.

---

## Stopping the App

**Stop Docker containers:**
```bash
docker-compose down
```

**Stop local backend/frontend:**

Press `Ctrl + C` in each terminal window.

---

## Restarting After System Reboot

### Development Mode:
```bash
# Step 1 - Start Docker infrastructure
docker-compose up -d mongodb redis zookeeper kafka

# Step 2 - Start backend (new terminal)
cd backend && npm run start:dev

# Step 3 - Start frontend (new terminal)
cd frontend && npm start
```

### Production Mode:
```bash
docker-compose up -d
```

---

## Running Tests

**Frontend tests with coverage:**
```bash
cd frontend
npm test -- --watchAll=false --coverage
```

**Backend tests with coverage:**
```bash
cd backend
npm run test -- --coverage
```

**Run specific test file:**
```bash
npm test -- --watchAll=false --testPathPattern=Login
```

---

## Checking Logs

```bash
# All containers
docker-compose logs -f

# Specific container
docker logs zync-backend1
docker logs zync-frontend
docker logs zync-nginx
docker logs zync-kafka
```

---

## Troubleshooting

**Kafka connection error:**
```bash
# Wait 30 seconds after starting, then restart backends
docker-compose restart backend1 backend2 backend3
```

**MongoDB version error:**
```bash
# Delete old volume and restart
docker-compose down
docker volume rm chat-app_mongodb_data
docker-compose up -d
```

**Frontend showing old config:**
```bash
# Force rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d
```

**Port already in use:**
```bash
# Stop all containers and try again
docker-compose down
docker-compose up -d
```

**SSL certificate not found:**
```bash
# Regenerate certificates
cd nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "//CN=localhost"
```
