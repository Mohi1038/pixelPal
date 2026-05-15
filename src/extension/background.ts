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
  ];

  for (const turn of conversationTurns) {
    await appendConversationTurn(turn);
  }

  return { context, memoryHits };
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

function getSelectionWordCount(selection: string) {
  return selection.replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

async function lookupDictionaryMeaning(selection: string) {
  const normalized = selection.replace(/\s+/g, ' ').trim();
  const query = encodeURIComponent(normalized.toLowerCase());
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`);

  if (!response.ok) {
    return null;
  }

  const entries = await response.json() as Array<{
    word?: string;
    phonetic?: string;
    meanings?: Array<{
      partOfSpeech?: string;
      definitions?: Array<{ definition?: string; example?: string }>;
    }>;
  }>;

  const firstEntry = entries[0];
  const firstMeaning = firstEntry?.meanings?.[0];
  const firstDefinition = firstMeaning?.definitions?.[0];

  if (!firstEntry || !firstMeaning || !firstDefinition?.definition) {
    return null;
  }

  const partOfSpeech = firstMeaning.partOfSpeech ? ` (${firstMeaning.partOfSpeech})` : '';
  const example = firstDefinition.example ? ` Example: ${firstDefinition.example}` : '';

  return {
    text: `${firstEntry.word ?? normalized}${partOfSpeech}: ${firstDefinition.definition}.${example}`,
    tone: 'helpful' as const,
    emotion: 'thinking' as const,
    selectedText: normalized,
    sources: ['Dictionary API', 'Wikipedia', 'Google Search'],
    followUps: ['Show an example', 'Explain in simpler words', 'What is the origin?']
  };
}

function buildSelectionContext(selection: string) {
  const normalized = selection.replace(/\s+/g, ' ').trim();
  const keyPhrases = normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  return {
    title: state.lastContext?.title ?? 'Highlighted text',
    url: state.lastContext?.url ?? '',
    topic: normalized || 'highlighted text',
    summary: normalized,
    tone: 'curious' as const,
    complexity: Math.min(1, normalized.length / 160),
    readingLoad: Math.min(1, normalized.length / 220),
    keyPhrases
  };
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
        const payload = typeof message.payload === 'object' && message.payload ? (message.payload as { selection?: unknown; question?: unknown }) : undefined;
        const selection = String(payload?.selection ?? payload?.question ?? '').trim();
        const context = selection ? buildSelectionContext(selection) : state.lastContext;

        if (!context) {
          sendResponse({ text: 'Highlight some text first, and I will explain it.', tone: 'neutral', emotion: 'idle' });
          return;
        }
        const settings = await loadLlmSettings();
        const conversation = selection ? [] : await loadConversationTurns(context.topic);

        if (selection && getSelectionWordCount(selection) <= 3) {
          const dictionaryAnswer = await lookupDictionaryMeaning(selection);
          if (dictionaryAnswer) {
            await sendToSender(sender, { type: 'NPC_STATE', payload: { emotion: dictionaryAnswer.emotion, context } });
            await sendToSender(sender, { type: 'NPC_SPEAK', payload: dictionaryAnswer });
            sendResponse(dictionaryAnswer);
            return;
          }
        }

        const response = await generateCompletion({
          context,
          memoryHits: [],
          conversation,
          settings,
          question: selection || undefined
        });
        await sendToSender(sender, { type: 'NPC_STATE', payload: { emotion: response.emotion, context } });
        await sendToSender(sender, { type: 'NPC_SPEAK', payload: { ...response, selectedText: selection || undefined } });
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
