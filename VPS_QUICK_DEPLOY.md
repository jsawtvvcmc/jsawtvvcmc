# VPS Quick Deployment Guide

## Prerequisites
- Ubuntu 22.04 VPS with root access
- Domain name pointing to your VPS IP
- Google Cloud credentials (you already have these)

---

## Quick Deploy (5 Steps)

### Step 1: Connect to your VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Create app directory
```bash
mkdir -p /opt/j-app
cd /opt/j-app
```

### Step 3: Upload your code
**Option A - From your local machine:**
```bash
# Run this on YOUR computer, not the VPS
scp -r /path/to/your/j-app/* root@your-vps-ip:/opt/j-app/
```

**Option B - Clone from Git (if you pushed to GitHub):**
```bash
git clone https://github.com/your-username/j-app.git /opt/j-app
```

### Step 4: Configure environment
```bash
cd /opt/j-app

# Copy example env file
cp .env.production.example .env

# Edit with your credentials
nano .env
```

**Update these values in .env:**
```env
# Replace with your actual domain
DOMAIN=abc.yourdomain.com

# Generate a secure secret key
SECRET_KEY=run-this-command: openssl rand -hex 32

# Keep your existing Google credentials from current .env:
GOOGLE_SERVICE_ACCOUNT_JSON='...'  # Copy from current backend/.env
GOOGLE_DRIVE_FOLDER_ID=...         # Copy from current backend/.env
GOOGLE_CLIENT_ID=...               # Copy from current backend/.env
GOOGLE_CLIENT_SECRET=...           # Copy from current backend/.env

# Update redirect URI with your new domain
GOOGLE_REDIRECT_URI=https://abc.yourdomain.com/api/drive/callback
```

### Step 5: Run deployment script
```bash
chmod +x deploy.sh
./deploy.sh abc.yourdomain.com
```

---

## Post-Deployment

### 1. Update Google Cloud Console
Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and update:
- **Authorized redirect URIs:** `https://abc.yourdomain.com/api/drive/callback`
- **Authorized JavaScript origins:** `https://abc.yourdomain.com`

### 2. Test Your Application
1. Open `https://abc.yourdomain.com` in browser
2. Login with your superadmin credentials
3. Test Google Drive connection
4. Create a test case with photo upload

---

## Useful Commands

```bash
# View all logs
cd /opt/j-app
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop everything
docker-compose down

# Rebuild and restart (after code changes)
docker-compose up -d --build
```

---

## Troubleshooting

### Issue: 502 Bad Gateway
```bash
# Check if backend is running
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### Issue: SSL Certificate Error
```bash
# Renew certificate
certbot renew

# Copy new certificates
cp -rL /etc/letsencrypt/live/yourdomain.com/* /opt/j-app/certbot/conf/live/yourdomain.com/

# Restart nginx
docker-compose restart nginx
```

### Issue: Google Drive Connection Failed
1. Verify redirect URI in Google Cloud Console matches your domain
2. Check backend logs: `docker-compose logs backend | grep -i google`
3. Ensure service account has access to the Drive folder

---

## Backup (Important!)

### Setup Daily Backup
```bash
# Create backup script
cat > /opt/j-app/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/j-app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec j-app-mongodb mongodump --db abc_program_db --archive=/data/backup_$DATE.gz --gzip
docker cp j-app-mongodb:/data/backup_$DATE.gz $BACKUP_DIR/
docker exec j-app-mongodb rm /data/backup_$DATE.gz
find $BACKUP_DIR -type f -mtime +7 -delete
echo "Backup completed: $BACKUP_DIR/backup_$DATE.gz"
EOF

chmod +x /opt/j-app/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/j-app/backup.sh") | crontab -
```

### Manual Backup
```bash
/opt/j-app/backup.sh
```

### Restore from Backup
```bash
# Replace BACKUP_FILE with actual filename
docker cp /opt/j-app/backups/BACKUP_FILE.gz j-app-mongodb:/data/
docker exec j-app-mongodb mongorestore --db abc_program_db --archive=/data/BACKUP_FILE.gz --gzip --drop
```
