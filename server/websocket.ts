import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import { storage } from './storage';
import type { 
  WebSocketMessage, 
  JoinRoomMessage, 
  VoteMessage, 
  RevealVotesMessage, 
  NextRoundMessage,
  KickParticipantMessage,
  RoomUpdateMessage 
} from '@shared/schema';

interface ClientConnection {
  ws: any;
  roomId?: string;
  participantId?: string;
}

const clients = new Map<string, ClientConnection>();
const roomClients = new Map<string, Set<string>>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  console.log('WebSocket server initialized on path /ws');

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    clients.set(clientId, { ws });

    console.log(`Client ${clientId} connected from ${req.socket.remoteAddress}`);

    ws.on('message', async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        await handleMessage(clientId, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' }
        }));
      }
    });

    ws.on('close', () => {
      handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      handleDisconnect(clientId);
    });
  });
}

async function handleMessage(clientId: string, message: WebSocketMessage) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'join_room':
      await handleJoinRoom(clientId, message as JoinRoomMessage);
      break;
    
    case 'vote':
      await handleVote(clientId, message as VoteMessage);
      break;
    
    case 'reveal_votes':
      await handleRevealVotes(clientId, message as RevealVotesMessage);
      break;
    
    case 'next_round':
      await handleNextRound(clientId, message as NextRoundMessage);
      break;
    
    case 'kick_participant':
      await handleKickParticipant(clientId, message as KickParticipantMessage);
      break;
    
    default:
      console.warn(`Unknown message type: ${message.type}`);
  }
}

async function handleJoinRoom(clientId: string, message: JoinRoomMessage) {
  const { roomId, participantId } = message.payload;
  const client = clients.get(clientId);
  if (!client) return;

  // Verify room and participant exist
  const room = await storage.getRoom(roomId);
  const participant = await storage.getParticipant(participantId);
  
  if (!room || !participant) {
    client.ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Room or participant not found' }
    }));
    return;
  }

  // Update client info
  client.roomId = roomId;
  client.participantId = participantId;

  // Add to room clients
  if (!roomClients.has(roomId)) {
    roomClients.set(roomId, new Set());
  }
  roomClients.get(roomId)!.add(clientId);

  // Send current room state to new client
  await broadcastRoomUpdate(roomId);
  
  console.log(`Client ${clientId} joined room ${roomId} as ${participant.name}`);
}

async function handleVote(clientId: string, message: VoteMessage) {
  const { roomId, participantId, storyPoints, timeEstimate } = message.payload;
  const client = clients.get(clientId);
  if (!client || client.roomId !== roomId || client.participantId !== participantId) {
    return;
  }

  const room = await storage.getRoom(roomId);
  if (!room) return;

  // Submit vote
  await storage.createOrUpdateVote({
    roomId,
    participantId,
    round: room.currentRound,
    storyPoints,
    timeEstimate
  });

  // Check if auto-reveal should trigger
  if (room.autoReveal) {
    const participants = await storage.getParticipantsByRoom(roomId);
    const votes = await storage.getVotesByRoomAndRound(roomId, room.currentRound);
    
    // Check if all participants have voted for both story points and time (if dual voting)
    const allVoted = participants.every((participant: any) => {
      const vote = votes.find((v: any) => v.participantId === participant.id);
      if (!vote) return false;
      
      if (room.dualVoting) {
        return vote.storyPoints !== null && vote.storyPoints !== undefined &&
               vote.timeEstimate !== null && vote.timeEstimate !== undefined;
      } else {
        return vote.storyPoints !== null && vote.storyPoints !== undefined;
      }
    });

    if (allVoted && !room.isRevealed) {
      await storage.updateRoom(roomId, { isRevealed: true });
      
      // Save voting history when auto-revealing
      const existingHistory = await storage.getVotingHistoryByRoom(roomId);
      const roundExists = existingHistory.some(h => h.round === room.currentRound);
      
      if (!roundExists) {
        const storyPointVotes = votes.filter((v: any) => v.storyPoints).map((v: any) => v.storyPoints!);
        const timeVotes = votes.filter((v: any) => v.timeEstimate).map((v: any) => v.timeEstimate!);

        const historyEntry = await storage.createVotingHistory({
          roomId,
          round: room.currentRound,
          description: room.currentDescription || `Round ${room.currentRound}`,
          storyPointsConsensus: storyPointVotes.length > 0 ? getMostCommon(storyPointVotes) : null,
          timeEstimateConsensus: timeVotes.length > 0 ? getMostCommon(timeVotes) : null,
          storyPointsAvg: storyPointVotes.length > 0 ? calculateAverage(storyPointVotes) : null,
          storyPointsMin: storyPointVotes.length > 0 ? Math.min(...storyPointVotes.map(parseVoteValue)).toString() : null,
          storyPointsMax: storyPointVotes.length > 0 ? Math.max(...storyPointVotes.map(parseVoteValue)).toString() : null,
          timeEstimateAvg: timeVotes.length > 0 ? calculateAverage(timeVotes) : null,
          timeEstimateMin: timeVotes.length > 0 ? Math.min(...timeVotes.map(parseVoteValue)).toString() : null,
          timeEstimateMax: timeVotes.length > 0 ? Math.max(...timeVotes.map(parseVoteValue)).toString() : null,
        });
        console.log(`Voting history saved for room ${roomId}, round ${room.currentRound}:`, historyEntry);
      }
    }
  }

  await broadcastRoomUpdate(roomId);
}

async function handleRevealVotes(clientId: string, message: RevealVotesMessage) {
  const { roomId } = message.payload;
  const client = clients.get(clientId);
  if (!client || client.roomId !== roomId) return;

  const room = await storage.getRoom(roomId);
  if (!room) return;

  // Update room to revealed state
  await storage.updateRoom(roomId, { isRevealed: true });

  // Save voting history immediately when votes are revealed
  const votes = await storage.getVotesByRoomAndRound(roomId, room.currentRound);
  if (votes.length > 0) {
    // Check if history for this round already exists
    const existingHistory = await storage.getVotingHistoryByRoom(roomId);
    const roundExists = existingHistory.some(h => h.round === room.currentRound);
    
    if (!roundExists) {
      const storyPointVotes = votes.filter((v: any) => v.storyPoints).map((v: any) => v.storyPoints!);
      const timeVotes = votes.filter((v: any) => v.timeEstimate).map((v: any) => v.timeEstimate!);

      const historyEntry = await storage.createVotingHistory({
        roomId,
        round: room.currentRound,
        description: room.currentDescription || `Round ${room.currentRound}`,
        storyPointsConsensus: storyPointVotes.length > 0 ? getMostCommon(storyPointVotes) : null,
        timeEstimateConsensus: timeVotes.length > 0 ? getMostCommon(timeVotes) : null,
        storyPointsAvg: storyPointVotes.length > 0 ? calculateAverage(storyPointVotes) : null,
        storyPointsMin: storyPointVotes.length > 0 ? Math.min(...storyPointVotes.map(parseVoteValue)).toString() : null,
        storyPointsMax: storyPointVotes.length > 0 ? Math.max(...storyPointVotes.map(parseVoteValue)).toString() : null,
        timeEstimateAvg: timeVotes.length > 0 ? calculateAverage(timeVotes) : null,
        timeEstimateMin: timeVotes.length > 0 ? Math.min(...timeVotes.map(parseVoteValue)).toString() : null,
        timeEstimateMax: timeVotes.length > 0 ? Math.max(...timeVotes.map(parseVoteValue)).toString() : null,
      });
      console.log(`Manual reveal - Voting history saved for room ${roomId}, round ${room.currentRound}:`, historyEntry);
    }
  }

  await broadcastRoomUpdate(roomId);
}

async function handleNextRound(clientId: string, message: NextRoundMessage) {
  const { roomId, description } = message.payload;
  const client = clients.get(clientId);
  if (!client || client.roomId !== roomId) return;

  const room = await storage.getRoom(roomId);
  if (!room) return;

  // Save current round to history if votes exist and revealed
  const votes = await storage.getVotesByRoomAndRound(roomId, room.currentRound);
  if (votes.length > 0 && room.isRevealed) {
    const storyPointVotes = votes.filter((v: any) => v.storyPoints).map((v: any) => v.storyPoints!);
    const timeVotes = votes.filter((v: any) => v.timeEstimate).map((v: any) => v.timeEstimate!);

    await storage.createVotingHistory({
      roomId,
      round: room.currentRound,
      description: room.currentDescription || "",
      storyPointsConsensus: storyPointVotes.length > 0 ? getMostCommon(storyPointVotes) : null,
      timeEstimateConsensus: timeVotes.length > 0 ? getMostCommon(timeVotes) : null,
      storyPointsAvg: storyPointVotes.length > 0 ? calculateAverage(storyPointVotes) : null,
      storyPointsMin: storyPointVotes.length > 0 ? Math.min(...storyPointVotes.map(parseVoteValue)).toString() : null,
      storyPointsMax: storyPointVotes.length > 0 ? Math.max(...storyPointVotes.map(parseVoteValue)).toString() : null,
      timeEstimateAvg: timeVotes.length > 0 ? calculateAverage(timeVotes) : null,
      timeEstimateMin: timeVotes.length > 0 ? Math.min(...timeVotes.map(parseVoteValue)).toString() : null,
      timeEstimateMax: timeVotes.length > 0 ? Math.max(...timeVotes.map(parseVoteValue)).toString() : null,
    });
  }

  // Move to next round
  await storage.updateRoom(roomId, {
    currentRound: room.currentRound + 1,
    currentDescription: description || "",
    isRevealed: false
  });

  await broadcastRoomUpdate(roomId);
}

async function broadcastRoomUpdate(roomId: string) {
  const room = await storage.getRoom(roomId);
  if (!room) return;

  const participants = await storage.getParticipantsByRoom(roomId);
  const votes = await storage.getVotesByRoomAndRound(roomId, room.currentRound);
  const history = await storage.getVotingHistoryByRoom(roomId);

  const updateMessage: RoomUpdateMessage = {
    type: 'room_update',
    payload: {
      room,
      participants,
      votes,
      history
    }
  };

  const roomClientIds = roomClients.get(roomId);
  if (!roomClientIds) return;

  const message = JSON.stringify(updateMessage);
  
  roomClientIds.forEach(clientId => {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === 1) { // WebSocket.OPEN
      client.ws.send(message);
    }
  });
}

function handleDisconnect(clientId: string) {
  const client = clients.get(clientId);
  if (client && client.roomId) {
    const roomClientIds = roomClients.get(client.roomId);
    if (roomClientIds) {
      roomClientIds.delete(clientId);
      if (roomClientIds.size === 0) {
        roomClients.delete(client.roomId);
      }
    }
  }
  
  clients.delete(clientId);
  console.log(`Client ${clientId} disconnected`);
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getMostCommon(votes: string[]): string {
  const counts: Record<string, number> = {};
  votes.forEach(vote => {
    counts[vote] = (counts[vote] || 0) + 1;
  });
  
  return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
}

function parseVoteValue(value: string): number {
  if (value === '?') {
    return 0; // Unknown values
  }
  
  // Handle T-shirt sizes with numeric mapping
  const tshirtMap: Record<string, number> = {
    'XS': 1,
    'S': 2,
    'M': 3,
    'L': 4,
    'XL': 5,
    'XXL': 6
  };
  
  if (tshirtMap[value]) {
    return tshirtMap[value];
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function calculateAverage(votes: string[]): string {
  const numericVotes = votes.map(parseVoteValue).filter(v => v > 0);
  if (numericVotes.length === 0) return "0";
  
  const avg = numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length;
  return avg.toFixed(1);
}
