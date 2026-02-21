#!/usr/bin/env bash
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  ╦ ╦╦╦  ╦╔═╗╔╦╗╔═╗╔═╗╦ ╦"
  echo "  ╠═╣║╚╗╔╝║╣  ║ ║╣ ║  ╠═╣"
  echo "  ╩ ╩╩ ╚╝ ╚═╝ ╩ ╚═╝╚═╝╩ ╩"
  echo -e "${NC}"
  echo -e "  ${BOLD}Project Management Tool — Installer${NC}"
  echo ""
}

info()    { echo -e "  ${CYAN}▸${NC} $1"; }
success() { echo -e "  ${GREEN}✓${NC} $1"; }
warn()    { echo -e "  ${YELLOW}!${NC} $1"; }
error()   { echo -e "  ${RED}✗${NC} $1"; exit 1; }
ask()     { echo -en "  ${CYAN}?${NC} $1: "; }

print_banner

# ── Pre-flight checks ──────────────────────────────────────────────
info "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  warn "Docker not found. Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  success "Docker installed"
else
  success "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+')"
fi

if ! docker compose version &>/dev/null; then
  error "Docker Compose V2 is required. Update Docker or install the compose plugin."
fi
success "Docker Compose $(docker compose version --short)"

# Check if running as root or in docker group
if [ "$(id -u)" -ne 0 ] && ! groups | grep -q docker; then
  error "Run as root or add your user to the docker group: sudo usermod -aG docker \$USER"
fi

echo ""

# ── Configuration ──────────────────────────────────────────────────
echo -e "  ${BOLD}Configuration${NC}"
echo ""

# Install directory
DEFAULT_DIR="/opt/hivetech"
ask "Install directory [${DEFAULT_DIR}]"
read -r INSTALL_DIR
INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_DIR}"

# Domain / URL
ask "Domain name (e.g. pm.example.com) or press Enter for localhost"
read -r DOMAIN
if [ -z "$DOMAIN" ]; then
  DOMAIN="localhost"
  PUBLIC_URL="http://localhost"
  USE_SSL=false
else
  PUBLIC_URL="https://${DOMAIN}"
  ask "Enable automatic SSL with Caddy? [Y/n]"
  read -r SSL_ANSWER
  if [[ "${SSL_ANSWER,,}" == "n" ]]; then
    USE_SSL=false
    PUBLIC_URL="http://${DOMAIN}"
  else
    USE_SSL=true
  fi
fi

# Port (only if no SSL / localhost)
if [ "$USE_SSL" = false ] && [ "$DOMAIN" = "localhost" ]; then
  ask "Host port [80]"
  read -r HOST_PORT
  HOST_PORT="${HOST_PORT:-80}"
  PUBLIC_URL="http://localhost$([ "$HOST_PORT" != "80" ] && echo ":${HOST_PORT}" || echo "")"
else
  HOST_PORT="80"
fi

# Database
ask "PostgreSQL username [hivetech]"
read -r PG_USER
PG_USER="${PG_USER:-hivetech}"

ask "PostgreSQL database name [hivetech]"
read -r PG_DB
PG_DB="${PG_DB:-hivetech}"

ask "PostgreSQL password (leave blank to auto-generate)"
read -rs PG_PASS
echo ""
if [ -z "$PG_PASS" ]; then
  PG_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  success "Generated database password"
fi

# JWT secrets
ask "Auto-generate JWT secrets? [Y/n]"
read -r JWT_ANSWER
if [[ "${JWT_ANSWER,,}" == "n" ]]; then
  ask "JWT access secret"
  read -rs JWT_ACCESS
  echo ""
  ask "JWT refresh secret"
  read -rs JWT_REFRESH
  echo ""
else
  JWT_ACCESS=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
  JWT_REFRESH=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
  success "Generated JWT secrets"
fi

# Seed data
ask "Seed database with sample data? [y/N]"
read -r SEED_ANSWER

echo ""

# ── Summary ────────────────────────────────────────────────────────
echo -e "  ${BOLD}Summary${NC}"
echo ""
info "Install directory:  ${INSTALL_DIR}"
info "Public URL:         ${PUBLIC_URL}"
info "SSL:                $([ "$USE_SSL" = true ] && echo "Yes (Caddy)" || echo "No")"
info "Database:           ${PG_USER}@postgres/${PG_DB}"
info "Seed data:          $(echo "${SEED_ANSWER,,}" | grep -q '^y' && echo "Yes" || echo "No")"
echo ""

ask "Proceed with installation? [Y/n]"
read -r CONFIRM
if [[ "${CONFIRM,,}" == "n" ]]; then
  echo ""
  info "Installation cancelled."
  exit 0
fi

echo ""

# ── Install ────────────────────────────────────────────────────────
info "Creating install directory..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# If the repo is already cloned, update it. Otherwise clone or copy it.
if [ -f "docker-compose.prod.yml" ]; then
  if [ -d ".git" ]; then
    info "Updating existing installation from GitHub..."
    git pull --quiet 2>/dev/null && success "Project files updated in ${INSTALL_DIR}" \
      || warn "Could not pull latest code — using existing files"
  else
    success "Project files found in ${INSTALL_DIR}"
  fi
else
  # Check if we're running from inside the project
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" 2>/dev/null)" 2>/dev/null && pwd 2>/dev/null || echo "")"
  if [ -n "$SCRIPT_DIR" ] && [ -f "${SCRIPT_DIR}/docker-compose.prod.yml" ]; then
    info "Copying project files..."
    cp -r "${SCRIPT_DIR}/"* "${INSTALL_DIR}/" 2>/dev/null || true
    cp -r "${SCRIPT_DIR}/".[!.]* "${INSTALL_DIR}/" 2>/dev/null || true
    success "Project files copied"
  else
    # Clone from GitHub
    if ! command -v git &>/dev/null; then
      info "Installing git..."
      apt-get update -qq && apt-get install -y -qq git >/dev/null 2>&1 || \
        yum install -y -q git >/dev/null 2>&1 || \
        apk add --quiet git >/dev/null 2>&1
      success "Git installed"
    fi
    info "Cloning HiveTech repository..."
    git clone --depth 1 https://github.com/BlueChummyy/hivetech-pm.git "${INSTALL_DIR}/repo_tmp" 2>/dev/null
    shopt -s dotglob 2>/dev/null || true
    mv "${INSTALL_DIR}/repo_tmp/"* "${INSTALL_DIR}/" 2>/dev/null || true
    shopt -u dotglob 2>/dev/null || true
    rm -rf "${INSTALL_DIR}/repo_tmp"
    success "Repository cloned"
  fi
fi

# ── Write .env ─────────────────────────────────────────────────────
info "Writing .env configuration..."
cat > .env <<ENVEOF
# ── Generated by HiveTech installer on $(date -Iseconds) ──

# PostgreSQL
POSTGRES_USER=${PG_USER}
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=${PG_DB}

# JWT
JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Public URL
PUBLIC_URL=${PUBLIC_URL}
CORS_ORIGIN=${PUBLIC_URL}

# Server
PORT=${HOST_PORT}
MAX_FILE_SIZE=10485760
ENVEOF

chmod 600 .env
success ".env file created (permissions: 600)"

# ── Caddy (optional SSL) ──────────────────────────────────────────
if [ "$USE_SSL" = true ]; then
  info "Configuring Caddy for automatic SSL..."

  cat > Caddyfile <<CADDYEOF
${DOMAIN} {
    reverse_proxy frontend:80
}
CADDYEOF

  # Patch docker-compose.prod.yml to remove frontend port and add Caddy
  # We'll create a docker-compose.override.yml instead to keep things clean
  cat > docker-compose.override.yml <<OVERRIDEEOF
version: '3.8'

services:
  frontend:
    ports: []

  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - '80:80'
      - '443:443'
      - '443:443/udp'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
    networks:
      - internal

volumes:
  caddy_data:
  caddy_config:
OVERRIDEEOF

  success "Caddy configured for ${DOMAIN}"
fi

# ── Build ──────────────────────────────────────────────────────────
echo ""
info "Building Docker images (this may take a few minutes)..."
docker compose -f docker-compose.prod.yml $([ "$USE_SSL" = true ] && echo "-f docker-compose.override.yml") build
success "Images built"

# ── Start ──────────────────────────────────────────────────────────
info "Starting services..."
docker compose -f docker-compose.prod.yml $([ "$USE_SSL" = true ] && echo "-f docker-compose.override.yml") up -d
success "Services started"

# ── Wait for healthy ───────────────────────────────────────────────
info "Waiting for PostgreSQL to be ready..."
RETRIES=30
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$PG_USER" -q 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    error "PostgreSQL did not become ready in time. Check logs: docker compose -f docker-compose.prod.yml logs postgres"
  fi
  sleep 2
done
success "PostgreSQL is ready"

# ── Migrations ─────────────────────────────────────────────────────
info "Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend \
  npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss 2>/dev/null
success "Database schema applied"

# ── Seed (optional) ───────────────────────────────────────────────
if echo "${SEED_ANSWER,,}" | grep -q '^y'; then
  info "Seeding database..."
  docker compose -f docker-compose.prod.yml exec -T backend \
    npx tsx src/prisma/seed.ts 2>/dev/null || warn "Seed script failed (may already be seeded)"
  success "Database seeded"
fi

# ── Verify ─────────────────────────────────────────────────────────
echo ""
info "Verifying installation..."
sleep 3

HEALTH_URL="http://localhost:${HOST_PORT}/health"
if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
  success "Health check passed"
else
  warn "Health check didn't respond yet — services may still be starting"
fi

# ── Done ───────────────────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}${BOLD}Installation complete!${NC}"
echo ""
echo -e "  ${BOLD}Access your app:${NC}  ${PUBLIC_URL}"
echo ""
echo -e "  ${BOLD}Useful commands:${NC}"
echo "    View logs:       cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml logs -f"
echo "    Stop:            cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml down"
echo "    Restart:         cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml up -d"
echo "    Update:          cd ${INSTALL_DIR} && git pull && docker compose -f docker-compose.prod.yml up --build -d"
echo "    DB backup:       cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ${PG_USER} -d ${PG_DB} -Fc > backup.dump"
echo ""
echo -e "  ${YELLOW}Config:${NC}  ${INSTALL_DIR}/.env"
echo -e "  ${YELLOW}Data:${NC}    Docker volumes (pgdata, uploads)"
echo ""
