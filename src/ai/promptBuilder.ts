import type { ChatMessage, ConversationTurn, PageContext } from '@/shared/types';

export function buildSystemPrompt(basePrompt: string) {
  return [
    basePrompt,
    'Return only valid JSON with keys text, tone, and emotion.',
    'tone must be one of: neutral, friendly, helpful, sarcastic, concerned, curious.',
    'emotion must be one of: idle, thinking, happy, bored, surprised.'
  ].join('\n');
}

export function buildUserPrompt(context: PageContext, memoryHits: string[], question?: string) {
  return [
    `Page title: ${context.title}`,
    `Page topic: ${context.topic}`,
    `Page tone: ${context.tone}`,
    `Page summary: ${context.summary}`,
    `Key phrases: ${context.keyPhrases.length ? context.keyPhrases.join(', ') : 'none'}`,
    `Semantic memory: ${memoryHits.length ? memoryHits.join(' | ') : 'none'}`,
    question ? `User question: ${question}` : 'User question: none',
    'Write a short reply that feels like a game NPC reacting inside the browser.'
  ].join('\n');
}

export function buildChatMessages(input: {
  context: PageContext;
  memoryHits: string[];
  conversation: ConversationTurn[];
  systemPrompt: string;
  question?: string;
}): ChatMessage[] {
  const recentConversation = input.conversation.slice(0, 6).reverse().map((turn) => ({
    role: turn.role,
    content: turn.content
  } as ChatMessage));

  return [
    { role: 'system', content: buildSystemPrompt(input.systemPrompt) },
    ...recentConversation,
    { role: 'user', content: buildUserPrompt(input.context, input.memoryHits, input.question) }
  ];
}
