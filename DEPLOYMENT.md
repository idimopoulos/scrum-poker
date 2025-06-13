# Deployment Guide

## WebSocket Connection Issues in Production

### Problem
The Scrum Poker application may fail to establish WebSocket connections in production environments due to reverse proxy or SSL termination configuration issues. This commonly occurs when:

- Reverse proxies don't properly handle WebSocket upgrade requests
- SSL termination points don't forward WebSocket protocols correctly
- Load balancers strip WebSocket headers

### Solution
The application includes an automatic polling fallback mechanism that activates when WebSocket connections fail. Users will see a connection status indicator:

- 🟢 **Real-time** - WebSocket connection active
- 🟡 **Polling** - Fallback mode (updates every 2 seconds)
- 🔴 **Offline** - No connection

### Fixing WebSocket Issues

#### For Nginx Reverse Proxy
Add these directives to your server block:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    location /api/ws {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### For Apache Reverse Proxy
Enable required modules and add configuration:

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so

<VirtualHost *:443>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    # WebSocket proxy
    ProxyPass /api/ws ws://localhost:5001/api/ws
    ProxyPassReverse /api/ws ws://localhost:5001/api/ws
    
    # HTTP proxy
    ProxyPass / http://localhost:5001/
    ProxyPassReverse / http://localhost:5001/
</VirtualHost>
```

#### For Traefik
Add labels to your Docker Compose service:

```yaml
services:
  scrum-poker:
    image: your-image
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.scrum-poker.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.scrum-poker.tls.certresolver=letsencrypt"
      - "traefik.http.services.scrum-poker.loadbalancer.server.port=5001"
```

## Docker Deployment

### Current Setup
The application is configured to run on port 5001 inside the container and can be mapped to any external port.

### Environment Variables
Required environment variables for production:

```bash
NODE_ENV=production
PORT=5001
```

### Health Check
The application includes a health check endpoint at `/api/health` that returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "websocket": "available"
}
```

## Monitoring

### Connection Status
Monitor WebSocket connection health by checking the browser console for:
- Connection attempts
- Fallback activation
- Polling errors

### Performance
- WebSocket connections provide real-time updates
- Polling fallback updates every 2 seconds
- API response times should be under 100ms for optimal experience

## Troubleshooting

### Common Issues
1. **502 Bad Gateway** - Backend not running or port mismatch
2. **WebSocket connection failed** - Proxy configuration issue
3. **Polling errors** - API endpoints not accessible

### Debug Steps
1. Check application logs for WebSocket server initialization
2. Verify proxy configuration forwards WebSocket headers
3. Test direct connection to application port
4. Monitor network requests in browser developer tools

### Support
If WebSocket connections continue to fail after proxy configuration, the polling fallback ensures full functionality with slight delay in real-time updates.