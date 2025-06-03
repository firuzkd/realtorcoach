import { 
  users, sessions, messages, challenges, userChallenges, discAssessments, callInsights,
  type User, type InsertUser,
  type Session, type InsertSession,
  type Message, type InsertMessage,
  type Challenge, type InsertChallenge,
  type UserChallenge, type InsertUserChallenge,
  type DiscAssessment, type InsertDiscAssessment,
  type CallInsight, type InsertCallInsight
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  getUserSessions(userId: number): Promise<Session[]>;
  updateSession(id: number, updates: Partial<Session>): Promise<Session | undefined>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined>;
  getSessionMessages(sessionId: number): Promise<Message[]>;

  // Challenge operations
  getChallenges(): Promise<Challenge[]>;
  getActiveChallenge(): Promise<Challenge | undefined>;
  getDailyChallenge(userId: number): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  updateChallenge(id: number, updates: Partial<Challenge>): Promise<Challenge | undefined>;
  deleteChallenge(id: number): Promise<boolean>;

  // User challenge operations
  createUserChallenge(userChallenge: InsertUserChallenge): Promise<UserChallenge>;
  getUserChallengeProgress(userId: number): Promise<UserChallenge[]>;
  completeUserChallenge(userId: number, challengeId: number, score: number): Promise<UserChallenge | undefined>;

  // DISC Assessment operations
  createDiscAssessment(assessment: InsertDiscAssessment): Promise<DiscAssessment>;
  getUserDiscAssessments(userId: number): Promise<DiscAssessment[]>;
  getLatestDiscAssessment(userId: number): Promise<DiscAssessment | undefined>;
  updateUserDiscProfile(userId: number, profile: any): Promise<User | undefined>;

  // Call Insights operations
  createCallInsight(insight: InsertCallInsight): Promise<CallInsight>;
  getCallInsight(id: number): Promise<CallInsight | undefined>;
  getUserCallInsights(userId: number): Promise<CallInsight[]>;
  getCallInsightByCallSid(callSid: string): Promise<CallInsight | undefined>;
  updateCallInsight(id: number, updates: Partial<CallInsight>): Promise<CallInsight | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private sessions: Map<number, Session> = new Map();
  private messages: Map<number, Message> = new Map();
  private challenges: Map<number, Challenge> = new Map();
  private userChallenges: Map<number, UserChallenge> = new Map();
  private discAssessments: Map<number, DiscAssessment> = new Map();
  private callInsights: Map<number, CallInsight> = new Map();
  private currentId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed a default user
    const defaultUser: User = {
      id: 1,
      username: "demo_agent",
      name: "Jordan Smith",
      email: "jordan@example.com",
      streak: 7,
      totalSessions: 23,
      averageScore: 94,
      discProfile: {
        dominance: 70,
        influence: 60,
        steadiness: 40,
        conscientiousness: 30,
        primaryStyle: "D",
        secondaryStyle: "I",
        communicationTips: ["Be direct and concise", "Focus on results", "Provide options for decision-making"],
        strengths: ["Decisive", "Goal-oriented", "Problem solver"],
        challenges: ["May appear impatient", "Could overlook details", "Might not consider team feelings"],
        workingStyle: "Independent and fast-paced",
        motivators: ["Challenges", "Authority", "Results"],
        stressors: ["Micromanagement", "Slow processes", "Indecision"],
        idealEnvironment: "Autonomous role with clear goals",
        coachingRecommendations: ["Practice active listening", "Take time to explain reasoning", "Build rapport before business"],
        lastAssessment: new Date().toISOString(),
        confidenceLevel: 85
      },
      createdAt: new Date(),
    };
    this.users.set(1, defaultUser);

    // Seed some sample sessions for the demo user
    const sampleSessions: Session[] = [
      {
        id: 1,
        userId: 1,
        type: "chat",
        scenario: "Investor Price Objection",
        score: 89,
        confidence: 85,
        clarity: 92,
        value: 88,
        cta: 91,
        energy: null,
        pace: null,
        fillerWords: null,
        transcript: null,
        feedback: "Great job addressing the price concern with value propositions. Your confidence came through clearly.",
        suggestions: ["Consider mentioning specific ROI figures", "Add urgency to your closing"],
        duration: 420,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        id: 2,
        userId: 1,
        type: "voice",
        scenario: "First-Time Buyer Inquiry",
        score: 92,
        confidence: 88,
        clarity: 95,
        value: 90,
        cta: 94,
        energy: 87,
        pace: "good",
        fillerWords: 2,
        transcript: "Hi there! I completely understand that buying your first property can feel overwhelming. Let me walk you through why off-plan properties are actually perfect for first-time buyers like yourself...",
        feedback: "Excellent energy and clarity! Your explanation was thorough and reassuring for a nervous first-time buyer.",
        suggestions: ["Great pace and tone", "Consider adding specific payment plan examples"],
        duration: 85,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: 3,
        userId: 1,
        type: "chat",
        scenario: "Bulk Purchase Negotiation",
        score: 96,
        confidence: 93,
        clarity: 98,
        value: 95,
        cta: 97,
        energy: null,
        pace: null,
        fillerWords: null,
        transcript: null,
        feedback: "Outstanding performance! You balanced the bulk discount request perfectly while maintaining value perception.",
        suggestions: ["Perfect approach", "Consider this your benchmark performance"],
        duration: 680,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      }
    ];

    sampleSessions.forEach(session => {
      this.sessions.set(session.id, session);
    });

    // Seed some messages for the latest session
    const sampleMessages: Message[] = [
      {
        id: 1,
        sessionId: 3,
        content: "I'm looking to buy 5 units. What kind of bulk discount can you offer me on these off-plan properties?",
        isAgent: false,
        feedback: null,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
      {
        id: 2,
        sessionId: 3,
        content: "That's fantastic! I appreciate investors like yourself who recognize the value in building a substantial portfolio. For 5 units, I can offer you our exclusive investor package which includes priority unit selection, extended payment terms, and a 3% volume discount. Plus, you'll get first access to future phases. When would you like to visit the site to select your preferred units?",
        isAgent: true,
        feedback: {
          confidence: 93,
          clarity: 98,
          value: 95,
          cta: 97,
          suggestions: ["Perfect balance of incentives and value", "Strong assumptive close"]
        },
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000 + 30000),
      }
    ];

    sampleMessages.forEach(message => {
      this.messages.set(message.id, message);
    });

    // Update currentId to avoid conflicts
    this.currentId = 10;

    // Seed sample challenges
    const sampleChallenges: Challenge[] = [
      {
        id: 1,
        title: "Price Objection Handler",
        description: "Handle a client asking for a discount on off-plan properties",
        scenario: "Hi, I'm interested in your properties but the prices seem quite high for this area.",
        difficulty: "medium",
        category: "objection",
        expectedResponse: "Address value proposition and unique selling points",
        isActive: true,
      },
      {
        id: 2,
        title: "Off-Plan Inquiry",
        description: "Respond to a first-time buyer asking about off-plan benefits",
        scenario: "Hi, I saw your off-plan properties online. I'm new to property investment.",
        difficulty: "easy",
        category: "inquiry",
        expectedResponse: "Explain payment plans, capital appreciation, and customization benefits",
        isActive: true,
      },
      {
        id: 3,
        title: "Investor Negotiation",
        description: "Negotiate with an experienced investor looking for bulk deals",
        scenario: "Hello, I'm interested in purchasing multiple units from your development.",
        difficulty: "hard",
        category: "negotiation",
        expectedResponse: "Present volume benefits while maintaining value perception",
        isActive: true,
      },
      {
        id: 4,
        title: "Zoom appointment setting",
        description: "Convince hesitant client to schedule virtual property viewing",
        scenario: "Hi, I'm interested in your properties but I'm quite busy with work and travel.",
        difficulty: "medium",
        category: "inquiry",
        expectedResponse: "Build rapport and convince client that virtual tour provides better understanding than documents alone",
        isActive: true,
      },
    ];

    sampleChallenges.forEach(challenge => {
      this.challenges.set(challenge.id, challenge);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      ...insertUser,
      id,
      streak: 0,
      totalSessions: 0,
      averageScore: 0,
      discProfile: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Session operations
  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.currentId++;
    const session: Session = {
      ...insertSession,
      id,
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getUserSessions(userId: number): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updateSession(id: number, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentId++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, ...updates };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  async getSessionMessages(sessionId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }

  // Challenge operations
  async getChallenges(): Promise<Challenge[]> {
    return Array.from(this.challenges.values()).filter(challenge => challenge.isActive);
  }

  async getActiveChallenge(): Promise<Challenge | undefined> {
    const challenges = Array.from(this.challenges.values()).filter(challenge => challenge.isActive);
    return challenges[Math.floor(Math.random() * challenges.length)];
  }

  async getDailyChallenge(userId: number): Promise<Challenge | undefined> {
    // For simplicity, return a random challenge as daily challenge
    return this.getActiveChallenge();
  }

  // User challenge operations
  async createUserChallenge(insertUserChallenge: InsertUserChallenge): Promise<UserChallenge> {
    const id = this.currentId++;
    const userChallenge: UserChallenge = {
      ...insertUserChallenge,
      id,
      createdAt: new Date(),
    };
    this.userChallenges.set(id, userChallenge);
    return userChallenge;
  }

  async getUserChallengeProgress(userId: number): Promise<UserChallenge[]> {
    return Array.from(this.userChallenges.values())
      .filter(uc => uc.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async completeUserChallenge(userId: number, challengeId: number, score: number): Promise<UserChallenge | undefined> {
    const userChallenge = Array.from(this.userChallenges.values())
      .find(uc => uc.userId === userId && uc.challengeId === challengeId && !uc.completed);
    
    if (!userChallenge) return undefined;
    
    const updated: UserChallenge = {
      ...userChallenge,
      completed: true,
      score,
      completedAt: new Date(),
    };
    
    this.userChallenges.set(userChallenge.id, updated);
    return updated;
  }

  async createChallenge(insertChallenge: InsertChallenge): Promise<Challenge> {
    const id = this.currentId++;
    const challenge: Challenge = {
      ...insertChallenge,
      id,
    };
    this.challenges.set(id, challenge);
    return challenge;
  }

  async updateChallenge(id: number, updates: Partial<Challenge>): Promise<Challenge | undefined> {
    const challenge = this.challenges.get(id);
    if (!challenge) return undefined;
    
    const updatedChallenge = { ...challenge, ...updates };
    this.challenges.set(id, updatedChallenge);
    return updatedChallenge;
  }

  async deleteChallenge(id: number): Promise<boolean> {
    return this.challenges.delete(id);
  }

  // DISC Assessment operations
  async createDiscAssessment(insertAssessment: InsertDiscAssessment): Promise<DiscAssessment> {
    const assessment: DiscAssessment = {
      id: this.currentId++,
      userId: insertAssessment.userId || null,
      assessmentType: insertAssessment.assessmentType,
      responses: insertAssessment.responses || null,
      results: insertAssessment.results || null,
      completedAt: new Date(),
      createdAt: new Date(),
    };
    this.discAssessments.set(assessment.id, assessment);
    return assessment;
  }

  async getUserDiscAssessments(userId: number): Promise<DiscAssessment[]> {
    return Array.from(this.discAssessments.values())
      .filter(assessment => assessment.userId === userId)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));
  }

  async getLatestDiscAssessment(userId: number): Promise<DiscAssessment | undefined> {
    const assessments = await this.getUserDiscAssessments(userId);
    return assessments[0];
  }

  async updateUserDiscProfile(userId: number, profile: any): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      discProfile: profile
    };
    this.users.set(userId, updated);
    return updated;
  }

  // Call Insights operations
  async createCallInsight(insertCallInsight: InsertCallInsight): Promise<CallInsight> {
    const callInsight: CallInsight = {
      id: this.currentId++,
      ...insertCallInsight,
      completedAt: new Date()
    };
    this.callInsights.set(callInsight.id, callInsight);
    return callInsight;
  }

  async getCallInsight(id: number): Promise<CallInsight | undefined> {
    return this.callInsights.get(id);
  }

  async getUserCallInsights(userId: number): Promise<CallInsight[]> {
    return Array.from(this.callInsights.values())
      .filter(insight => insight.userId === userId)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  }

  async getCallInsightByCallSid(callSid: string): Promise<CallInsight | undefined> {
    return Array.from(this.callInsights.values())
      .find(insight => insight.callSid === callSid);
  }

  async updateCallInsight(id: number, updates: Partial<CallInsight>): Promise<CallInsight | undefined> {
    const existing = this.callInsights.get(id);
    if (!existing) return undefined;

    const updated: CallInsight = {
      ...existing,
      ...updates
    };
    this.callInsights.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
