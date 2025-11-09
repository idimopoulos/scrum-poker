# replit.md

## Overview

This is a real-time Scrum Poker web application built for agile teams to collaboratively estimate story points and time requirements. The application features dual voting modes, customizable voting systems, real-time WebSocket communication, and comprehensive voting statistics and history tracking.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket client with fallback to HTTP polling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Real-time**: WebSocket server using 'ws' library
- **Storage**: In-memory storage implementation (MemStorage class)
- **API**: RESTful endpoints with WebSocket integration

### Build and Deployment
- **Development**: Vite dev server with HMR
- **Production**: Docker containerization with nginx reverse proxy
- **Build Process**: TypeScript compilation with esbuild bundling

## Key Components

### Storage Layer
- **Interface**: IStorage defining CRUD operations for users, rooms, participants, votes, and voting history
- **Implementation**: MemStorage class providing in-memory data persistence
- **Data Models**: Strongly typed schemas using Drizzle ORM types and Zod validation

### WebSocket Communication
- **Server**: WebSocket server handling real-time room updates, voting, and participant management
- **Client**: WebSocketClient class with automatic reconnection and fallback mechanisms
- **Message Types**: Structured message protocol for join, vote, reveal, and room update events

### Authentication
- **Simplified Auth**: No login required - uses name-based participation
- **User Management**: Anonymous user creation with basic profile information
- **Room Creation**: Open room creation without authentication restrictions

### Voting System
- **Dual Voting**: Simultaneous story point and time estimation
- **Voting Systems**: Fibonacci, T-shirt sizes, powers of 2, linear, and custom values
- **Time Units**: Minutes, hours, and days with configurable value sets
- **Statistics**: Real-time calculation of averages, min/max values, and participation rates

### Session Persistence
- **localStorage Integration**: Participant identity persists across browser sessions using localStorage
- **Automatic Rehydration**: When returning to a room, participants are automatically reconnected with their existing identity
- **Duplicate Prevention**: Page refreshes and browser close/reopen scenarios do not create duplicate participants
- **Server Restart Handling**: If the server restarts and in-memory data is cleared, new participants are created seamlessly
- **Kick Handling**: When a participant is kicked, their localStorage is preserved until they explicitly rejoin, allowing recovery from accidental kicks

## Data Flow

1. **Room Creation**: User creates room with voting configuration → Server generates unique room ID → Room stored in memory
2. **Participant Joining**: User joins with name → WebSocket connection established → Participant added to room
3. **Voting Process**: Participants submit votes → Real-time updates to all clients → Statistics calculated
4. **Vote Revelation**: Room creator reveals votes → Results broadcast to all participants → History recorded
5. **Round Management**: Room creator starts new round → Previous round archived → Voting state reset

## External Dependencies

### Runtime Dependencies
- **Express.js**: Web framework for API and static serving
- **ws**: WebSocket library for real-time communication
- **React/React DOM**: Frontend framework and rendering
- **TanStack Query**: Server state management
- **Radix UI**: Headless component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Zod**: Runtime type validation
- **class-variance-authority**: Component variant styling

### Development Dependencies
- **Vite**: Build tool and development server
- **TypeScript**: Type checking and compilation
- **esbuild**: Fast JavaScript bundler
- **Drizzle ORM**: Database schema and type generation
- **PostCSS/Autoprefixer**: CSS processing

## Deployment Strategy

### Development
- Local development using `npm run dev`
- Vite development server with hot module replacement
- TypeScript checking with `npm run check`

### Production
- Docker containerization with multi-stage builds
- Single container deployment with in-memory storage
- nginx reverse proxy for WebSocket and HTTP traffic
- Health checks and restart policies configured

### Infrastructure Requirements
- **Minimum**: Single Docker container (512MB RAM, 1 CPU core)
- **Networking**: HTTP/HTTPS ports (80/443) and WebSocket support
- **SSL**: Configured through nginx for secure WebSocket connections
- **Domain**: Custom domain support with proper SSL certificates

### Scalability Considerations
- Current architecture uses in-memory storage (single instance)
- WebSocket connections tied to specific server instance
- Future scaling would require database integration and session persistence
- Load balancing would need sticky sessions for WebSocket connections

## Changelog

```
Changelog:
- November 09, 2025. Implemented session persistence with localStorage to prevent duplicate participants on page refresh and browser reopen
- July 08, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```