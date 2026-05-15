import type { EmotionState, PageContext, PixelPalEventType } from '@/shared/types';

const priority: Record<EmotionState, number> = {
  idle: 0,
  thinking: 1,
  happy: 2,
  bored: 1,
  surprised: 3
};

export interface EmotionInput {
  event: PixelPalEventType;
  context?: PageContext;
  idleSeconds?: number;
  currentEmotion: EmotionState;
}

function fromTone(context?: PageContext): EmotionState | null {
  if (!context) return null;
  if (context.tone === 'friendly') return 'happy';
  if (context.tone === 'sarcastic') return 'surprised';
  if (context.tone === 'concerned') return 'thinking';
  return null;
}

export function nextEmotion(input: EmotionInput): EmotionState {
  if (input.event === 'AI_PROCESSING' || input.event === 'PAGE_SNAPSHOT') {
    return 'thinking';
  }

  if (input.event === 'IDLE_TIMEOUT') {
    return 'bored';
  }

  const toneDriven = fromTone(input.context);
  if (toneDriven && priority[toneDriven] >= priority[input.currentEmotion]) {
    return toneDriven;
  }

  if (input.event === 'USER_CLICK') {
    return 'surprised';
  }

  if (input.event === 'USER_SCROLL') {
    return input.idleSeconds && input.idleSeconds > 6 ? 'bored' : 'thinking';
  }

  return input.currentEmotion;
}
