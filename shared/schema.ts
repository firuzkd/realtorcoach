import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  streak: integer("streak").default(0),
  totalSessions: integer("total_sessions").default(0),
  averageScore: integer("average_score").default(0),
  discProfile: json("disc_profile").$type<{
    dominance: number;
    influence: number;
    steadiness: number;
    conscientiousness: number;
    primaryStyle: string;
    secondaryStyle?: string;
    adaptedStyle?: string;
    naturalStyle?: string;
    communicationTips: string[];
    strengths: string[];
    challenges: string[];
    workingStyle: string;
    motivators: string[];
    stressors: string[];
    idealEnvironment: string;
    coachingRecommendations: string[];
    lastAssessment: string;
    confidenceLevel: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(), // "chat" | "voice"
  scenario: text("scenario").notNull(),
  score: integer("score").notNull(),
  confidence: integer("confidence"),
  clarity: integer("clarity"),
  value: integer("value"),
  cta: integer("cta"),
  energy: integer("energy"),
  pace: text("pace"),
  fillerWords: integer("filler_words"),
  transcript: text("transcript"),
  feedback: text("feedback"),
  suggestions: json("suggestions").$type<string[]>(),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id),
  content: text("content").notNull(),
  isAgent: boolean("is_agent").notNull(),
  feedback: json("feedback").$type<{
    confidence: number;
    clarity: number;
    grammar?: number;
    value: number;
    cta: number;
    suggestions: string[];
    detailed_feedback?: {
      confidence: string;
      clarity: string;
      grammar?: string;
      value: string;
      cta: string;
    };
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  scenario: text("scenario").notNull(),
  difficulty: text("difficulty").notNull(), // "easy" | "medium" | "hard"
  category: text("category").notNull(), // "objection" | "inquiry" | "negotiation"
  expectedResponse: text("expected_response"),
  isActive: boolean("is_active").default(true),
});

export const userChallenges = pgTable("user_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  challengeId: integer("challenge_id").references(() => challenges.id),
  completed: boolean("completed").default(false),
  score: integer("score"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const discAssessments = pgTable("disc_assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  assessmentType: text("assessment_type").notNull(), // "initial" | "behavioral" | "session_based"
  responses: json("responses").$type<{
    questionId: string;
    selectedOptions: string[];
    intensity: number;
  }[]>(),
  results: json("results").$type<{
    dominance: number;
    influence: number;
    steadiness: number;
    conscientiousness: number;
    primaryStyle: string;
    secondaryStyle?: string;
    naturalVsAdapted: {
      natural: { D: number; I: number; S: number; C: number };
      adapted: { D: number; I: number; S: number; C: number };
    };
    detailedAnalysis: {
      communicationStyle: string;
      decisionMaking: string;
      stressResponse: string;
      motivationFactors: string[];
      potentialBlindSpots: string[];
    };
  }>(),
  completedAt: timestamp("completed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const callInsights = pgTable("call_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  callSid: text("call_sid").notNull(),
  sessionId: integer("session_id").references(() => sessions.id),
  scenario: text("scenario").notNull(),
  clientName: text("client_name").notNull(),
  clientType: text("client_type").notNull(),
  difficulty: text("difficulty").notNull(),
  personality: text("personality").notNull(),
  duration: integer("duration").notNull(), // in seconds
  transcript: text("transcript"),
  overallScore: integer("overall_score").notNull(), // 1-100
  metrics: json("metrics").$type<{
    confidence: number;
    clarity: number;
    persuasion: number;
    rapport: number;
    objectionHandling: number;
    closingTechnique: number;
    listeningSkills: number;
    empathy: number;
    adaptability: number;
    professionalism: number;
  }>(),
  aiAnalysis: json("ai_analysis").$type<{
    summary: string;
    keyStrengths: string[];
    criticalAreas: string[];
    specificFeedback: {
      opening: string;
      needsDiscovery: string;
      presentationSkills: string;
      objectionHandling: string;
      closing: string;
    };
    recommendations: string[];
    nextSteps: string[];
    discAlignment: string;
    emotionalIntelligence: string;
  }>(),
  strengths: text("strengths").array().notNull(),
  improvements: text("improvements").array().notNull(),
  keyMoments: json("key_moments").$type<{
    timestamp: number;
    type: 'strength' | 'improvement' | 'critical' | 'opportunity';
    description: string;
    impact: 'high' | 'medium' | 'low';
    suggestion?: string;
  }[]>(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
});

export const insertUserChallengeSchema = createInsertSchema(userChallenges).omit({
  id: true,
  createdAt: true,
});

export const insertDiscAssessmentSchema = createInsertSchema(discAssessments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertCallInsightSchema = createInsertSchema(callInsights).omit({
  id: true,
  completedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;
export type DiscAssessment = typeof discAssessments.$inferSelect;
export type InsertDiscAssessment = z.infer<typeof insertDiscAssessmentSchema>;
export type CallInsight = typeof callInsights.$inferSelect;
export type InsertCallInsight = z.infer<typeof insertCallInsightSchema>;
