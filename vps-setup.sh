#!/bin/bash
#############################################
# J-APP Deployment Script for BigRock VPS
# Run this script on your VPS as root
#############################################

set -e

echo "🚀 Starting J-APP Deployment..."

# Configuration - UPDATE THESE VALUES
DOMAIN="your-domain.com"  # Change to your domain or use server IP
MONGO_PASSWORD="japp_mongo_$(openssl rand -hex 8)"
SECRET_KEY="$(openssl rand -hex 32)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

echo -e "${YELLOW}Step 3: Installing Docker Compose...${NC}"
apt install -y docker-compose

echo -e "${YELLOW}Step 4: Creating application directory...${NC}"
mkdir -p /opt/j-app
cd /opt/j-app

echo -e "${YELLOW}Step 5: Creating Docker Compose file...${NC}"
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: j-app-mongodb
    restart: always
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=abc_program_db
    networks:
      - j-app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: j-app-backend
    restart: always
    depends_on:
      - mongodb
    env_file:
      - ./backend/.env
    networks:
      - j-app-network
    ports:
      - "8001:8001"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
    container_name: j-app-frontend
    restart: always
    depends_on:
      - backend
    networks:
      - j-app-network
    ports:
      - "80:80"

volumes:
  mongodb_data:

networks:
  j-app-network:
    driver: bridge
EOF

echo -e "${YELLOW}Step 6: Creating backend Dockerfile...${NC}"
mkdir -p backend
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
EOF

echo -e "${YELLOW}Step 7: Creating frontend Dockerfile...${NC}"
mkdir -p frontend
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine as build

WORKDIR /app

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

cat > frontend/nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
EOF

echo -e "${GREEN}✅ Setup script created!${NC}"
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "1. Upload your application code to /opt/j-app/backend/ and /opt/j-app/frontend/"
echo ""
echo "2. Create backend/.env file with your settings"
echo ""
echo "3. Run: docker-compose up -d --build"
echo ""
echo "4. Access your app at: http://$(curl -s ifconfig.me)"
echo ""
echo -e "${GREEN}Generated credentials:${NC}"
echo "SECRET_KEY=$SECRET_KEY"
echo ""
