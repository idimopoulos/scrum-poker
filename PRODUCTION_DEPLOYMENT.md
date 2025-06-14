# Production Deployment Guide

## Prerequisites

1. Create a `.env` file in your project root with these exact values:

```bash
REPL_ID=your-repl-id-here
REPLIT_DOMAINS=scrum.future-spark.eu
SESSION_SECRET=your-secure-random-string-here
NODE_ENV=production
DATABASE_URL=postgresql://scrumpoker:scrumpoker@postgres:5432/scrumpoker
```

## Deployment Commands

1. **Stop existing containers and remove volumes:**
```bash
docker-compose down -v
```

2. **Build and start the application:**
```bash
docker-compose up --build -d
```

3. **Check logs to verify successful startup:**
```bash
docker-compose logs -f app
```

## Database Features

✅ **PostgreSQL 15 with persistent storage**
- Database: `scrumpoker`
- User/Password: `scrumpoker/scrumpoker`
- Port: 5432 (internal), accessible via Docker network

✅ **Automatic table creation**
- Users, sessions, rooms, participants, votes, voting history
- All tables created automatically on first startup

✅ **Data persistence**
- All user sessions survive container restarts
- Room data and voting history permanently stored
- Authentication state maintained across deployments

## Application Features

✅ **Authentication System**
- Production mode: Simple authentication with spam prevention
- Development mode: Replit OAuth integration
- Secure session management with PostgreSQL storage

✅ **Real-time Collaboration**
- WebSocket server on `/api/ws`
- Live voting updates
- Participant synchronization

✅ **Complete Scrum Poker Functionality**
- Custom voting systems (Fibonacci, T-shirt, etc.)
- Dual voting (story points + time estimation)
- Voting history and statistics
- Room management and sharing

## Health Checks

The application includes automatic health monitoring:

- **PostgreSQL**: Health check every 30 seconds
- **Application**: HTTP health check on port 5000
- **Startup**: 40-second grace period for initialization

## Environment Variables

Required for production:
- `REPL_ID`: Your Replit project identifier
- `REPLIT_DOMAINS`: Your custom domain
- `SESSION_SECRET`: Secure random string for session encryption
- `DATABASE_URL`: PostgreSQL connection string (auto-configured)

## Troubleshooting

**If environment variables aren't loading:**
- Verify `.env` file exists in project root
- Check `docker-compose.yml` includes `env_file: - .env`

**If database connection fails:**
- Check PostgreSQL container logs: `docker-compose logs postgres`
- Verify database is healthy: `docker-compose ps`

**If application won't start:**
- Check application logs: `docker-compose logs app`
- Verify all required environment variables are set