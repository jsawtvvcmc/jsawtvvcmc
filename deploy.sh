#!/bin/bash
# ============================================
# ABC Program - VPS Quick Deploy Script
# ============================================
# Usage: ./deploy.sh yourdomain.com

set -e

DOMAIN=${1:-"yourdomain.com"}
APP_DIR="/opt/j-app"
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ABC Program - VPS Deployment Script  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

# Check domain argument
if [ "$DOMAIN" == "yourdomain.com" ]; then
    echo -e "${YELLOW}Usage: ./deploy.sh your-actual-domain.com${NC}"
    exit 1
fi

echo -e "${YELLOW}Deploying to domain: ${DOMAIN}${NC}"
echo ""

# Step 1: Update System
echo -e "${GREEN}[1/7] Updating system...${NC}"
apt update && apt upgrade -y

# Step 2: Install Docker
echo -e "${GREEN}[2/7] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Step 3: Install Docker Compose
echo -e "${GREEN}[3/7] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose
else
    echo "Docker Compose already installed"
fi

# Step 4: Setup Application Directory
echo -e "${GREEN}[4/7] Setting up application directory...${NC}"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/certbot/conf
mkdir -p $APP_DIR/certbot/www

# Step 5: Check if code exists
if [ ! -f "$APP_DIR/docker-compose.yml" ]; then
    echo -e "${RED}Error: Application code not found in $APP_DIR${NC}"
    echo -e "${YELLOW}Please copy your application code to $APP_DIR first${NC}"
    echo ""
    echo "Commands to copy code:"
    echo "  scp -r /path/to/j-app/* root@your-server:$APP_DIR/"
    echo ""
    exit 1
fi

# Step 6: Create production .env if not exists
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}[5/7] Creating .env file...${NC}"
    if [ -f "$APP_DIR/.env.production.example" ]; then
        cp $APP_DIR/.env.production.example $APP_DIR/.env
        sed -i "s/yourdomain.com/$DOMAIN/g" $APP_DIR/.env
        echo -e "${RED}IMPORTANT: Edit $APP_DIR/.env with your actual credentials!${NC}"
        echo -e "${YELLOW}nano $APP_DIR/.env${NC}"
        exit 1
    else
        echo -e "${RED}Error: .env.production.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[5/7] .env file exists${NC}"
fi

# Step 7: Update nginx.conf with domain
echo -e "${GREEN}[6/7] Configuring Nginx...${NC}"
sed -i "s/yourdomain.com/$DOMAIN/g" $APP_DIR/nginx.conf

# Step 8: Install Certbot for SSL
echo -e "${GREEN}[7/7] Setting up SSL...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install -y certbot
fi

# Create initial SSL certificate directory structure
mkdir -p $APP_DIR/certbot/conf/live/$DOMAIN

# Check if SSL certificates exist
if [ ! -f "$APP_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${YELLOW}SSL certificates not found. Getting certificates...${NC}"
    
    # Stop any running containers first
    cd $APP_DIR
    docker-compose down 2>/dev/null || true
    
    # Get certificate using standalone mode
    certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --agree-tos --non-interactive --email admin@$DOMAIN || {
        echo -e "${RED}Failed to get SSL certificate. Ensure:${NC}"
        echo "  1. Domain DNS is pointing to this server"
        echo "  2. Ports 80 and 443 are open"
        exit 1
    }
    
    # Copy certificates to certbot directory
    cp -rL /etc/letsencrypt/live/$DOMAIN/* $APP_DIR/certbot/conf/live/$DOMAIN/
    cp -rL /etc/letsencrypt/archive $APP_DIR/certbot/conf/
    cp /etc/letsencrypt/options-ssl-nginx.conf $APP_DIR/certbot/conf/ 2>/dev/null || true
fi

# Deploy with Docker Compose
echo -e "${GREEN}Starting services...${NC}"
cd $APP_DIR
docker-compose up -d --build

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!                  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your application is now running at: ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Post-deployment checklist:${NC}"
echo "  1. Update Google Cloud Console OAuth redirect URI:"
echo "     https://$DOMAIN/api/drive/callback"
echo "  2. Test login and Google Drive connection"
echo "  3. Setup daily backups (see DEPLOYMENT_GUIDE.md)"
echo ""
echo -e "Useful commands:"
echo "  docker-compose logs -f        # View logs"
echo "  docker-compose restart        # Restart services"
echo "  docker-compose down           # Stop services"
echo ""
