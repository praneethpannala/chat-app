# Zync — Complete Setup Guide

This guide will help you run the Zync chat application on your local machine from scratch.
Read every step carefully — do not skip any step.

---

## Table of Contents

1. [What You Need to Install](#1-what-you-need-to-install)
2. [Firebase Setup](#2-firebase-setup)
3. [Clone the Repository](#3-clone-the-repository)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Generate SSL Certificates](#5-generate-ssl-certificates)
6. [Running the App — Development Mode](#6-running-the-app--development-mode)
7. [Running the App — Production Mode (Docker)](#7-running-the-app--production-mode-docker)
8. [Restarting After System Reboot](#8-restarting-after-system-reboot)
9. [How to Stop the App](#9-how-to-stop-the-app)
10. [Running Tests](#10-running-tests)
11. [Checking Logs](#11-checking-logs)
12. [Troubleshooting — Common Errors and Fixes](#12-troubleshooting--common-errors-and-fixes)

---

## 1. What You Need to Install

Install all of the following tools before doing anything else.

---

### Node.js (v18 or higher)

1. Go to https://nodejs.org
2. Download the **LTS** version
3. Run the installer — click Next on everything
4. Verify installation by opening PowerShell and running:
```bash
node --version
npm --version
```
You should see version numbers like `v18.x.x` and `10.x.x`

---

### Git

1. Go to https://git-scm.com
2. Download and install for Windows
3. During install — select **"Git Bash"** option when asked
4. Verify installation:
```bash
git --version
```

---

### Docker Desktop

1. Go to https://www.docker.com/products/docker-desktop
2. Download Docker Desktop for Windows
3. Run the installer
4. Restart your computer after installation
5. Open Docker Desktop — wait for it to fully start (whale icon appears in taskbar)
6. Verify installation:
```bash
docker --version
docker compose version
```

> Important: Docker Desktop must be running every time you use Zync.
> Always open Docker Desktop first before running any commands.

---

### OpenSSL (for SSL certificates)

1. Go to https://slproweb.com/products/Win32OpenSSL.html
2. Download **Win64 OpenSSL v3.x.x** (full version, not Light)
3. Run the installer
4. When asked where to copy DLLs → select **"The Windows system directory"**
5. After install, add OpenSSL to PATH:
   - Press Windows key → search **"Environment Variables"**
   - Click **"Edit the system environment variables"**
   - Click **"Environment Variables"**
   - Under **System Variables** find **Path** → click **Edit**
   - Click **New** → add: `C:\Program Files\OpenSSL-Win64\bin`
   - Click OK on everything
6. Close and reopen PowerShell
7. Verify installation:
```bash
openssl version
```

> If openssl still not found, use Git Bash instead of PowerShell for certificate commands.

---

## 2. Firebase Setup

Zync uses Firebase for Google login. You need to create your own Firebase project.

### Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Enter project name: `zync` (or any name you like)
4. Disable Google Analytics (not needed)
5. Click **"Create project"**

### Enable Google Sign-In

1. In Firebase console → click **"Authentication"** in left sidebar
2. Click **"Get started"**
3. Click **"Google"** under Sign-in providers
4. Toggle **Enable** to ON
5. Enter your email as support email
6. Click **"Save"**

### Get Firebase Config Keys

1. In Firebase console → click the gear icon ⚙️ → **"Project settings"**
2. Scroll down to **"Your apps"**
3. Click **"<\/>"** (Web app) icon
4. Enter app nickname: `zync-web`
5. Click **"Register app"**
6. You will see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "zync-xxxxx.firebaseapp.com",
  projectId: "zync-xxxxx",
  storageBucket: "zync-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

7. **Copy and save these values** — you will need them in the next step.

### Add Authorized Domain

1. In Firebase console → **Authentication** → **Settings** tab
2. Scroll to **Authorized domains**
3. Make sure `localhost` is in the list (it should be by default)

---

## 3. Clone the Repository

Open PowerShell or Git Bash and run:

```bash
git clone <your-repo-url>
cd chat-app
```

Replace `<your-repo-url>` with the actual GitHub repository URL.

---

## 4. Configure Environment Variables

You need to create 3 separate `.env` files. These files store your secret keys and configuration.

> Never share these files with anyone or push them to GitHub.

---

### Frontend Environment File

1. Go to `chat-app/frontend/` folder
2. Create a new file called `.env`
3. Paste the following and fill in your Firebase values from Step 2:

```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

Example:
```
REACT_APP_FIREBASE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_FIREBASE_AUTH_DOMAIN=zync-12345.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=zync-12345
REACT_APP_FIREBASE_STORAGE_BUCKET=zync-12345.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

---

### Backend Environment File

1. Go to `chat-app/backend/` folder
2. Create a new file called `.env`
3. Paste the following exactly as shown:

```
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/zync
REDIS_HOST=redis
REDIS_PORT=6379
KAFKA_BROKER=kafka:9092
FIREBASE_PROJECT_ID=your_project_id
```

Replace `your_project_id` with your Firebase Project ID from Step 2.

> Note: For Development Mode (running backend locally), change the values to:
> ```
> PORT=3001
> MONGODB_URI=mongodb://localhost:27017/zync
> REDIS_HOST=localhost
> REDIS_PORT=6379
> KAFKA_BROKER=localhost:9092
> FIREBASE_PROJECT_ID=your_project_id
> ```

---

### Root Environment File

1. Go to `chat-app/` root folder
2. Create a new file called `.env`
3. Paste the following:

```
FIREBASE_PROJECT_ID=your_project_id
```

Replace `your_project_id` with your Firebase Project ID.

---

## 5. Generate SSL Certificates

SSL certificates are needed for HTTPS to work. You only need to do this once.

Open **Git Bash** (not PowerShell) and run:

```bash
cd chat-app/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "//CN=localhost"
```

You should see two new files created:
- `cert.pem`
- `key.pem`

> If you see an error about the subject format, make sure you're using Git Bash and not PowerShell.

---

## 6. Running the App — Development Mode

Use this mode for day-to-day development. It's faster because you run the backend directly on your machine instead of Docker.

### Prerequisites
- Docker Desktop must be open and running
- You must complete Steps 1-5 first

---

### Step 1 — Start Docker Desktop

Open Docker Desktop and wait until the whale icon appears in the taskbar and shows "Docker Desktop is running".

---

### Step 2 — Start Infrastructure Containers

Open PowerShell in the `chat-app` folder and run:

```bash
docker compose up -d mongodb redis zookeeper kafka
```

This starts MongoDB, Redis, Zookeeper and Kafka in the background.

Wait **30-60 seconds** for Kafka to fully initialize before moving to the next step.

Verify they are running:
```bash
docker compose ps
```

You should see these 4 containers with status `Up`:
```
zync-mongodb
zync-redis
zync-zookeeper
zync-kafka
```

---

### Step 3 — Make Sure Docker Backends Are Stopped

If backend1, backend2, backend3 are running in Docker, stop them:

```bash
docker compose stop backend1 backend2 backend3
```

This prevents port conflicts with the locally running backend.

---

### Step 4 — Start Backend Locally

Open a **new** PowerShell window and run:

```bash
cd chat-app/backend
npm install
npm run start:dev
```

Wait until you see:
```
Nest application successfully started
MongoDB connected
Redis connected
```

> If you see `EADDRINUSE: address already in use :::3001` it means Docker backend is still running.
> Go back and run: `docker compose stop backend1 backend2 backend3`

---

### Step 5 — Start Frontend Locally

Open another **new** PowerShell window and run:

```bash
cd chat-app/frontend
npm install
npm start
```

Wait until you see:
```
Compiled successfully!
Local: http://localhost:3000
```

Your browser should automatically open `http://localhost:3000`.

---

### Step 6 — Login

1. Click **"Sign in with Google"**
2. Select your Google account
3. You are now logged in!

> First time login saves your profile to MongoDB.
> Other users will be able to see you once they also login.

---

## 7. Running the App — Production Mode (Docker)

Use this mode to run everything in Docker including 3 backend instances with NGINX load balancing.

### Prerequisites
- Docker Desktop must be open and running
- You must complete Steps 1-5 first
- Backend .env should use service names (mongodb, redis, kafka) not localhost

---

### Step 1 — Start Docker Desktop

Open Docker Desktop and wait until it is fully running.

---

### Step 2 — Build and Start All Containers

Open PowerShell in the `chat-app` folder and run:

```bash
docker compose up -d --build
```

> First time build takes 10-15 minutes — this is normal.
> Subsequent builds take 2-3 minutes as Docker caches layers.

---

### Step 3 — Verify All Containers Are Running

```bash
docker compose ps
```

You should see all 9 containers with status `Up`:

```
zync-nginx       → load balancer (ports 80, 443)
zync-frontend    → React app (port 3000)
zync-backend1    → NestJS instance 1 (port 3001)
zync-backend2    → NestJS instance 2 (port 3002)
zync-backend3    → NestJS instance 3 (port 3003)
zync-kafka       → message streaming (port 9092)
zync-redis       → online status (port 6379)
zync-mongodb     → database (port 27017)
zync-zookeeper   → kafka dependency (port 2181)
```

---

### Step 4 — If Backends Are Missing

Sometimes backends fail to start because Kafka isn't ready yet. Start them manually:

```bash
docker compose up -d backend1 backend2 backend3
```

Wait 30 seconds then check again:
```bash
docker compose ps
```

---

### Step 5 — Open the App

- **Frontend:** `http://localhost:3000`
- **HTTPS via NGINX:** `https://localhost`

> When opening `https://localhost` you will see a security warning because we use a self-signed certificate.
> This is expected for local development.
> Click **Advanced** → **Proceed to localhost (unsafe)** to continue.

---

## 8. Restarting After System Reboot

Every time you restart your computer you need to start everything again.

### Development Mode

```bash
# Step 1 — Open Docker Desktop and wait for it to start

# Step 2 — Start infrastructure (in chat-app folder)
docker compose up -d mongodb redis zookeeper kafka

# Step 3 — Wait 30-60 seconds for Kafka to start

# Step 4 — Stop Docker backends if running
docker compose stop backend1 backend2 backend3

# Step 5 — Start backend (new terminal)
cd chat-app/backend
npm run start:dev

# Step 6 — Start frontend (new terminal)
cd chat-app/frontend
npm start
```

### Production Mode

```bash
# Step 1 — Open Docker Desktop and wait for it to start

# Step 2 — Start all containers (in chat-app folder)
docker compose up -d

# Step 3 — Wait 1-2 minutes for everything to initialize

# Step 4 — If backends are missing
docker compose up -d backend1 backend2 backend3
```

---

## 9. How to Stop the App

### Stop everything in Docker:
```bash
docker compose down
```

### Stop only backends (to switch to dev mode):
```bash
docker compose stop backend1 backend2 backend3
```

### Stop local backend or frontend:
Press `Ctrl + C` in the terminal window where it is running.

---

## 10. Running Tests

### Frontend Tests

```bash
cd chat-app/frontend
npm test -- --watchAll=false --coverage
```

### Backend Tests

```bash
cd chat-app/backend
npm run test -- --coverage
```

### Run a Specific Test File

```bash
npm test -- --watchAll=false --testPathPattern=Login
npm test -- --watchAll=false --testPathPattern=Chat
npm test -- --watchAll=false --testPathPattern=Sidebar
```

Both frontend and backend maintain **80%+ test coverage**.

---

## 11. Checking Logs

Logs help you understand what is happening inside each container.

```bash
# See logs of all containers live
docker compose logs -f

# See logs of specific containers
docker logs zync-backend1
docker logs zync-backend2
docker logs zync-backend3
docker logs zync-frontend
docker logs zync-nginx
docker logs zync-kafka
docker logs zync-mongodb

# See last 50 lines only
docker logs zync-backend1 --tail 50

# See live logs of one container
docker logs -f zync-backend1
```

---

## 12. Troubleshooting — Common Errors and Fixes

---

### Error: Port 3001 already in use

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Cause:** Docker backend1 is running on port 3001 and you also tried to run `npm run start:dev`.

**Fix:**
```bash
docker compose stop backend1 backend2 backend3
cd backend
npm run start:dev
```

---

### Error: Socket connection error

```
Socket connection error: Error: server error
```

**Cause:** No backend is running.

**Fix — Option A (Docker):**
```bash
docker compose up -d backend1 backend2 backend3
```

**Fix — Option B (Local):**
```bash
cd backend
npm run start:dev
```

---

### Error: Kafka connection refused

```
KafkaJSConnectionError: Connection error: connect ECONNREFUSED
```

**Cause:** Kafka is not ready yet or not running.

**Fix:**
```bash
# Wait 60 seconds then restart backends
docker compose restart backend1 backend2 backend3
```

---

### Error: MongoDB version incompatible

```
Invalid featureCompatibilityVersion document
```

**Cause:** You changed MongoDB version and old data is incompatible.

**Fix:**
```bash
docker compose down
docker volume rm chat-app_mongodb_data
docker compose up -d
```

> Warning: This deletes all your data including users and messages.

---

### Error: SSL certificate not found

```
cannot load certificate "/etc/nginx/certs/cert.pem"
```

**Cause:** SSL certificates are missing or not mounted correctly.

**Fix:** Open Git Bash and run:
```bash
cd chat-app/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "//CN=localhost"
docker compose restart nginx
```

---

### Error: Frontend showing old nginx config

```
host not found in upstream "backend"
```

**Cause:** Docker is using a cached old version of the frontend image.

**Fix:**
```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

---

### Error: Cannot find module

```
Cannot find module 'react-router-dom'
```

**Cause:** Dependencies are not installed.

**Fix:**
```bash
cd frontend
npm install

cd backend
npm install
```

---

### Error: openssl not recognized

```
openssl: The term 'openssl' is not recognized
```

**Cause:** OpenSSL is not in your PATH or not installed.

**Fix — Use Git Bash instead of PowerShell:**
```bash
# Open Git Bash (not PowerShell)
cd chat-app/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "//CN=localhost"
```

---

### Problem: Users not showing in sidebar

**Cause 1:** Backend is not running.
```bash
# Start backend
docker compose up -d backend1 backend2 backend3
# OR
cd backend && npm run start:dev
```

**Cause 2:** You logged in before the users module was built so your profile was never saved.
```
Fix: Logout → Login again
This saves your profile to MongoDB
```

**Cause 3:** You are the only user who has logged in.
```
Fix: Open incognito window → login with a different Google account
Both users will now see each other in the sidebar
```

---

### Problem: Messages not sending or receiving

**Cause:** Socket.IO cannot connect to backend.

**Fix:**
1. Check backend is running (see Socket connection error above)
2. Open browser console (F12) → check for red errors
3. Refresh the page after backend is confirmed running

---

### Problem: Docker containers keep restarting

**Cause:** A dependency service is not ready yet.

**Fix:**
```bash
docker compose down
docker compose up -d mongodb redis zookeeper
# Wait 30 seconds
docker compose up -d kafka
# Wait 30 seconds
docker compose up -d backend1 backend2 backend3 frontend nginx
```

---

### Problem: Docker Desktop not starting

**Fix:**
1. Restart your computer
2. Open Docker Desktop as Administrator (right click → Run as administrator)
3. Wait 2-3 minutes for it to fully start

---

### Problem: GitHub Actions pipeline failing

**Cause:** Test files have errors or build is failing.

**Fix — Check pipeline logs:**
1. Go to your GitHub repository
2. Click **Actions** tab
3. Click the failed run
4. Click the failed job
5. Read the error and fix it locally first

**Run tests locally before pushing:**
```bash
cd frontend && npm test -- --watchAll=false
cd backend && npm run test
```

---

## Quick Reference

| Action | Command |
|---|---|
| Start infrastructure | `docker compose up -d mongodb redis zookeeper kafka` |
| Start all Docker | `docker compose up -d` |
| Start backends only | `docker compose up -d backend1 backend2 backend3` |
| Stop all Docker | `docker compose down` |
| Stop backends only | `docker compose stop backend1 backend2 backend3` |
| Check containers | `docker compose ps` |
| See logs | `docker logs zync-backend1` |
| Start backend locally | `cd backend && npm run start:dev` |
| Start frontend locally | `cd frontend && npm start` |
| Run frontend tests | `cd frontend && npm test -- --watchAll=false --coverage` |
| Run backend tests | `cd backend && npm run test -- --coverage` |
| Rebuild Docker images | `docker compose up -d --build` |
| Force rebuild one service | `docker compose build --no-cache frontend` |
