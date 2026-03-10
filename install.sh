#!/bin/bash
#
# ServerKit Quick Install Script for Ubuntu/Debian/Fedora
#

set -e

cd /tmp 2>/dev/null || cd / || true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="/opt/serverkit"
VENV_DIR="$INSTALL_DIR/venv"
LOG_DIR="/var/log/serverkit"
DATA_DIR="/var/lib/serverkit"

# Python constraints
PYTHON_MIN="3.11"
PYTHON_MAX="3.12"
PYTHON_BIN=""

SAFE_MODE=false

print_header() {
echo -e "${BLUE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ServerKit Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
}

print_success(){ echo -e "${GREEN}✓ $1${NC}"; }
print_error(){ echo -e "${RED}✗ $1${NC}"; }
print_warning(){ echo -e "${YELLOW}! $1${NC}"; }
print_info(){ echo -e "${BLUE}→ $1${NC}"; }

version_ge(){ printf '%s\n%s' "$2" "$1" | sort -C -V; }
version_le(){ printf '%s\n%s' "$1" "$2" | sort -C -V; }

detect_python(){

if command -v python3 &>/dev/null; then
    PY_VER=$(python3 -c 'import sys;print(".".join(map(str,sys.version_info[:2])))')

    if version_ge "$PY_VER" "$PYTHON_MIN" && version_le "$PY_VER" "$PYTHON_MAX"; then
        PYTHON_BIN="python3"
        print_success "Using system Python $PY_VER"
        return
    fi
fi

print_warning "System Python not supported ($PYTHON_MIN-$PYTHON_MAX)"
}

check_ram(){

RAM=$(free -m | awk '/Mem:/ {print $2}')

if [ "$RAM" -le 700 ]; then
SAFE_MODE=true
print_warning "Low RAM detected (${RAM}MB) → enabling VPS Safe Mode"
fi

}

setup_swap(){

SWAP_TOTAL=$(free -m | awk '/Swap:/ {print $2}')

if [ "$SWAP_TOTAL" -lt 512 ]; then

print_info "Creating swap (1GB)"

if [ ! -f /swapfile ]; then
fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024
chmod 600 /swapfile
mkswap /swapfile >/dev/null
fi

swapon /swapfile || true

print_success "Swap enabled"

fi

}

print_header

if [ "$EUID" -ne 0 ]; then
print_error "Please run as root (sudo)"
exit 1
fi

OS_FAMILY="unknown"

if [ -f /etc/os-release ]; then
. /etc/os-release

if [ "$ID" = "ubuntu" ] || [ "$ID" = "debian" ]; then
OS_FAMILY="debian"
elif [ "$ID" = "fedora" ]; then
OS_FAMILY="fedora"
else
print_warning "Unknown OS"
fi
fi

print_info "Installing system dependencies..."

if [ "$OS_FAMILY" = "debian" ] || [ "$OS_FAMILY" = "unknown" ]; then

export NEEDRESTART_MODE=a
export DEBIAN_FRONTEND=noninteractive

apt-get update

apt-get install -y \
python3 \
python3-pip \
python3-venv \
python3-dev \
git \
curl \
build-essential \
libffi-dev \
libssl-dev \
iproute2 \
procps

detect_python

if [ -z "$PYTHON_BIN" ]; then

print_info "Installing Python 3.12..."

apt-get install -y \
python3.12 \
python3.12-venv \
python3.12-dev

PYTHON_BIN="python3.12"

fi

elif [ "$OS_FAMILY" = "fedora" ]; then

dnf update -y

dnf install -y \
python3 \
python3-pip \
git \
curl \
gcc \
gcc-c++ \
make \
libffi-devel \
openssl-devel \
python3-devel \
iproute \
procps-ng

detect_python

if [ -z "$PYTHON_BIN" ]; then

print_info "Installing Python 3.12..."

dnf install -y \
python3.12 \
python3.12-devel

PYTHON_BIN="python3.12"

fi

fi

print_success "System dependencies installed"

if ! command -v docker &> /dev/null; then

print_info "Installing Docker..."

curl -fsSL https://get.docker.com | sh

systemctl enable docker
systemctl start docker

print_success "Docker installed"

else

print_success "Docker already installed"

fi

if ! docker compose version &> /dev/null; then

print_info "Installing Docker Compose..."

if [ "$OS_FAMILY" = "fedora" ]; then
dnf install -y docker-compose-plugin
else
apt-get install -y docker-compose-plugin
fi

print_success "Docker Compose installed"

else

print_success "Docker Compose already installed"

fi

if ! command -v node &> /dev/null; then

print_info "Installing Node.js..."

if [ "$OS_FAMILY" = "fedora" ]; then
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
else
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

fi

print_success "Node.js $(node --version) installed"

else

print_success "Node.js $(node --version) already installed"

fi

print_info "Installing ServerKit to $INSTALL_DIR..."

if [ -d "$INSTALL_DIR" ]; then

print_warning "Directory exists, updating..."

cd "$INSTALL_DIR"
git fetch origin
git reset --hard origin/main

else

git clone https://github.com/jhd3197/serverkit.git "$INSTALL_DIR"
cd "$INSTALL_DIR"

fi

mkdir -p "$LOG_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$INSTALL_DIR/backend/instance"
mkdir -p "$INSTALL_DIR/nginx/ssl"

print_info "Setting up Python virtual environment..."

print_info "Using Python binary: $PYTHON_BIN"

$PYTHON_BIN --version

$PYTHON_BIN -m venv "$VENV_DIR"

source "$VENV_DIR/bin/activate"

print_info "Installing Python dependencies..."

if [ "$SAFE_MODE" = true ]; then
pip install --upgrade pip --no-cache-dir
pip install --no-cache-dir -r "$INSTALL_DIR/backend/requirements.txt"
else
pip install --upgrade pip
pip install -r "$INSTALL_DIR/backend/requirements.txt"
fi

pip install gunicorn gevent gevent-websocket

print_success "Python dependencies installed"

if [ ! -f "$INSTALL_DIR/.env" ]; then

print_info "Generating configuration..."

SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)

cat > "$INSTALL_DIR/.env" << EOF
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET_KEY
DATABASE_URL=sqlite:///$INSTALL_DIR/backend/instance/serverkit.db
PORT=80
SSL_PORT=443
FLASK_ENV=production
EOF

fi

print_info "Installing systemd service..."

cp "$INSTALL_DIR/serverkit-backend.service" /etc/systemd/system/serverkit.service

systemctl daemon-reload
systemctl enable serverkit

print_success "Systemd service installed"

chmod +x "$INSTALL_DIR/serverkit"

ln -sf "$INSTALL_DIR/serverkit" /usr/local/bin/serverkit

print_success "CLI installed"

print_info "Installing nginx..."

if [ "$OS_FAMILY" = "fedora" ]; then
dnf install -y nginx
else
apt-get install -y nginx
fi

systemctl enable nginx
systemctl start nginx

print_success "Nginx installed"

print_info "Building frontend..."

cd "$INSTALL_DIR/frontend"

npm ci --prefer-offline

NODE_OPTIONS="--max-old-space-size=1024" npm run build

cd "$INSTALL_DIR"

docker compose build

systemctl start serverkit

docker compose up -d

systemctl start nginx

sleep 8

BACKEND_OK=false
FRONTEND_OK=false

if curl -s http://127.0.0.1:5000/api/v1/system/health > /dev/null 2>&1; then
BACKEND_OK=true
print_success "Backend is running"
else
print_error "Backend health check failed"
fi

if curl -s http://localhost > /dev/null 2>&1; then
FRONTEND_OK=true
print_success "Frontend is running"
else
print_error "Frontend health check failed"
fi

echo ""

if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "ServerKit running at http://localhost"
echo ""
echo "Create admin:"
echo "serverkit create-admin"
echo ""
echo "Status:"
echo "serverkit status"
echo ""

else

echo -e "${RED}Installation may have issues${NC}"

fi
