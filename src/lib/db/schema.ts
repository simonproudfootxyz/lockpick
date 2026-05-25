import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable("account", {
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    guestSessionId: text("guest_session_id"),
    state: jsonb("state").notNull(),
    status: text("status").notNull().default("in_progress"),
    totalTurns: integer("total_turns").notNull().default(0),
    gameScore: integer("game_score").notNull().default(0),
    finalScore: integer("final_score"),
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { mode: "date" }),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("games_user_id_idx").on(table.userId),
    index("games_guest_session_id_idx").on(table.guestSessionId),
  ],
);

export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    displayName: text("display_name").notNull(),
    finalScore: integer("final_score").notNull(),
    durationMs: integer("duration_ms"),
    totalTurns: integer("total_turns").notNull(),
    submittedAt: timestamp("submitted_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("leaderboard_final_score_idx").on(table.finalScore),
    uniqueIndex("leaderboard_game_id_idx").on(table.gameId),
  ],
);

export type DbUser = typeof users.$inferSelect;
export type DbGame = typeof games.$inferSelect;
export type DbLeaderboardEntry = typeof leaderboardEntries.$inferSelect;
