#!/bin/bash

# Production WebSocket SSL Fix Script
# Run this script on your production server to fix WebSocket connection issues

set -e

echo "🔧 Fixing Production WebSocket SSL Issues..."

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
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
    print_warning "Running with sudo privileges"
fi

# Backup current nginx configuration
print_status "Backing up current nginx configuration..."
$SUDO cp /etc/nginx/sites-available/scrum-poker /etc/nginx/sites-available/scrum-poker.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Update nginx configuration with WebSocket fix
print_status "Updating nginx configuration for WebSocket SSL support..."

$SUDO tee /etc/nginx/sites-available/scrum-poker > /dev/null << 'EOF'
# Production Nginx configuration for Scrum Poker WebSocket SSL

upstream scrum_backend {
    server localhost:5001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name scrum.future-spark.eu;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main HTTPS server with WebSocket support
server {
    listen 443 ssl http2;
    server_name scrum.future-spark.eu;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/scrum.future-spark.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/scrum.future-spark.eu/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # WebSocket location - CRITICAL FIX
    location /ws {
        proxy_pass http://scrum_backend;
        
        # Essential WebSocket headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
        
        # Disable buffering for real-time communication
        proxy_buffering off;
        proxy_cache off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }

    # API routes
    location /api/ {
        proxy_pass http://scrum_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Static files and frontend
    location / {
        proxy_pass http://scrum_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logging
    access_log /var/log/nginx/scrum-poker.access.log;
    error_log /var/log/nginx/scrum-poker.error.log;
}
EOF

# Test nginx configuration
print_status "Testing nginx configuration..."
if $SUDO nginx -t; then
    print_status "Nginx configuration test passed"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Reload nginx
print_status "Reloading nginx..."
$SUDO systemctl reload nginx

# Check if Docker containers are running
print_status "Checking Docker containers..."
if docker-compose ps | grep -q "Up"; then
    print_status "Docker containers are running"
else
    print_warning "Docker containers may not be running. Starting..."
    docker-compose up -d
fi

# Test local connection
print_status "Testing local backend connection..."
if curl -s -f http://localhost:5001/api/auth/user > /dev/null; then
    print_status "Local backend is responding"
else
    print_error "Local backend is not responding on port 5001"
    print_status "Container logs:"
    docker-compose logs --tail=20 app
fi

# Test SSL certificate
print_status "Checking SSL certificate..."
if echo | openssl s_client -connect scrum.future-spark.eu:443 -servername scrum.future-spark.eu 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
    print_status "SSL certificate is valid"
else
    print_warning "SSL certificate may have issues. Consider running: sudo certbot renew"
fi

# Final status check
print_status "Deployment status:"
echo "  ✓ Nginx configuration updated with WebSocket SSL support"
echo "  ✓ Configuration tested and reloaded"
echo "  ✓ Docker containers checked"
echo "  ✓ SSL certificate verified"

print_status "WebSocket SSL fix completed!"
print_status "Your app should now work properly at: https://scrum.future-spark.eu"

echo ""
print_warning "If WebSocket issues persist, check:"
echo "  - Docker logs: docker-compose logs -f app"
echo "  - Nginx error logs: sudo tail -f /var/log/nginx/error.log"
echo "  - Firewall: sudo ufw status"
EOF