import { 
  rooms, participants, votes, votingHistory,
  type Room, type InsertRoom,
  type Participant, type InsertParticipant,
  type Vote, type InsertVote,
  type VotingHistory, type InsertVotingHistory
} from "@shared/schema";

export interface IStorage {
  // Room operations
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(id: string): Promise<Room | undefined>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined>;
  
  // Participant operations
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipantsByRoom(roomId: string): Promise<Participant[]>;
  getParticipant(id: string): Promise<Participant | undefined>;
  removeParticipant(id: string): Promise<void>;
  
  // Vote operations
  createOrUpdateVote(vote: InsertVote): Promise<Vote>;
  getVotesByRoomAndRound(roomId: string, round: number): Promise<Vote[]>;
  getVoteByParticipantAndRound(participantId: string, round: number): Promise<Vote | undefined>;
  
  // Voting history operations
  createVotingHistory(history: InsertVotingHistory): Promise<VotingHistory>;
  getVotingHistoryByRoom(roomId: string): Promise<VotingHistory[]>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, Room> = new Map();
  private participants: Map<string, Participant> = new Map();
  private votes: Map<number, Vote> = new Map();
  private votingHistory: Map<number, VotingHistory> = new Map();
  private currentVoteId = 1;
  private currentHistoryId = 1;

  // Room operations
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = {
      id: insertRoom.id!,
      name: insertRoom.name!,
      votingSystem: insertRoom.votingSystem || "fibonacci",
      timeUnits: insertRoom.timeUnits || "hours",
      dualVoting: insertRoom.dualVoting ?? true,
      autoReveal: insertRoom.autoReveal ?? false,
      storyPointValues: [...(insertRoom.storyPointValues || [])],
      timeValues: [...(insertRoom.timeValues || [])],
      currentRound: insertRoom.currentRound || 1,
      currentDescription: insertRoom.currentDescription || null,
      isRevealed: insertRoom.isRevealed ?? false,
      createdAt: new Date(),
    };
    this.rooms.set(room.id, room);
    return room;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  // Participant operations
  async createParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const id = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const participant: Participant = {
      id,
      roomId: insertParticipant.roomId!,
      name: insertParticipant.name!,
      isCreator: insertParticipant.isCreator ?? false,
      joinedAt: new Date(),
    };
    this.participants.set(id, participant);
    return participant;
  }

  async getParticipantsByRoom(roomId: string): Promise<Participant[]> {
    return Array.from(this.participants.values()).filter(p => p.roomId === roomId);
  }

  async getParticipant(id: string): Promise<Participant | undefined> {
    return this.participants.get(id);
  }

  async removeParticipant(id: string): Promise<void> {
    this.participants.delete(id);
    // Also remove their votes
    const votesToRemove = Array.from(this.votes.entries())
      .filter(([_, vote]) => vote.participantId === id)
      .map(([id]) => id);
    
    votesToRemove.forEach(voteId => this.votes.delete(voteId));
  }

  // Vote operations
  async createOrUpdateVote(insertVote: InsertVote): Promise<Vote> {
    // Check if vote already exists for this participant and round
    const existingVote = Array.from(this.votes.values())
      .find(v => v.participantId === insertVote.participantId! && v.round === insertVote.round!);

    if (existingVote) {
      // Update existing vote
      const updatedVote: Vote = {
        ...existingVote,
        storyPoints: insertVote.storyPoints ?? existingVote.storyPoints,
        timeEstimate: insertVote.timeEstimate ?? existingVote.timeEstimate,
        votedAt: new Date(),
      };
      this.votes.set(existingVote.id, updatedVote);
      return updatedVote;
    } else {
      // Create new vote
      const id = this.currentVoteId++;
      const vote: Vote = {
        id,
        roomId: insertVote.roomId,
        participantId: insertVote.participantId,
        round: insertVote.round,
        storyPoints: insertVote.storyPoints ?? null,
        timeEstimate: insertVote.timeEstimate ?? null,
        votedAt: new Date(),
      };
      this.votes.set(id, vote);
      return vote;
    }
  }

  async getVotesByRoomAndRound(roomId: string, round: number): Promise<Vote[]> {
    return Array.from(this.votes.values())
      .filter(v => v.roomId === roomId && v.round === round);
  }

  async getVoteByParticipantAndRound(participantId: string, round: number): Promise<Vote | undefined> {
    return Array.from(this.votes.values())
      .find(v => v.participantId === participantId && v.round === round);
  }

  // Voting history operations
  async createVotingHistory(insertHistory: InsertVotingHistory): Promise<VotingHistory> {
    const id = this.currentHistoryId++;
    const history: VotingHistory = {
      id,
      roomId: insertHistory.roomId,
      round: insertHistory.round,
      description: insertHistory.description ?? null,
      storyPointsConsensus: insertHistory.storyPointsConsensus ?? null,
      timeEstimateConsensus: insertHistory.timeEstimateConsensus ?? null,
      storyPointsAvg: insertHistory.storyPointsAvg ?? null,
      storyPointsMin: insertHistory.storyPointsMin ?? null,
      storyPointsMax: insertHistory.storyPointsMax ?? null,
      timeEstimateAvg: insertHistory.timeEstimateAvg ?? null,
      timeEstimateMin: insertHistory.timeEstimateMin ?? null,
      timeEstimateMax: insertHistory.timeEstimateMax ?? null,
      completedAt: new Date(),
    };
    this.votingHistory.set(id, history);
    return history;
  }

  async getVotingHistoryByRoom(roomId: string): Promise<VotingHistory[]> {
    return Array.from(this.votingHistory.values())
      .filter(h => h.roomId === roomId)
      .sort((a, b) => b.round - a.round); // Most recent first
  }
}

export const storage = new MemStorage();
