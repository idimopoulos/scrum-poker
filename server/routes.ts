import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRoomSchema, insertParticipantSchema, insertVoteSchema } from "@shared/schema";
import { setupWebSocket } from "./websocket";

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const DEFAULT_VOTING_SYSTEMS = {
  fibonacci: ['1', '2', '3', '5', '8', '13', '21', '34', '?'],
  modified_fibonacci: ['0', '1/2', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  powers_of_2: ['1', '2', '4', '8', '16', '32', '?'],
  linear: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?']
};

const DEFAULT_TIME_UNITS = {
  minutes: ['5', '10', '15', '30', '45', '60', '90', '120', '?'],
  hours: ['1', '2', '4', '6', '8', '12', '16', '20', '24', '32', '40', '?'],
  days: ['0.5', '1', '1.5', '2', '2.5', '3', '5', '?']
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Always return authenticated user (no auth required)
  app.get('/api/auth/user', async (req: any, res) => {
    const defaultUser = {
      id: 'anonymous-user',
      email: 'user@scrumpoker.app',
      firstName: 'Anonymous',
      lastName: 'User',
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    res.json(defaultUser);
  });

  // Create a new room
  app.post("/api/rooms", async (req, res) => {
    try {
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
        createdBy: 'anonymous-user'
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

      const participants = await storage.getParticipantsByRoom(req.params.id);
      const votes = await storage.getVotesByRoomAndRound(req.params.id, room.currentRound);
      const history = await storage.getVotingHistoryByRoom(req.params.id);

      res.json({
        room,
        participants,
        votes,
        history
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch room", error });
    }
  });

  // Update room
  app.patch("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.updateRoom(req.params.id, req.body);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data", error });
    }
  });

  // Join room endpoint
  app.post("/api/rooms/:id/join", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Check if participantId is provided for session persistence
      const existingParticipantId = req.body.participantId;
      
      if (existingParticipantId) {
        // Try to find existing participant
        const participants = await storage.getParticipantsByRoom(req.params.id);
        const existingParticipant = participants.find(p => p.id === existingParticipantId);
        
        if (existingParticipant) {
          // Participant exists, rehydrate the session
          return res.json({ participant: existingParticipant, room, rehydrated: true });
        }
        // Participant not found (server restart or removed), continue to create new one
      }

      // Create new participant
      const participantData = {
        id: `participant-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        name: req.body.name || "Anonymous",
        roomId: req.params.id,
        isCreator: req.body.isCreator || false
      };

      const validatedParticipant = insertParticipantSchema.parse(participantData);
      const participant = await storage.createParticipant(validatedParticipant);
      
      res.json({ participant, room, rehydrated: false });
    } catch (error) {
      res.status(400).json({ message: "Failed to join room", error });
    }
  });

  // Create participant
  app.post("/api/participants", async (req, res) => {
    try {
      const participantData = {
        id: `participant-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        name: req.body.name,
        roomId: req.body.roomId,
        isCreator: req.body.isCreator || false
      };

      const validatedParticipant = insertParticipantSchema.parse(participantData);
      const participant = await storage.createParticipant(validatedParticipant);
      
      res.json(participant);
    } catch (error) {
      res.status(400).json({ message: "Invalid participant data", error });
    }
  });

  // Remove participant
  app.delete("/api/participants/:id", async (req, res) => {
    try {
      await storage.removeParticipant(req.params.id);
      res.json({ message: "Participant removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove participant", error });
    }
  });

  // Submit vote (room-specific endpoint)
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
      res.status(400).json({ message: "Invalid vote data", error });
    }
  });

  // Submit vote (generic endpoint)
  app.post("/api/votes", async (req, res) => {
    try {
      const voteData = {
        roomId: req.body.roomId,
        participantId: req.body.participantId,
        round: req.body.round,
        storyPoints: req.body.storyPoints,
        timeEstimate: req.body.timeEstimate
      };

      const validatedVote = insertVoteSchema.parse(voteData);
      const vote = await storage.createOrUpdateVote(validatedVote);
      
      res.json(vote);
    } catch (error) {
      res.status(400).json({ message: "Invalid vote data", error });
    }
  });

  // Get voting history
  app.get("/api/rooms/:id/history", async (req, res) => {
    try {
      const history = await storage.getVotingHistoryByRoom(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch voting history", error });
    }
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  
  return httpServer;
}