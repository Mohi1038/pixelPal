import type { ChatMessage, ConversationTurn, LlmSettings, LlmProvider, PageContext, PixelPalResponse } from '@/shared/types';
import { buildChatMessages } from './promptBuilder';

function styleResponse(context: PageContext, memoryHits: string[]): PixelPalResponse {
  const memoryLine = memoryHits[0] ? `I remember something similar: ${memoryHits[0]}.` : 'I am mapping the terrain.';

  if (context.tone === 'concerned') {
    return {
      text: `This realm feels heavy. ${memoryLine}`,
      tone: 'concerned',
      emotion: 'thinking'
    };
  }

  if (context.tone === 'friendly') {
    return {
      text: `Nice. ${context.summary} ${memoryLine}`.slice(0, 180),
      tone: 'friendly',
      emotion: 'happy'
    };
  }

  if (context.tone === 'sarcastic') {
    return {
      text: `A lot is happening here. ${memoryLine}`,
      tone: 'sarcastic',
      emotion: 'surprised'
    };
  }

  return {
    text: `${context.summary} ${memoryLine}`.slice(0, 180),
    tone: 'neutral',
    emotion: 'idle'
  };
}

function extractAssistantText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const first = choices?.[0]?.message?.content;
  return typeof first === 'string' ? first : '';
}

function extractGeminiText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> }).candidates;
  const parts = candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => (typeof part.text === 'string' ? part.text : '')).join('').trim();
}

function extractAnthropicText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const content = (payload as { content?: Array<{ text?: unknown }> }).content ?? [];
  return content.map((part) => (typeof part.text === 'string' ? part.text : '')).join('').trim();
}

function buildTranscript(messages: ChatMessage[]) {
  return messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n');
}

function buildGeminiContents(messages: ChatMessage[]) {
  // Filter out system messages - those go in systemInstruction
  const contentMessages = messages.filter((m) => m.role !== 'system');
  
  return contentMessages.map((message) => ({
    role: message.role === 'user' ? 'user' : 'model',
    parts: [{ text: message.content }]
  }));
}

function getEndpointBase(endpoint: string, fallback: string) {
  return (endpoint || fallback).replace(/\/$/, '');
}

function providerName(provider: LlmProvider) {
  return provider === 'local' ? 'local' : provider;
}

function parseAssistantResponse(raw: string, fallback: PixelPalResponse): PixelPalResponse {
  try {
    const parsed = JSON.parse(raw) as Partial<PixelPalResponse>;
    if (typeof parsed.text === 'string' && typeof parsed.tone === 'string' && typeof parsed.emotion === 'string') {
      return {
        text: parsed.text.slice(0, 240),
        tone: parsed.tone as PixelPalResponse['tone'],
        emotion: parsed.emotion as PixelPalResponse['emotion'],
        selectedText: typeof parsed.selectedText === 'string' ? parsed.selectedText.slice(0, 240) : undefined,
        sources: Array.isArray(parsed.sources)
          ? parsed.sources.filter((source): source is string => typeof source === 'string').slice(0, 4)
          : undefined,
        followUps: Array.isArray(parsed.followUps)
          ? parsed.followUps.filter((prompt): prompt is string => typeof prompt === 'string').slice(0, 4)
          : undefined
      };
    }
  } catch {
    const text = raw.trim();
    if (text) {
      return { ...fallback, text: text.slice(0, 240) };
    }
  }

  return fallback;
}

async function runRemoteCompletion(input: {
  context: PageContext;
  memoryHits: string[];
  conversation: ConversationTurn[];
  settings: LlmSettings;
  question?: string;
  fallback: PixelPalResponse;
}) {
  const messages = buildChatMessages({
    context: input.context,
    memoryHits: input.memoryHits,
    conversation: input.conversation,
    systemPrompt: input.settings.systemPrompt,
    question: input.question
  });

  const provider = providerName(input.settings.provider);
  console.log('📡 [PixelPal] Messages for', provider + ':', messages);
  let response: Response;

  if (provider === 'gemini') {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.settings.model)}:generateContent?key=${encodeURIComponent(input.settings.apiKey)}`;
    const requestBody = {
      systemInstruction: { parts: [{ text: input.settings.systemPrompt }] },
      contents: buildGeminiContents(messages),
      generationConfig: {
        temperature: input.settings.temperature,
        maxOutputTokens: input.settings.maxTokens
      }
    };
    console.log('📤 [PixelPal] Gemini Request Body:', requestBody);
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
  } else if (provider === 'anthropic') {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.settings.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: input.settings.model,
        system: input.settings.systemPrompt,
        max_tokens: input.settings.maxTokens,
        temperature: input.settings.temperature,
        messages: messages.filter((message) => message.role !== 'system')
      })
    });
  } else {
    const endpoint = new URL('/v1/chat/completions', getEndpointBase(input.settings.endpoint, 'https://api.openai.com')).toString();
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(input.settings.apiKey ? { Authorization: `Bearer ${input.settings.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: input.settings.model,
        temperature: input.settings.temperature,
        max_tokens: input.settings.maxTokens,
        messages
      })
    });
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('❌ [PixelPal] Gemini Error:', { status: response.status, body: errorBody });
    throw new Error(`LLM request failed with status ${response.status}: ${errorBody}`);
  }

  const payload = await response.json() as unknown;
  console.log('📦 [PixelPal] Raw Gemini Payload:', payload);
  const assistantText = provider === 'gemini'
    ? extractGeminiText(payload)
    : provider === 'anthropic'
      ? extractAnthropicText(payload)
      : extractAssistantText(payload);
  console.log('📥 [PixelPal]', provider, 'Response:', assistantText);
  return parseAssistantResponse(assistantText, input.fallback);
}

export async function generateCompletion(input: {
  context: PageContext;
  memoryHits: string[];
  conversation: ConversationTurn[];
  settings: LlmSettings;
  question?: string;
}) {
  const fallback = styleResponse(input.context, input.memoryHits);

  if (input.settings.enabled && input.settings.provider !== 'local') {
    try {
      return await runRemoteCompletion({ ...input, fallback });
    } catch (error) {
      console.error('❌ [PixelPal] LLM Error:', error);
      return fallback;
    }
  }

  return fallback;
}
