# Production Deployment Fix Guide

## Issue: WebSocket SSL Connection Failures

Your production WebSocket connections are failing due to SSL proxy configuration issues. Here's the complete fix:

## Step 1: Update Nginx Configuration

Replace your current nginx configuration with the enhanced version:

```bash
# Backup current config
sudo cp /etc/nginx/sites-available/scrum-poker /etc/nginx/sites-available/scrum-poker.backup

# Copy new configuration
sudo cp nginx-production.conf /etc/nginx/sites-available/scrum-poker

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## Step 2: Verify Docker Container

Ensure your Docker container is running and accessible:

```bash
# Check if container is running
docker-compose ps

# Check logs for any errors
docker-compose logs -f app

# If needed, restart containers
docker-compose down && docker-compose up -d
```

## Step 3: Test WebSocket Connection

Test the WebSocket connection directly:

```bash
# Install wscat for testing
npm install -g wscat

# Test WebSocket connection (replace with your domain)
wscat -c wss://scrum.future-spark.eu/ws

# Should connect successfully without SSL errors
```

## Step 4: Verify SSL Certificate

Check your SSL certificate status:

```bash
# Check certificate validity
sudo certbot certificates

# Check certificate expiration
openssl s_client -connect scrum.future-spark.eu:443 -servername scrum.future-spark.eu | openssl x509 -noout -dates

# If certificate issues, renew
sudo certbot renew --nginx
```

## Step 5: Debug Connection Issues

If problems persist, check these areas:

### Check Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/scrum-poker.error.log
```

### Check Docker Network
```bash
# Verify app is listening on port 5001
sudo netstat -tlnp | grep 5001

# Test direct connection to Docker container
curl -I http://localhost:5001/api/auth/user
```

### Check Firewall
```bash
# Ensure required ports are open
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

## Step 6: Alternative WebSocket Configuration

If issues persist, try this simplified WebSocket configuration in nginx:

```nginx
location /ws {
    proxy_pass http://localhost:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
}
```

## Expected Results

After applying these fixes:

1. WebSocket connections should establish successfully over WSS
2. Real-time features (voting, participant updates) should work
3. No SSL/TLS errors in browser console
4. Stable connection without reconnection attempts

## Testing Commands

Run these commands to verify everything works:

```bash
# Test HTTPS access
curl -I https://scrum.future-spark.eu

# Test API endpoint
curl https://scrum.future-spark.eu/api/auth/user

# Check WebSocket upgrade headers
curl -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" https://scrum.future-spark.eu/ws
```

The configuration includes enhanced security, rate limiting, and optimized WebSocket handling for production environments.