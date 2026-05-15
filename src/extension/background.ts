import { analyzeSnapshot } from '@/brain/contextAnalyzer';
import { nextEmotion } from '@/brain/emotionEngine';
import { generateCompletion } from '@/ai/llm';
import { embedText, findSimilarRecords } from '@/memory/vectorStore';
import {
  appendConversationTurn,
  loadConversationTurns,
  loadLlmSettings,
  loadMemoryRecords,
  saveMemoryRecord
} from '@/memory/localStore';
import type { ConversationTurn, EmotionState, PageSnapshot, PixelPalMessage, PixelPalResponse } from '@/shared/types';

interface SessionState {
  emotion: EmotionState;
  lastActivityAt: number;
  lastContext?: ReturnType<typeof analyzeSnapshot>;
}

const state: SessionState = {
  emotion: 'idle',
  lastActivityAt: Date.now()
};

async function handleSnapshot(snapshot: PageSnapshot) {
  const context = analyzeSnapshot(snapshot);
  state.lastContext = context;
  state.emotion = nextEmotion({ event: 'PAGE_SNAPSHOT', context, currentEmotion: state.emotion });

  console.log('🔍 [PixelPal] Page Context Extracted:', {
    title: context.title,
    topic: context.topic,
    tone: context.tone,
    summary: context.summary,
    keyPhrases: context.keyPhrases
  });

  const records = await loadMemoryRecords();
  const queryVector = embedText(context.summary);
  const similar = findSimilarRecords(records, queryVector, 3);
  const memoryHits = similar.map((record) => String((record.value as { summary?: string }).summary ?? record.key));
  const conversation = await loadConversationTurns(context.topic);
  const settings = await loadLlmSettings();
  console.log('🤖 [PixelPal] LLM Settings:', { provider: settings.provider, model: settings.model, enabled: settings.enabled });
  const response = await generateCompletion({ context, memoryHits, conversation, settings });

  await saveMemoryRecord({
    id: crypto.randomUUID(),
    key: context.topic,
    value: { summary: context.summary, url: context.url, tone: context.tone },
    vector: queryVector,
    timestamp: Date.now()
  });

  const now = Date.now();
  const conversationTurns: ConversationTurn[] = [
    {
      topic: context.topic,
      role: 'user',
      content: context.summary,
      timestamp: now
    },
    {
      topic: context.topic,
      role: 'assistant',
      content: response.text,
      timestamp: now + 1
    }
  ];

  for (const turn of conversationTurns) {
    await appendConversationTurn(turn);
  }

  const finalResponse: PixelPalResponse = {
    text: response.text,
    tone: response.tone,
    emotion: response.emotion
  };

  state.emotion = finalResponse.emotion;
  return { context, response: finalResponse };
}

async function handleUserEvent(type: PixelPalMessage['type']) {
  state.lastActivityAt = Date.now();
  state.emotion = nextEmotion({
    event: type,
    currentEmotion: state.emotion,
    idleSeconds: 0,
    context: state.lastContext
  });
  return { emotion: state.emotion, context: state.lastContext };
}

async function sendToSender(sender: chrome.runtime.MessageSender, message: PixelPalMessage) {
  if (!sender.tab?.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(sender.tab.id, message);
  } catch {
    return;
  }
}

chrome.runtime.onMessage.addListener((message: PixelPalMessage, _sender, sendResponse) => {
  (async () => {
    const sender = _sender;
    console.log('📨 [PixelPal Background] Message received:', message.type);
    switch (message.type) {
      case 'PAGE_SNAPSHOT':
        {
          console.log('📸 [PixelPal Background] Processing PAGE_SNAPSHOT');
          const result = await handleSnapshot(message.payload as PageSnapshot);
          await sendToSender(sender, { type: 'NPC_STATE', payload: { emotion: state.emotion, context: result.context } });
          await sendToSender(sender, { type: 'NPC_SPEAK', payload: result.response });
        }
        break;
      case 'USER_SCROLL':
      case 'USER_CLICK':
      case 'USER_ACTIVITY':
      case 'PAGE_FOCUS':
        {
          const result = await handleUserEvent(message.type);
          await sendToSender(sender, { type: 'NPC_STATE', payload: result });
        }
        break;
      case 'ASK_AI': {
        const context = state.lastContext;
        if (!context) {
          sendResponse({ text: 'I need a page first.', tone: 'neutral', emotion: 'idle' });
          return;
        }
        const settings = await loadLlmSettings();
        const conversation = await loadConversationTurns(context.topic);
        const response = await generateCompletion({
          context,
          memoryHits: [],
          conversation,
          settings,
          question: typeof message.payload === 'object' && message.payload && 'question' in message.payload ? String((message.payload as { question?: unknown }).question ?? '') : undefined
        });
        sendResponse(response);
        return;
      }
      default:
        break;
    }

    sendResponse({ ok: true });
  })();

  return true;
});
