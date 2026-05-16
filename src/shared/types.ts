export type EmotionState = 'idle' | 'thinking' | 'happy' | 'bored' | 'surprised';

/** Low-poly companion the user can pick in the overlay. */
export type CharacterId = 'crystal' | 'sparky' | 'jerry' | 'lily';

export const CHARACTER_IDS: CharacterId[] = ['crystal', 'sparky', 'jerry', 'lily'];

export const CHARACTER_LABELS: Record<CharacterId, string> = {
  crystal: 'Crystal',
  sparky: 'Pika',
  jerry: 'Jerry',
  lily: 'Lily'
};

export type Tone = 'neutral' | 'friendly' | 'helpful' | 'sarcastic' | 'concerned' | 'curious';

export type PixelPalEventType =
  | 'PAGE_SNAPSHOT'
  | 'PAGE_FOCUS'
  | 'USER_SCROLL'
  | 'USER_CLICK'
  | 'USER_ACTIVITY'
  | 'IDLE_TIMEOUT'
  | 'ASK_AI'
  | 'AI_PROCESSING'
  | 'AI_COMPLETE'
  | 'NPC_STATE'
  | 'NPC_SPEAK';

export interface PageSnapshot {
  title: string;
  url: string;
  text: string;
  capturedAt: number;
}

export interface PageContext {
  title: string;
  url: string;
  topic: string;
  summary: string;
  tone: Tone;
  complexity: number;
  readingLoad: number;
  keyPhrases: string[];
}

export type LlmProvider = 'local' | 'openai-compatible' | 'gemini' | 'anthropic';

export interface LlmSettings {
  enabled: boolean;
  provider: LlmProvider;
  endpoint: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface ConversationTurn {
  topic: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PixelPalMessage {
  type: PixelPalEventType;
  payload?: unknown;
}

export interface PixelPalResponse {
  text: string;
  tone: Tone;
  emotion: EmotionState;
  selectedText?: string;
  sources?: string[];
  followUps?: string[];
}

export interface MemoryRecord {
  id: string;
  key: string;
  value: unknown;
  vector?: number[];
  timestamp: number;
}
