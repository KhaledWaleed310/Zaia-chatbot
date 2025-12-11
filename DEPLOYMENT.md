# ZAIA RAG Chatbot - Server Deployment Guide

Complete instructions for deploying the ZAIA Fusion RAG Chatbot Platform on a cloud server (LightSail, DigitalOcean, etc.)

## Prerequisites

- Ubuntu 22.04 LTS server (4GB RAM, 2 vCPU recommended)
- SSH access to the server
- Domain name (optional, for production)

## Quick Start

```bash
# Clone the repository
git clone git@github.com:KhaledWaleed310/Zaia-chatbot.git
cd Zaia-chatbot

# Run the setup script
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

---

## Manual Installation

### Step 1: System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
    git \
    curl \
    wget \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for docker group to take effect
```

### Step 2: Clone Repository

```bash
cd ~
git clone git@github.com:KhaledWaleed310/Zaia-chatbot.git
cd Zaia-chatbot
```

### Step 3: Environment Configuration

```bash
# Create backend environment file
cp backend/.env.example backend/.env

# Edit with your settings
nano backend/.env
```

**Required environment variables in `backend/.env`:**

```env
# Application
APP_ENV=production
SECRET_KEY=your-super-secret-key-change-this-in-production

# MongoDB
MONGODB_URI=mongodb://mongo:27017
MONGODB_DB=zaia_chatbot

# Qdrant
QDRANT_HOST=qdrant
QDRANT_PORT=6333

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password

# Redis
REDIS_URL=redis://redis:6379

# DeepSeek API (for LLM)
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# JWT
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# File Upload
MAX_UPLOAD_SIZE_MB=50
```

### Step 4: Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 5: Build Frontend for Production

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# The build output will be in frontend/dist/
```

### Step 6: Configure Nginx (Production)

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/zaia-chatbot
```

**Nginx configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (React)
    location / {
        root /home/ubuntu/Zaia-chatbot/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Docs
    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /openapi.json {
        proxy_pass http://localhost:8000/openapi.json;
        proxy_set_header Host $host;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/health;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/zaia-chatbot /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 7: SSL Certificate (Optional but Recommended)

```bash
# Install SSL certificate with Let's Encrypt
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

---

## Service Management

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart api

# View logs
docker-compose logs -f api
docker-compose logs -f mongo

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d
```

### Check Service Health

```bash
# API health check
curl http://localhost:8000/health

# MongoDB
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Redis
docker-compose exec redis redis-cli ping

# Qdrant
curl http://localhost:6333/health

# Neo4j
curl http://localhost:7474
```

---

## Running Tests

### Backend Tests

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=app --cov-report=html
```

### Frontend Tests

```bash
cd frontend

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## Project Structure

```
Zaia-chatbot/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API endpoints
│   │   ├── models/          # Pydantic models
│   │   ├── services/        # Business logic
│   │   ├── ingestion/       # Document processing
│   │   ├── middleware/      # Auth, rate limiting
│   │   ├── config.py        # Settings
│   │   ├── dependencies.py  # DB connections
│   │   └── main.py          # FastAPI app
│   ├── tests/               # Backend tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── DEPLOYMENT.md
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/register` | POST | Register new tenant |
| `/api/v1/login` | POST | Login and get JWT |
| `/api/v1/knowledge-bases` | GET/POST | List/Create KBs |
| `/api/v1/knowledge-bases/{id}` | GET/PUT/DELETE | KB operations |
| `/api/v1/knowledge-bases/{id}/upload` | POST | Upload documents |
| `/api/v1/chatbots` | GET/POST | List/Create chatbots |
| `/api/v1/chatbots/{id}` | GET/PUT/DELETE | Chatbot operations |
| `/api/v1/chatbots/{id}/chat` | POST | Send message |
| `/api/v1/dashboard/stats` | GET | Dashboard statistics |

**Full API documentation available at:** `http://your-server:8000/docs`

---

## Troubleshooting

### Common Issues

**1. Docker permission denied**
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

**2. Port already in use**
```bash
# Find process using port
sudo lsof -i :8000
# Kill process
sudo kill -9 <PID>
```

**3. MongoDB connection failed**
```bash
# Check if MongoDB is running
docker-compose ps mongo
docker-compose logs mongo
```

**4. Out of memory**
```bash
# Check memory usage
free -h
docker stats

# Reduce service memory (edit docker-compose.yml)
```

**5. Frontend build fails**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules
npm install
```

### Log Locations

```bash
# Docker logs
docker-compose logs -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

---

## Backup & Restore

### Backup MongoDB

```bash
# Create backup
docker-compose exec mongo mongodump --out /backup
docker cp $(docker-compose ps -q mongo):/backup ./mongodb-backup

# Restore backup
docker cp ./mongodb-backup $(docker-compose ps -q mongo):/backup
docker-compose exec mongo mongorestore /backup
```

### Backup Qdrant

```bash
# Qdrant data is stored in docker volume
docker run --rm -v zaia_qdrant_data:/data -v $(pwd):/backup alpine tar cvf /backup/qdrant-backup.tar /data
```

---

## Security Checklist

- [ ] Change default `SECRET_KEY` in `.env`
- [ ] Set strong `NEO4J_PASSWORD`
- [ ] Configure firewall (UFW)
- [ ] Enable SSL with Let's Encrypt
- [ ] Set up fail2ban for SSH protection
- [ ] Regular security updates (`sudo apt update && sudo apt upgrade`)
- [ ] Backup strategy in place

---

## Support

- **GitHub Issues:** https://github.com/KhaledWaleed310/Zaia-chatbot/issues
- **API Docs:** http://your-server:8000/docs

---

## License

MIT License - See LICENSE file for details
