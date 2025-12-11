#!/bin/bash

# ZAIA RAG Chatbot - Nginx & SSL Setup
# Domain: chatbot.zaiasystems.com

set -e

DOMAIN="chatbot.zaiasystems.com"
PROJECT_DIR="$HOME/Zaia-chatbot"

echo "=========================================="
echo "Setting up Nginx & SSL for $DOMAIN"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Please do not run as root. Run as a regular user with sudo privileges."
    exit 1
fi

# Install Nginx and Certbot if not present
echo ""
echo "Step 1: Installing Nginx and Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
print_status "Nginx and Certbot installed"

# Create Nginx configuration
echo ""
echo "Step 2: Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/zaia-chatbot > /dev/null <<EOF
# ZAIA RAG Chatbot - Nginx Configuration
# Domain: $DOMAIN

server {
    listen 80;
    server_name $DOMAIN;

    # Redirect HTTP to HTTPS (after SSL is configured)
    # Certbot will modify this automatically

    # Frontend (React build)
    root $PROJECT_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 50M;
    }

    # API Documentation
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host \$host;
    }

    location /redoc {
        proxy_pass http://127.0.0.1:8000/redoc;
        proxy_set_header Host \$host;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_set_header Host \$host;
    }

    # WebSocket support for real-time features
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

print_status "Nginx configuration created"

# Enable the site
echo ""
echo "Step 3: Enabling site..."
sudo ln -sf /etc/nginx/sites-available/zaia-chatbot /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo ""
echo "Step 4: Testing Nginx configuration..."
sudo nginx -t
print_status "Nginx configuration valid"

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
print_status "Nginx restarted"

# Configure firewall
echo ""
echo "Step 5: Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable
print_status "Firewall configured"

# Obtain SSL certificate
echo ""
echo "Step 6: Obtaining SSL certificate..."
print_warning "Make sure DNS for $DOMAIN points to this server's IP!"
echo ""
read -p "Press Enter when DNS is configured, or Ctrl+C to skip SSL for now..."

sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email khaledwaleed310@gmail.com --redirect

print_status "SSL certificate obtained and configured"

# Verify SSL auto-renewal
echo ""
echo "Step 7: Testing SSL auto-renewal..."
sudo certbot renew --dry-run
print_status "Auto-renewal configured"

# Final status
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Your site is now available at:"
echo "  - https://$DOMAIN"
echo "  - https://$DOMAIN/docs (API Documentation)"
echo ""
echo "SSL certificate will auto-renew via certbot timer."
echo ""
