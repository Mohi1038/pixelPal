import type { ConversationTurn, LlmSettings, MemoryRecord } from '@/shared/types';

const MEMORY_KEY = 'pixelpal.memory';
const CONVERSATION_KEY = 'pixelpal.conversation';
const SETTINGS_KEY = 'pixelpal.settings.llm';

const DEFAULT_SETTINGS: LlmSettings = {
  enabled: false,
  provider: 'openai-compatible',
  endpoint: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPrompt: 'You are PixelPal, a compact low-poly browser companion. Be vivid, brief, and playful.',
  temperature: 0.65,
  maxTokens: 220
};

function getChromeStorage() {
  return chrome.storage.local;
}

export async function loadMemoryRecords(): Promise<MemoryRecord[]> {
  const result = await getChromeStorage().get(MEMORY_KEY);
  return (result[MEMORY_KEY] as MemoryRecord[] | undefined) ?? [];
}

export async function saveMemoryRecord(record: MemoryRecord) {
  const records = await loadMemoryRecords();
  records.unshift(record);
  await getChromeStorage().set({ [MEMORY_KEY]: records.slice(0, 200) });
}

export async function queryMemory(key: string) {
  const records = await loadMemoryRecords();
  return records.filter((record) => record.key === key);
}

export async function loadConversationTurns(topic?: string): Promise<ConversationTurn[]> {
  const result = await getChromeStorage().get(CONVERSATION_KEY);
  const turns = (result[CONVERSATION_KEY] as ConversationTurn[] | undefined) ?? [];
  return topic ? turns.filter((turn) => turn.topic === topic) : turns;
}

export async function appendConversationTurn(turn: ConversationTurn) {
  const turns = await loadConversationTurns();
  turns.unshift(turn);
  await getChromeStorage().set({ [CONVERSATION_KEY]: turns.slice(0, 120) });
}

export async function loadLlmSettings(): Promise<LlmSettings> {
  const result = await getChromeStorage().get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...((result[SETTINGS_KEY] as Partial<LlmSettings> | undefined) ?? {}) };
}

export async function saveLlmSettings(settings: LlmSettings) {
  await getChromeStorage().set({ [SETTINGS_KEY]: settings });
}

export function getDefaultLlmSettings() {
  return DEFAULT_SETTINGS;
}
