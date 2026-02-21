# HiveTech PM — Docker Deployment Guide

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start (Development)](#quick-start-development)
- [Production Deployment](#production-deployment)
- [Configuration Reference](#configuration-reference)
- [Database Management](#database-management)
- [SSL/TLS with Reverse Proxy](#ssltls-with-reverse-proxy)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Backup & Restore](#backup--restore)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)

---

## Overview

HiveTech PM runs as three Docker containers:

| Service      | Image              | Port | Purpose                          |
| ------------ | ------------------ | ---- | -------------------------------- |
| **postgres** | `postgres:16`      | 5432 | PostgreSQL database              |
| **backend**  | Node 20 (custom)   | 3000 | Express API + Socket.io          |
| **frontend** | Nginx (custom)     | 80   | Static SPA + reverse proxy       |

In production, Nginx serves the React build and proxies `/api/` and `/socket.io/` to the backend. Only the frontend container exposes a port to the host.

## Architecture

```
                    ┌─────────────────────────────┐
                    │        Host / Internet       │
                    └──────────────┬───────────────┘
                                   │ :80 (or :443 via reverse proxy)
                    ┌──────────────▼───────────────┐
                    │   frontend (Nginx)            │
                    │   - Serves React SPA          │
                    │   - Proxies /api → backend    │
                    │   - Proxies /socket.io →      │
                    │     backend (WebSocket)        │
                    └──────────────┬───────────────┘
                                   │ internal network
                    ┌──────────────▼───────────────┐
                    │   backend (Node.js)           │
                    │   - Express 5 REST API        │
                    │   - Socket.io real-time       │
                    │   - Prisma ORM                │
                    └──────────────┬───────────────┘
                                   │ internal network
                    ┌──────────────▼───────────────┐
                    │   postgres (PostgreSQL 16)    │
                    │   - Data persisted in volume  │
                    └──────────────────────────────┘
```

---

## Prerequisites

- **Docker** >= 24.0
- **Docker Compose** >= 2.20 (V2, bundled with Docker Desktop)
- **Git** (to clone the repository)
- **2 GB RAM** minimum (4 GB recommended)
- **10 GB disk** minimum

Verify installation:

```bash
docker --version        # Docker version 24.x+
docker compose version  # Docker Compose version v2.x+
```

---

## Quick Start (Development)

Development mode uses hot-reload with source bind mounts.

```bash
# 1. Clone and enter project
git clone <repo-url> hivetech && cd hivetech

# 2. Start all services
docker compose up --build

# 3. In a second terminal, run database migrations
docker compose exec backend npx prisma db push --schema=src/prisma/schema.prisma

# 4. (Optional) Seed the database
docker compose exec backend npx tsx src/prisma/seed.ts
```

Services will be available at:

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:3000        |
| Health   | http://localhost:3000/health |

To stop:

```bash
docker compose down          # Stop containers (data preserved)
docker compose down -v       # Stop and delete volumes (fresh start)
```

---

## Production Deployment

### Step 1: Configure Environment

```bash
# Copy the example and fill in real values
cp .env.production.example .env
```

Edit `.env` with secure values:

```bash
# REQUIRED — generate strong random values
POSTGRES_PASSWORD=<openssl rand -base64 32>
JWT_ACCESS_SECRET=<openssl rand -base64 64>
JWT_REFRESH_SECRET=<openssl rand -base64 64>

# REQUIRED — your actual domain
PUBLIC_URL=https://pm.example.com
CORS_ORIGIN=https://pm.example.com

# Optional overrides
PORT=80
POSTGRES_USER=hivetech
POSTGRES_DB=hivetech
```

Generate secrets from the command line:

```bash
openssl rand -base64 32    # For POSTGRES_PASSWORD
openssl rand -base64 64    # For JWT secrets
```

### Step 2: Build and Start

```bash
# Build production images and start
docker compose -f docker-compose.prod.yml up --build -d
```

This will:
1. Build the backend with multi-stage Dockerfile (compile TS → slim Node image)
2. Build the frontend with Vite → serve with Nginx
3. Start PostgreSQL with health checks
4. Start the backend after PostgreSQL is healthy
5. Start the frontend after backend is ready

### Step 3: Run Database Migrations

```bash
# Push schema to database (first deploy)
docker compose -f docker-compose.prod.yml --profile migrate up migrate

# Or exec into running backend
docker compose -f docker-compose.prod.yml exec backend \
  npx prisma db push --schema=src/prisma/schema.prisma
```

### Step 4: (Optional) Seed Initial Data

```bash
docker compose -f docker-compose.prod.yml exec backend \
  npx tsx src/prisma/seed.ts
```

### Step 5: Verify

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check health endpoint
curl http://localhost/health

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

The application is now accessible at `http://localhost` (or your configured `PUBLIC_URL`).

---

## Configuration Reference

### Environment Variables

| Variable               | Required | Default                    | Description                          |
| ---------------------- | -------- | -------------------------- | ------------------------------------ |
| `POSTGRES_USER`        | No       | `hivetech`                 | PostgreSQL username                  |
| `POSTGRES_PASSWORD`    | **Yes**  | —                          | PostgreSQL password                  |
| `POSTGRES_DB`          | No       | `hivetech`                 | PostgreSQL database name             |
| `JWT_ACCESS_SECRET`    | **Yes**  | —                          | Secret for signing access tokens     |
| `JWT_REFRESH_SECRET`   | **Yes**  | —                          | Secret for signing refresh tokens    |
| `JWT_ACCESS_EXPIRES_IN`| No       | `15m`                      | Access token lifetime                |
| `JWT_REFRESH_EXPIRES_IN`| No      | `7d`                       | Refresh token lifetime               |
| `PUBLIC_URL`           | No       | `http://localhost`         | Public-facing URL of the app         |
| `CORS_ORIGIN`          | No       | `http://localhost`         | Allowed CORS origin                  |
| `PORT`                 | No       | `80`                       | Host port for frontend Nginx         |
| `MAX_FILE_SIZE`        | No       | `10485760` (10 MB)         | Max upload file size in bytes        |

### Docker Compose Files

| File                      | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `docker-compose.yml`      | Development (hot reload, source mounts)    |
| `docker-compose.prod.yml` | Production (optimized builds, Nginx proxy) |

### Dockerfiles

| File                       | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `backend/Dockerfile`       | Development (tsx watch mode)                  |
| `backend/Dockerfile.prod`  | Production (multi-stage: build TS → slim run) |
| `frontend/Dockerfile`      | Development (Vite dev server)                 |
| `frontend/Dockerfile.prod` | Production (multi-stage: Vite build → Nginx)  |

---

## Database Management

### Run Migrations

```bash
# Development
docker compose exec backend npx prisma db push --schema=src/prisma/schema.prisma

# Production
docker compose -f docker-compose.prod.yml exec backend \
  npx prisma db push --schema=src/prisma/schema.prisma

# Using the migrate profile (creates a one-off container)
docker compose -f docker-compose.prod.yml --profile migrate up migrate
```

### Open Prisma Studio (Development Only)

```bash
docker compose exec backend npx prisma studio --schema=src/prisma/schema.prisma
```

Prisma Studio will be available at http://localhost:5555.

### Connect to PostgreSQL Directly

```bash
# Development
docker compose exec postgres psql -U postgres -d hivetech

# Production
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U ${POSTGRES_USER:-hivetech} -d ${POSTGRES_DB:-hivetech}
```

### Reset Database (Development)

```bash
docker compose down -v                   # Remove volumes
docker compose up -d postgres            # Restart PostgreSQL
docker compose exec backend npx prisma db push --schema=src/prisma/schema.prisma
docker compose exec backend npx tsx src/prisma/seed.ts
```

---

## SSL/TLS with Reverse Proxy

For production, place a reverse proxy in front of the frontend container for SSL termination. Two common options:

### Option A: Caddy (Recommended — Automatic HTTPS)

Create `Caddyfile`:

```
pm.example.com {
    reverse_proxy frontend:80
}
```

Add to `docker-compose.prod.yml`:

```yaml
  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
    networks:
      - internal
```

Remove the `ports` mapping from the `frontend` service (Caddy handles external traffic).

### Option B: Nginx + Let's Encrypt (Certbot)

```bash
# Install certbot and generate certificates
certbot certonly --standalone -d pm.example.com

# Mount certs into the frontend container or use a separate Nginx proxy
```

### Option C: Cloud Load Balancer

If deploying on AWS, GCP, or Azure, use their managed load balancer for SSL termination and point it at the frontend container's port.

---

## Monitoring & Health Checks

### Built-in Health Checks

All three services have health checks configured:

```bash
# Check overall status
docker compose -f docker-compose.prod.yml ps

# Backend health endpoint
curl -s http://localhost/health | jq
# Returns: { "success": true, "data": { "status": "ok", "timestamp": "..." } }
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f postgres

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100 backend
```

### Resource Usage

```bash
docker stats
```

---

## Backup & Restore

### Database Backup

```bash
# Create a compressed backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U ${POSTGRES_USER:-hivetech} -d ${POSTGRES_DB:-hivetech} -Fc \
  > backup_$(date +%Y%m%d_%H%M%S).dump

# Plain SQL backup (human-readable)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U ${POSTGRES_USER:-hivetech} -d ${POSTGRES_DB:-hivetech} \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore

```bash
# Restore from compressed backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U ${POSTGRES_USER:-hivetech} -d ${POSTGRES_DB:-hivetech} --clean \
  < backup_20260221_120000.dump

# Restore from SQL
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U ${POSTGRES_USER:-hivetech} -d ${POSTGRES_DB:-hivetech} \
  < backup_20260221_120000.sql
```

### File Uploads Backup

```bash
# Backup the uploads volume
docker run --rm \
  -v hivetech_uploads:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .

# Restore
docker run --rm \
  -v hivetech_uploads:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/uploads_20260221.tar.gz -C /data
```

### Automated Backups (Cron)

```bash
# Add to crontab -e (daily at 2 AM)
0 2 * * * cd /path/to/hivetech && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U hivetech -d hivetech -Fc > /backups/hivetech_$(date +\%Y\%m\%d).dump
```

---

## Scaling

### Horizontal Scaling (Backend)

The backend is stateless (JWT auth, no session affinity required) except for Socket.io which uses in-memory rooms. For multi-instance Socket.io, add Redis as a pub/sub adapter:

```yaml
  redis:
    image: redis:7-alpine
    restart: always
    networks:
      - internal

  backend:
    # ... existing config
    environment:
      REDIS_URL: redis://redis:6379
    deploy:
      replicas: 3
```

Then configure `@socket.io/redis-adapter` in the backend code.

### Vertical Scaling

Add resource limits to `docker-compose.prod.yml`:

```yaml
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs for the failing container
docker compose -f docker-compose.prod.yml logs backend

# Common: DATABASE_URL not set
# Fix: Ensure .env file exists and is loaded

# Common: Port already in use
# Fix: Change PORT in .env or stop the conflicting process
```

### Backend can't connect to PostgreSQL

```bash
# Verify PostgreSQL is healthy
docker compose -f docker-compose.prod.yml ps postgres

# Test connection from backend container
docker compose -f docker-compose.prod.yml exec backend \
  sh -c 'wget -qO- postgres:5432 || echo "Connection refused"'

# Check DATABASE_URL format
# Must use 'postgres' as hostname (Docker service name), not 'localhost'
```

### Frontend shows blank page

```bash
# Check Nginx logs
docker compose -f docker-compose.prod.yml logs frontend

# Verify build succeeded
docker compose -f docker-compose.prod.yml exec frontend ls /usr/share/nginx/html

# Common: VITE_API_URL not set at build time
# Fix: Rebuild with correct build args
docker compose -f docker-compose.prod.yml build --no-cache frontend
```

### WebSocket connection fails

```bash
# Verify Socket.io is accessible through Nginx
curl -s 'http://localhost/socket.io/?EIO=4&transport=polling'

# Common: Nginx not proxying WebSocket upgrade headers
# Fix: Ensure nginx.conf has proxy_set_header Upgrade and Connection
```

### Database migrations fail

```bash
# Check if schema has breaking changes
docker compose -f docker-compose.prod.yml exec backend \
  npx prisma db push --schema=src/prisma/schema.prisma --dry-run

# Force push (CAUTION: may drop data)
docker compose -f docker-compose.prod.yml exec backend \
  npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss
```

### Reset everything

```bash
docker compose -f docker-compose.prod.yml down -v --rmi local
docker compose -f docker-compose.prod.yml up --build -d
```

---

## Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime with health checks)
docker compose -f docker-compose.prod.yml up --build -d

# Run migrations if schema changed
docker compose -f docker-compose.prod.yml exec backend \
  npx prisma db push --schema=src/prisma/schema.prisma
```

For zero-downtime deployments, consider using Docker Swarm or Kubernetes with rolling updates.
