import type { ChatMessage, ConversationTurn, PageContext } from '@/shared/types';

export function buildSystemPrompt(basePrompt: string) {
  return [
    basePrompt,
    'Return only valid JSON with keys text, tone, emotion, sources, and followUps.',
    'When the user highlighted one word or a short phrase, explain that selection only.',
    'When the selection is longer, summarize it clearly and give useful related source ideas.',
    'tone must be one of: neutral, friendly, helpful, sarcastic, concerned, curious.',
    'emotion must be one of: idle, thinking, happy, bored, surprised.',
    'sources should be an array of short source ideas or search destinations such as Wikipedia, Britannica, Google Scholar, MDN, or the page author.',
    'followUps should be an array of short related prompts the user can ask next.'
  ].join('\n');
}

export function buildUserPrompt(context: PageContext, memoryHits: string[], question?: string) {
  const selectedText = question?.trim() ?? '';
  const wordCount = selectedText ? selectedText.split(/\s+/).length : 0;

  return [
    `Highlighted text: ${selectedText || 'none'}`,
    `Selection length: ${wordCount} word${wordCount === 1 ? '' : 's'}`,
    `Page title: ${context.title}`,
    `Page topic: ${context.topic}`,
    `Page tone: ${context.tone}`,
    `Semantic memory: ${memoryHits.length ? memoryHits.join(' | ') : 'none'}`,
    selectedText
      ? 'Explain the highlighted text only. Do not drift into the rest of the page unless it helps clarify the selection.'
      : 'No highlighted text was provided. Ask for a selection before answering.',
    wordCount <= 3 && selectedText
      ? 'If it is a single word or short phrase, give a simple meaning, one plain-language example, and one follow-up question suggestion.'
      : 'If it is a longer passage, explain it briefly, summarize the key idea, and include helpful source ideas or search destinations.',
    'Write a short reply that feels like a smart, friendly assistant inside the browser.'
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
