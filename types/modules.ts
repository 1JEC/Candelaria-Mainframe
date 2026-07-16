// ========== MODULE A: Social Publisher ==========

export interface ContentGenerationRequest {
  platforms: ("instagram" | "facebook" | "x")[];
  contentType: "post" | "carousel" | "story" | "reel" | "thread";
  tone: "professional" | "casual" | "inspirational";
  topic?: string;
  imageDescriptions?: string[];
}

export interface ContentGenerationResult {
  versions: {
    platform: string;
    caption: string;
    hashtags: string[];
    callToAction?: string;
  }[];
  mediaUploadUrls?: string[];
}

export interface PublicationSchedule {
  postId: string;
  platforms: string[];
  scheduledFor: Date;
  autoPublish: boolean;
}

// ========== MODULE B: Website Intake ==========

export interface IntakeFormPayload {
  formType: "request" | "quote" | "scan";
  email: string;
  name: string;
  company?: string;
  website?: string;
  phone?: string;
  message?: string;
  honeypot?: string;
}

export interface IntakeProcessResult {
  success: boolean;
  leadId?: string;
  notificationSent: boolean;
  message: string;
}

// ========== MODULE C: Mailbox ==========

export interface EmailTriageResult {
  category: "new_request" | "customer" | "invoice" | "spam" | "other";
  priority: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
}

export interface EmailDraftRequest {
  emailId: string;
  includeContext: boolean;
}

export interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  status: "draft" | "pending_approval" | "sent";
  approvedAt?: Date;
}

// ========== MODULE D: Lead Engine ==========

export interface LeadQualificationRequest {
  name: string;
  company: string;
  website: string;
  email: string;
}

export interface LeadScore {
  total: number;
  breakdown: {
    websiteQuality: number;
    aiReadiness: number;
    sector: number;
    signals: number;
  };
  reasoning: string;
}

export interface ProspectingRequest {
  sector?: string;
  limit: number;
  excludeDomains?: string[];
}

export interface ProspectingResult {
  leads: {
    name: string;
    email: string;
    company: string;
    website: string;
    sourceMethod: string;
    score: number;
    outreachOptions: {
      callScript: string;
      emailSubject: string;
      emailBody: string;
      dmText: string;
    };
  }[];
}

// ========== MODULE E: Audit Log ==========

export interface AuditLogEntry {
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface DashboardStats {
  today: {
    newLeads: number;
    publishedPosts: number;
    inboundEmails: number;
    agentRuns: number;
  };
  thisWeek: {
    engagementRate: number;
    leadsQualified: number;
    outreachSent: number;
  };
  estCosts: {
    aiTokens: number;
    integrations: number;
  };
}
