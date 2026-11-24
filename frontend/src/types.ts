export interface EvidenceResponse {
  paperId?: string;
  paperTitle?: string;
  authors?: string;
  publicationYear?: number;
  sourcePassage: string;
  paperLink: string;
  retrievalScore?: number;
  evidenceStatus?: string;
  searchRank?: number;
  quote?: string;
  quoteLocation?: string;
  journal?: string;
  citedBy?: number;
  oaUrl?: string;
  topic?: string;
}

export interface ClaimResponse {
  text: string;
  type: string;
  citationCheckStatus?: string;
  evidence: EvidenceResponse[];
}

export interface TokenUsageDetails {
  systemPromptTokens: number;
  papersTokens: number;
  historyTokens: number;
  summaryTokens: number;
  userTokens: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  thinkingTokens?: number;
  totalTokens: number;
  details?: TokenUsageDetails;
}

export interface ChatResponse {
  answer: string;
  thought?: string;
  thinkingDuration?: number;
  claims: ClaimResponse[];
  usage?: TokenUsage;
  updatedSummary?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string;
  thinkingDuration?: number;
  usage?: TokenUsage;
  claims?: ClaimResponse[];
  timestamp: number;
  loading?: boolean;
  isStreaming?: boolean;
  error?: string;
  isRateLimited?: boolean;
  attachments?: MessageAttachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  summary?: string;
  updatedAt: number;
  isStarred?: boolean;
}

export interface AIModelInfo {
  id: string;
  name: string;
  provider: 'openrouter' | 'gemini';
  isFree?: boolean;
  contextLength?: number;
  description?: string;
}

export interface ModelsResponse {
  status: string;
  currentModel: string;
  defaultModel: string;
  openRouterConnected: boolean;
  openRouterModels: AIModelInfo[];
  geminiModels: AIModelInfo[];
}

export interface AppSettings {
  backendUrl: string;
  language: 'auto' | 'en' | 'ar';
  isDarkMode: boolean;
  useMockMode: boolean;
  provider?: 'openrouter' | 'gemini';
  selectedModel?: string;
  geminiModel?: string;
  openRouterModel?: string;
  customApiKey?: string;
  openRouterApiKey?: string;
  highContrastMode?: boolean;
  fontSize?: 'normal' | 'large' | 'x-large';
}
