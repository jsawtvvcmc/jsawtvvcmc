# ABC Program Management System - Deployment Guide

## Server Requirements

### Minimum Specifications
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB SSD
- **OS**: Ubuntu 22.04 LTS (recommended)
- **Bandwidth**: 1 TB/month

### Recommended Specifications (for 50+ users)
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 40 GB SSD
- **OS**: Ubuntu 22.04 LTS

---

## Option 1: Docker Deployment (Recommended)

### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y
```

### Deploy
```bash
# Clone or upload your code to /opt/j-app
cd /opt/j-app

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

---

## Option 2: Manual Deployment

### Step 1: Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod

# Install Nginx
sudo apt install -y nginx

# Install Supervisor
sudo apt install -y supervisor
```

### Step 2: Setup Application Directory
```bash
# Create app directory
sudo mkdir -p /opt/j-app
cd /opt/j-app

# Upload your code here (via git clone, scp, or rsync)
```

### Step 3: Setup Backend
```bash
cd /opt/j-app/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Create .env file
cp .env.example .env
nano .env  # Edit with your settings
```

### Step 4: Setup Frontend
```bash
cd /opt/j-app/frontend

# Install dependencies
npm install

# Create production build
npm run build
```

### Step 5: Configure Environment Variables

**Backend (.env)**
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="abc_program_db"
SECRET_KEY="your-secure-secret-key-here"
CORS_ORIGINS="https://yourdomain.com"

# Google Drive OAuth
GOOGLE_DRIVE_CLIENT_ID="your-client-id"
GOOGLE_DRIVE_CLIENT_SECRET="your-client-secret"
GOOGLE_DRIVE_FOLDER_ID="your-folder-id"
GOOGLE_OAUTH_REDIRECT_URI="https://yourdomain.com/api/drive/callback"

# Frontend URL for OAuth redirects
FRONTEND_URL="https://yourdomain.com"
```

**Frontend (.env)**
```env
REACT_APP_BACKEND_URL="https://yourdomain.com"
```

### Step 6: Configure Supervisor

Create `/etc/supervisor/conf.d/j-app.conf`:
```ini
[program:j-app-backend]
directory=/opt/j-app/backend
command=/opt/j-app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/j-app/backend.err.log
stdout_logfile=/var/log/j-app/backend.out.log
environment=PATH="/opt/j-app/backend/venv/bin"
```

```bash
# Create log directory
sudo mkdir -p /var/log/j-app
sudo chown www-data:www-data /var/log/j-app

# Reload supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start j-app-backend
```

### Step 7: Configure Nginx

Create `/etc/nginx/sites-available/j-app`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (React build)
    location / {
        root /opt/j-app/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 50M;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/j-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 8: Setup SSL (Let's Encrypt)
```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is enabled by default
```

---

## Post-Deployment Checklist

- [ ] Update Google OAuth redirect URI in Google Cloud Console to `https://yourdomain.com/api/drive/callback`
- [ ] Update Google Maps API key restrictions for your domain
- [ ] Create initial Super User account
- [ ] Test Google Drive connection
- [ ] Test all forms (Catching, Surgery, Treatment, etc.)
- [ ] Verify reports generate correctly with images
- [ ] Setup MongoDB backups

---

## Backup Strategy

### MongoDB Backup Script
Create `/opt/j-app/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/j-app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mongodump --db abc_program_db --out $BACKUP_DIR/backup_$DATE
# Keep only last 7 days of backups
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

```bash
# Make executable
chmod +x /opt/j-app/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/j-app/backup.sh") | crontab -
```

---

## Recommended Hosting Providers

| Provider | Plan | Price | Notes |
|----------|------|-------|-------|
| DigitalOcean | Droplet 4GB | $24/mo | Easy setup, good docs |
| Vultr | Cloud Compute | $24/mo | Global locations |
| Linode | Linode 4GB | $24/mo | Good performance |
| AWS Lightsail | 4GB | $20/mo | AWS ecosystem |
| Hetzner | CX31 | €10/mo | Best value (EU) |

---

## Troubleshooting

### Check Service Status
```bash
# Backend
sudo supervisorctl status j-app-backend
tail -f /var/log/j-app/backend.err.log

# Nginx
sudo systemctl status nginx
tail -f /var/log/nginx/error.log

# MongoDB
sudo systemctl status mongod
```

### Common Issues

1. **502 Bad Gateway**: Backend not running - check supervisor logs
2. **Images not loading**: Check Google Drive permissions and OAuth
3. **API errors**: Check backend logs and MongoDB connection
4. **SSL issues**: Re-run certbot or check certificate expiry

---

## Security Recommendations

1. **Firewall**: Only open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. **Fail2ban**: Protect against brute force
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

3. **Regular Updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **MongoDB Security**: Enable authentication for production
