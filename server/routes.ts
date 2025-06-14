import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertRoomSchema, insertParticipantSchema, insertVoteSchema } from "@shared/schema";
import { setupWebSocket } from "./websocket";

function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const DEFAULT_VOTING_SYSTEMS = {
  fibonacci: ['1', '2', '3', '5', '8', '13', '21', '?'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  custom: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?']
};

const DEFAULT_TIME_UNITS = {
  hours: ['1', '2', '4', '8', '12', '16', '20', '24', '32', '40', '?'],
  days: ['0.5', '1', '1.5', '2', '2.5', '3', '5', '?']
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit OAuth authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create a new room
  app.post("/api/rooms", async (req, res) => {
    try {
      // Check if user is authenticated
      const userId = req.isAuthenticated() ? (req.user as any)?.claims?.sub : null;
      
      const roomData = {
        id: generateRoomId(),
        name: req.body.name || "Planning Session",
        votingSystem: req.body.votingSystem || "fibonacci",
        timeUnits: req.body.timeUnits || "hours",
        dualVoting: req.body.dualVoting ?? true,
        autoReveal: req.body.autoReveal ?? false,
        storyPointValues: req.body.storyPointValues || DEFAULT_VOTING_SYSTEMS[req.body.votingSystem as keyof typeof DEFAULT_VOTING_SYSTEMS] || DEFAULT_VOTING_SYSTEMS.fibonacci,
        timeValues: req.body.timeValues || DEFAULT_TIME_UNITS[req.body.timeUnits as keyof typeof DEFAULT_TIME_UNITS] || DEFAULT_TIME_UNITS.hours,
        currentRound: 1,
        currentDescription: "",
        isRevealed: false,
        createdBy: userId
      };

      const validatedRoom = insertRoomSchema.parse(roomData);
      const room = await storage.createRoom(validatedRoom);
      
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Invalid room data", error });
    }
  });

  // Get room details
  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const participants = await storage.getParticipantsByRoom(room.id);
      const votes = await storage.getVotesByRoomAndRound(room.id, room.currentRound);
      const history = await storage.getVotingHistoryByRoom(room.id);

      res.json({
        room,
        participants,
        votes,
        history
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get room", error });
    }
  });

  // Join a room
  app.post("/api/rooms/:id/join", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Check if this is the first participant (room creator)
      const existingParticipants = await storage.getParticipantsByRoom(req.params.id);
      const isCreator = existingParticipants.length === 0;

      const participantData = {
        roomId: req.params.id,
        name: req.body.name,
        isCreator
      };

      const validatedParticipant = insertParticipantSchema.parse(participantData);
      const participant = await storage.createParticipant(validatedParticipant);
      
      res.json(participant);
    } catch (error) {
      res.status(400).json({ message: "Failed to join room", error });
    }
  });

  // Submit a vote
  app.post("/api/rooms/:id/vote", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const voteData = {
        roomId: req.params.id,
        participantId: req.body.participantId,
        round: room.currentRound,
        storyPoints: req.body.storyPoints,
        timeEstimate: req.body.timeEstimate
      };

      const validatedVote = insertVoteSchema.parse(voteData);
      const vote = await storage.createOrUpdateVote(validatedVote);
      
      res.json(vote);
    } catch (error) {
      res.status(400).json({ message: "Failed to submit vote", error });
    }
  });

  // Reveal votes
  app.post("/api/rooms/:id/reveal", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const updatedRoom = await storage.updateRoom(req.params.id, { isRevealed: true });
      res.json(updatedRoom);
    } catch (error) {
      res.status(500).json({ message: "Failed to reveal votes", error });
    }
  });

  // Move to next round
  app.post("/api/rooms/:id/next-round", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Save current round to history if votes exist
      const votes = await storage.getVotesByRoomAndRound(room.id, room.currentRound);
      if (votes.length > 0 && room.isRevealed) {
        const storyPointVotes = votes.filter(v => v.storyPoints).map(v => v.storyPoints!);
        const timeVotes = votes.filter(v => v.timeEstimate).map(v => v.timeEstimate!);

        const historyData = {
          roomId: room.id,
          round: room.currentRound,
          description: req.body.description || room.currentDescription || "",
          storyPointsConsensus: storyPointVotes.length > 0 ? getMostCommon(storyPointVotes) : null,
          timeEstimateConsensus: timeVotes.length > 0 ? getMostCommon(timeVotes) : null,
          storyPointsAvg: storyPointVotes.length > 0 ? calculateAverage(storyPointVotes) : null,
          storyPointsMin: storyPointVotes.length > 0 ? Math.min(...storyPointVotes.map(parseVoteValue)).toString() : null,
          storyPointsMax: storyPointVotes.length > 0 ? Math.max(...storyPointVotes.map(parseVoteValue)).toString() : null,
          timeEstimateAvg: timeVotes.length > 0 ? calculateAverage(timeVotes) : null,
          timeEstimateMin: timeVotes.length > 0 ? Math.min(...timeVotes.map(parseVoteValue)).toString() : null,
          timeEstimateMax: timeVotes.length > 0 ? Math.max(...timeVotes.map(parseVoteValue)).toString() : null,
        };

        await storage.createVotingHistory(historyData);
      }

      // Move to next round
      const updatedRoom = await storage.updateRoom(req.params.id, {
        currentRound: room.currentRound + 1,
        currentDescription: req.body.description || "",
        isRevealed: false
      });

      res.json(updatedRoom);
    } catch (error) {
      res.status(500).json({ message: "Failed to move to next round", error });
    }
  });

  // Update room settings
  app.patch("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const updates: Partial<typeof room> = {};
      
      if (req.body.votingSystem && DEFAULT_VOTING_SYSTEMS[req.body.votingSystem as keyof typeof DEFAULT_VOTING_SYSTEMS]) {
        updates.votingSystem = req.body.votingSystem;
        updates.storyPointValues = DEFAULT_VOTING_SYSTEMS[req.body.votingSystem as keyof typeof DEFAULT_VOTING_SYSTEMS];
      }
      
      if (req.body.timeUnits && DEFAULT_TIME_UNITS[req.body.timeUnits as keyof typeof DEFAULT_TIME_UNITS]) {
        updates.timeUnits = req.body.timeUnits;
        updates.timeValues = DEFAULT_TIME_UNITS[req.body.timeUnits as keyof typeof DEFAULT_TIME_UNITS];
      }
      
      if (typeof req.body.dualVoting === 'boolean') {
        updates.dualVoting = req.body.dualVoting;
      }
      
      if (typeof req.body.autoReveal === 'boolean') {
        updates.autoReveal = req.body.autoReveal;
      }
      
      if (req.body.currentDescription !== undefined) {
        updates.currentDescription = req.body.currentDescription;
      }

      const updatedRoom = await storage.updateRoom(req.params.id, updates);
      res.json(updatedRoom);
    } catch (error) {
      res.status(500).json({ message: "Failed to update room", error });
    }
  });

  // WebSocket test endpoint
  app.get("/api/ws-test", (req, res) => {
    res.json({ 
      message: "WebSocket server should be available at /api/ws",
      timestamp: new Date().toISOString()
    });
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  
  return httpServer;
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
