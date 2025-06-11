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

## Docker Deployment

### Building the Image

```bash
docker build -t scrum-poker .
```

### Running with Docker

```bash
docker run -p 5000:5000 scrum-poker
```

### Using Docker Compose

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

## Development

### Project Structure

```
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom hooks
│   └── lib/            # Utilities
├── server/             # Express backend
├── shared/             # Shared types and schemas
└── docker-compose.yml  # Container orchestration
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - TypeScript type checking

## License

MIT