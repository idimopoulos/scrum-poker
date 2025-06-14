import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  votingSystem: text("voting_system").notNull().default("fibonacci"),
  timeUnits: text("time_units").notNull().default("hours"),
  dualVoting: boolean("dual_voting").notNull().default(true),
  autoReveal: boolean("auto_reveal").notNull().default(false),
  storyPointValues: jsonb("story_point_values").$type<string[]>().notNull(),
  timeValues: jsonb("time_values").$type<string[]>().notNull(),
  currentRound: integer("current_round").notNull().default(1),
  currentDescription: text("current_description").default(""),
  isRevealed: boolean("is_revealed").notNull().default(false),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isCreator: boolean("is_creator").notNull().default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  participantId: text("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  storyPoints: text("story_points"),
  timeEstimate: text("time_estimate"),
  votedAt: timestamp("voted_at").defaultNow().notNull(),
});

export const votingHistory = pgTable("voting_history", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  description: text("description").default(""),
  storyPointsConsensus: text("story_points_consensus"),
  timeEstimateConsensus: text("time_estimate_consensus"),
  storyPointsAvg: text("story_points_avg"),
  storyPointsMin: text("story_points_min"),
  storyPointsMax: text("story_points_max"),
  timeEstimateAvg: text("time_estimate_avg"),
  timeEstimateMin: text("time_estimate_min"),
  timeEstimateMax: text("time_estimate_max"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  createdAt: true,
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  joinedAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  votedAt: true,
});

export const insertVotingHistorySchema = createInsertSchema(votingHistory).omit({
  id: true,
  completedAt: true,
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type VotingHistory = typeof votingHistory.$inferSelect;
export type InsertVotingHistory = z.infer<typeof insertVotingHistorySchema>;

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload: any;
}

export interface JoinRoomMessage extends WebSocketMessage {
  type: 'join_room';
  payload: {
    roomId: string;
    participantId: string;
  };
}

export interface VoteMessage extends WebSocketMessage {
  type: 'vote';
  payload: {
    roomId: string;
    participantId: string;
    storyPoints?: string;
    timeEstimate?: string;
  };
}

export interface RevealVotesMessage extends WebSocketMessage {
  type: 'reveal_votes';
  payload: {
    roomId: string;
  };
}

export interface NextRoundMessage extends WebSocketMessage {
  type: 'next_round';
  payload: {
    roomId: string;
    description?: string;
  };
}

export interface RoomUpdateMessage extends WebSocketMessage {
  type: 'room_update';
  payload: {
    room: Room;
    participants: Participant[];
    votes: Vote[];
    history: VotingHistory[];
  };
}
