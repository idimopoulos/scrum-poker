#!/bin/bash

# Scrum Poker Server Deployment Script
# Usage: ./scripts/deploy-server.sh your-domain.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Domain name required"
    echo "Usage: $0 your-domain.com"
    exit 1
fi

DOMAIN=$1
PROJECT_DIR="/opt/scrum-poker"

print_status "Starting Scrum Poker server deployment for domain: $DOMAIN"

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker installed successfully"
else
    print_warning "Docker already installed"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo apt install docker-compose-plugin -y
    print_status "Docker Compose installed successfully"
else
    print_warning "Docker Compose already installed"
fi

# Install Nginx
print_status "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install nginx -y
    sudo systemctl enable nginx
    print_status "Nginx installed successfully"
else
    print_warning "Nginx already installed"
fi

# Install Certbot
print_status "Installing Certbot for SSL..."
if ! command -v certbot &> /dev/null; then
    sudo apt install certbot python3-certbot-nginx -y
    print_status "Certbot installed successfully"
else
    print_warning "Certbot already installed"
fi

# Create project directory
print_status "Setting up project directory..."
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Create Nginx configuration
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/scrum-poker << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable Nginx site
if [ ! -L /etc/nginx/sites-enabled/scrum-poker ]; then
    sudo ln -s /etc/nginx/sites-available/scrum-poker /etc/nginx/sites-enabled/
fi

# Test Nginx configuration
sudo nginx -t
sudo systemctl restart nginx

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw --force enable

# Setup SSL certificate
print_status "Setting up SSL certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email

# Setup auto-renewal for SSL
print_status "Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

print_status "Server setup completed successfully!"
print_status "Next steps:"
echo "1. Clone your repository to $PROJECT_DIR"
echo "2. Configure GitHub Actions secrets in your repository"
echo "3. Push to main branch to trigger deployment"
echo ""
print_status "Your Scrum Poker application will be available at: https://$DOMAIN"

# Check if reboot is needed
if [ -f /var/run/reboot-required ]; then
    print_warning "A reboot is required to complete the installation"
    echo "Run 'sudo reboot' when ready"
fi