# Scrum Poker - Real-time Planning Tool

A collaborative Scrum poker web application for agile teams to estimate story points and time requirements in real-time.

## Features

- **Real-time Collaboration**: Live voting synchronization using WebSockets
- **Customizable Voting Systems**: Fibonacci, T-shirt sizes, or custom values
- **Dual Voting Mode**: Estimate both story points and time simultaneously
- **Administrator Controls**: Room creators have exclusive access to reveal votes and manage rounds
- **No Login Required**: Simple name-based participation
- **Voting Statistics**: Real-time progress tracking with average, min, and max calculations
- **Voting History**: Complete session history with detailed statistics
- **Easy Room Sharing**: Simple room codes for quick team joining

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository
2. Run the application:
   ```bash
   docker-compose up -d
   ```
3. Open your browser to `http://localhost:5000`

### Manual Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:5000`

### Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

## Production Deployment

### Automated Deployment with GitHub Actions

The repository includes automated deployment workflows for seamless CI/CD.

#### Prerequisites

1. **Docker Hub Account**: Create an account at [hub.docker.com](https://hub.docker.com)
2. **Server Setup**: Ubuntu/Debian server with Docker and Docker Compose installed
3. **Domain**: Point your domain to your server's IP address

#### Deployment Options

**Option 1: Direct VPS Deployment (Recommended)**
No Docker Hub required - builds directly on your server.

GitHub repository secrets needed:
```
SERVER_HOST=your-server-ip-or-domain
SERVER_USER=your-server-username
SERVER_SSH_KEY=your-private-ssh-key
```

**Option 2: Docker Hub Deployment**
For distributed deployments or multiple servers.

Additional secrets needed:
```
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password
```

#### Server Setup

1. **Install Docker and Docker Compose:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Reboot to apply group changes
sudo reboot
```

2. **Clone repository on server:**
```bash
sudo mkdir -p /opt/scrum-poker
sudo chown $USER:$USER /opt/scrum-poker
cd /opt/scrum-poker
git clone https://github.com/your-username/your-repo-name .
```

3. **Set up reverse proxy (Nginx):**
```bash
# Install Nginx
sudo apt install nginx -y

# Create site configuration
sudo tee /etc/nginx/sites-available/scrum-poker << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/scrum-poker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

4. **Set up SSL with Let's Encrypt:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

5. **Configure firewall:**
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

#### Quick Server Setup

Use the automated deployment script:

```bash
# Make script executable
chmod +x scripts/deploy-server.sh

# Run setup script
./scripts/deploy-server.sh your-domain.com
```

This script automatically:
- Installs Docker, Docker Compose, Nginx, and Certbot
- Configures reverse proxy and SSL
- Sets up firewall rules
- Generates SSL certificate

#### Deployment Process

**Option 1: Direct VPS Deployment**
Use the `deploy-direct.yml` workflow (no Docker Hub needed):

1. **Push to main branch** triggers direct deployment
2. **Manual deployment** via GitHub Actions tab → "Deploy Direct to Server" → "Run workflow"

The workflow:
- SSHs to your server and pulls latest code
- Builds Docker image directly on server
- Updates and restarts containers
- Verifies deployment health

**Option 2: Manual Local Deployment**
Run directly on your server:

```bash
# Clone repository
cd /opt/scrum-poker
git pull origin main

# Deploy locally
./scripts/deploy-local.sh
```

**Option 3: Docker Hub Deployment**
Use the `deploy.yml` workflow for distributed deployments:

- Builds Docker image and pushes to Docker Hub
- SSHs to your server and pulls latest image
- Updates and restarts containers

### Manual Docker Deployment

#### Building the Image

```bash
docker build -t scrum-poker .
```

#### Running with Docker

```bash
docker run -p 5001:5000 scrum-poker
```

#### Using Docker Compose

```bash
# Start application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop application
docker-compose down
```

The included `docker-compose.yml` provides:
- Application container with health checks
- Optional PostgreSQL database (commented out, uses in-memory storage by default)
- Automatic restart policies
- Volume mounting for development

## Environment Variables

- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Server port (default: 5000)

## How to Use

1. **Create a Room**: Set room name, voting system, and preferences
2. **Share Room Code**: Invite team members using the generated room ID
3. **Join as Participants**: Team members enter their names to join
4. **Vote on Stories**: Select story points and/or time estimates
5. **Reveal Results**: Administrator reveals votes to see team consensus
6. **Track Progress**: View real-time statistics and voting history

## Administrator Features

Room creators have exclusive access to:
- Reveal votes button
- Auto-reveal toggle
- Task description management
- Next round controls
- Room settings panel

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, WebSockets
- **Storage**: In-memory (MemStorage) with optional PostgreSQL support
- **Build Tools**: Vite, ESBuild
- **Containerization**: Docker, Docker Compose

## API Endpoints

- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/join` - Join room as participant
- `WebSocket` - Real-time updates and voting

## Troubleshooting

### Common Issues

#### GitHub Actions Deployment Fails

**Issue**: Build or deployment fails in GitHub Actions
**Solutions**:
- Verify all repository secrets are correctly set
- Check Docker Hub credentials and repository permissions
- Ensure server SSH key is in OpenSSH format (not PuTTY)
- Verify server firewall allows SSH connections

#### WebSocket Connection Issues

**Issue**: Real-time features not working
**Solutions**:
- Check proxy configuration includes WebSocket headers
- Verify `proxy_read_timeout` is set to handle long connections
- Ensure firewall allows traffic on configured ports

#### SSL Certificate Problems

**Issue**: HTTPS not working or certificate errors
**Solutions**:
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run
```

#### Application Not Starting

**Issue**: Docker containers fail to start
**Solutions**:
```bash
# Check container logs
docker-compose logs -f

# Restart containers
docker-compose down && docker-compose up -d

# Check system resources
docker system df
docker system prune -f
```

#### Database Connection Issues

**Issue**: If switching to PostgreSQL database
**Solutions**:
- Uncomment PostgreSQL service in `docker-compose.yml`
- Update environment variables for database connection
- Ensure database initialization completes before app starts

### Monitoring

#### Check Application Health

```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Application logs
docker-compose logs -f app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### Performance Optimization

```bash
# Clean up Docker resources
docker system prune -a

# Monitor system resources
htop
df -h
free -h
```

## Development

### Project Structure

```
├── .github/workflows/   # CI/CD workflows
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom hooks
│   └── lib/            # Utilities
├── server/             # Express backend
├── shared/             # Shared types and schemas
├── scripts/            # Deployment scripts
└── docker-compose.yml  # Container orchestration
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - TypeScript type checking

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT