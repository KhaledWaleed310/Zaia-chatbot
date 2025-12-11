#!/bin/bash

# ZAIA RAG Chatbot - Server Setup Script
# For Ubuntu 22.04 LTS

set -e

echo "=========================================="
echo "ZAIA RAG Chatbot - Server Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run as root. Run as a regular user with sudo privileges."
    exit 1
fi

# Update system
echo ""
echo "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System updated"

# Install essential packages
echo ""
echo "Step 2: Installing essential packages..."
sudo apt install -y \
    git \
    curl \
    wget \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw
print_status "Essential packages installed"

# Install Node.js 20 LTS
echo ""
echo "Step 3: Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
print_status "Node.js $(node --version) installed"

# Install Docker
echo ""
echo "Step 4: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker installed"
else
    print_status "Docker already installed"
fi

# Install Docker Compose
echo ""
echo "Step 5: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed"
else
    print_status "Docker Compose already installed"
fi

# Setup project directory
echo ""
echo "Step 6: Setting up project..."
PROJECT_DIR="$HOME/Zaia-chatbot"

if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found. Please clone the repository first:"
    echo "  git clone git@github.com:KhaledWaleed310/Zaia-chatbot.git"
    exit 1
fi

cd "$PROJECT_DIR"
print_status "Project directory: $PROJECT_DIR"

# Create .env file if not exists
echo ""
echo "Step 7: Setting up environment..."
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        print_warning "Created backend/.env from example. Please edit with your settings!"
    else
        print_error "No .env.example found. Please create backend/.env manually."
    fi
else
    print_status "backend/.env already exists"
fi

# Configure firewall
echo ""
echo "Step 8: Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 8000/tcp  # Backend API
sudo ufw allow 3000/tcp  # Frontend dev
sudo ufw --force enable
print_status "Firewall configured"

# Build frontend
echo ""
echo "Step 9: Building frontend..."
cd "$PROJECT_DIR/frontend"
npm install
npm run build
print_status "Frontend built"

# Start Docker services
echo ""
echo "Step 10: Starting Docker services..."
cd "$PROJECT_DIR"

# Need to use newgrp or re-login for docker group
if groups | grep -q docker; then
    docker-compose up -d
    print_status "Docker services started"
else
    print_warning "Docker group not active yet. Please run:"
    echo "  newgrp docker"
    echo "  docker-compose up -d"
fi

# Setup Nginx
echo ""
echo "Step 11: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/zaia-chatbot > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root $PROJECT_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }

    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_set_header Host \$host;
    }

    location /openapi.json {
        proxy_pass http://localhost:8000/openapi.json;
    }

    location /health {
        proxy_pass http://localhost:8000/health;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/zaia-chatbot /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
print_status "Nginx configured"

# Print summary
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Services:"
echo "  - Frontend: http://$(curl -s ifconfig.me)"
echo "  - Backend API: http://$(curl -s ifconfig.me):8000"
echo "  - API Docs: http://$(curl -s ifconfig.me):8000/docs"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your settings"
echo "  2. Run: docker-compose restart"
echo "  3. For SSL: sudo certbot --nginx -d your-domain.com"
echo ""
print_warning "If docker commands fail, run: newgrp docker"
echo ""
