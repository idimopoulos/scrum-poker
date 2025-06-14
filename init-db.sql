-- Initialize database tables for Scrum Poker application
CREATE TABLE IF NOT EXISTS sessions (
  sid varchar PRIMARY KEY,
  sess jsonb NOT NULL,
  expire timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY NOT NULL,
  email varchar UNIQUE,
  first_name varchar,
  last_name varchar,
  profile_image_url varchar,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  voting_system text NOT NULL DEFAULT 'fibonacci',
  time_units text NOT NULL DEFAULT 'hours',
  dual_voting boolean NOT NULL DEFAULT true,
  auto_reveal boolean NOT NULL DEFAULT false,
  story_point_values jsonb NOT NULL,
  time_values jsonb NOT NULL,
  current_round integer NOT NULL DEFAULT 1,
  current_description text DEFAULT '',
  is_revealed boolean NOT NULL DEFAULT false,
  created_by varchar,
  created_at timestamp DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_creator boolean NOT NULL DEFAULT false,
  joined_at timestamp DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id serial PRIMARY KEY,
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id text NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  round integer NOT NULL,
  story_points text,
  time_estimate text,
  voted_at timestamp DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS voting_history (
  id serial PRIMARY KEY,
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round integer NOT NULL,
  description text,
  story_points_consensus text,
  time_estimate_consensus text,
  story_points_avg text,
  story_points_min text,
  story_points_max text,
  time_estimate_avg text,
  time_estimate_min text,
  time_estimate_max text,
  completed_at timestamp DEFAULT NOW() NOT NULL
);