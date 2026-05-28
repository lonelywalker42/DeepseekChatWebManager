export type TopicType = 'idea-discussion' | 'code-generation' | 'knowledge-qa' | 'other';
export type TopicStatus = 'active' | 'completed' | 'archived';
export type MessageRole = 'user' | 'assistant' | 'system' | 'thinking';

export interface Topic {
  id: string;
  title: string;
  type: TopicType;
  status: TopicStatus;
  tags: string[];
  progressSummary: string;
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  id: string;
  topicId: string;
  title: string;
  sourceUrl: string;
  parentSessionId?: string;
  summary?: string;
  createdAt: number;
  messages: Message[];
  continuationPrompt?: string;
}

export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: number;
}

export interface ScrapedSessionData {
  title: string;
  sourceUrl: string;
  messages: Message[];
}
