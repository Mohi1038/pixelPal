import { PixelPalRenderer } from '@/npc/renderer';
import type { EmotionState, PixelPalMessage, PixelPalResponse, PageSnapshot } from '@/shared/types';

const ROOT_ID = 'pixelpal-root';
let renderer: PixelPalRenderer | null = null;
let emotion: EmotionState = 'idle';
let idleTimer = 0;
let snapshotTimer = 0;

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractPageSnapshot(): PageSnapshot {
  const bodyText = normalizeText(document.body?.innerText ?? '').slice(0, 4000);
  return {
    title: document.title || 'Untitled Realm',
    url: location.href,
    text: bodyText,
    capturedAt: Date.now()
  };
}

function emit(message: PixelPalMessage) {
  chrome.runtime.sendMessage(message).catch(() => undefined);
}

function ensureOverlay() {
  if (document.getElementById(ROOT_ID)) return;

  const host = document.createElement('div');
  host.id = ROOT_ID;
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.right = '20px';
  host.style.bottom = '20px';
  host.style.zIndex = '2147483647';
  host.style.display = 'block';
  host.style.pointerEvents = 'none';
  host.style.cursor = 'grab';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        pointer-events: none;
        background: transparent;
      }

      .stage {
        position: relative;
        width: 240px;
        height: 280px;
        pointer-events: auto;
        color: #eff8ff;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        overflow: visible;
        background: transparent;
        transform-origin: bottom right;
        animation: entrance 520ms ease-out;
        cursor: grab;
        user-select: none;
      }

      .stage:active {
        cursor: grabbing;
      }

      canvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      @keyframes entrance {
        from {
          transform: translate3d(28px, 30px, 0) scale(0.94) rotate(-1deg);
          opacity: 0;
        }
      }
    </style>
    <div class="stage">
        <canvas id="npc-canvas"></canvas>
    </div>
  `;

  const canvas = shadow.getElementById('npc-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  renderer = new PixelPalRenderer({ canvas });
  const stage = shadow.querySelector('.stage') as HTMLElement | null;
  if (stage) {
    const resize = () => {
      const rect = stage.getBoundingClientRect();
      renderer?.resize(rect.width, rect.height);
    };
    resize();
    new ResizeObserver(resize).observe(stage);

    // Drag functionality
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    stage.addEventListener('mousedown', (e: MouseEvent) => {
      isDragging = true;
      const rect = host.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      (stage as HTMLElement).style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      host.style.left = x + 'px';
      host.style.top = y + 'px';
      host.style.right = 'auto';
      host.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      (stage as HTMLElement).style.cursor = 'grab';
    });
  }

  renderer.start();
}

function updateMeters(contextScore = 0.5) {
  void contextScore;
}

function updateSpeech(text: string, tone: string, nextEmotion: EmotionState) {
  void text;
  void tone;
  void nextEmotion;
}

function start() {
  console.log('🎮 PixelPal: Initializing content script...');
  ensureOverlay();
  console.log('✅ PixelPal: Overlay created');
  const snapshot = extractPageSnapshot();
  console.log('📸 PixelPal: Page snapshot:', snapshot);
  emit({ type: 'PAGE_SNAPSHOT', payload: snapshot });
  console.log('📤 PixelPal: Snapshot emitted to background');

  const onActivity = (type: PixelPalMessage['type']) => {
    idleTimer = window.setTimeout(() => emit({ type: 'IDLE_TIMEOUT' }), 10000);
    emit({ type });
  };

  window.addEventListener('scroll', () => onActivity('USER_SCROLL'), { passive: true });
  window.addEventListener('click', () => onActivity('USER_CLICK'), { passive: true });
  window.addEventListener('focus', () => onActivity('PAGE_FOCUS'));
  window.addEventListener('mousemove', () => onActivity('USER_ACTIVITY'), { passive: true });

  idleTimer = window.setTimeout(() => emit({ type: 'IDLE_TIMEOUT' }), 10000);
  snapshotTimer = window.setInterval(() => emit({ type: 'PAGE_SNAPSHOT', payload: extractPageSnapshot() }), 30000);

  chrome.runtime.onMessage.addListener((message: PixelPalMessage | PixelPalResponse) => {
    if ('type' in message) {
      if (message.type === 'NPC_STATE') {
        const payload = message.payload as { emotion?: EmotionState; context?: { complexity?: number } } | undefined;
        if (payload?.emotion) {
          emotion = payload.emotion;
          const load = payload.context?.complexity ?? 0.5;
          renderer?.setEmotion(emotion, {
            focus: Math.min(1, 0.3 + load * 0.7),
            curiosity: emotion === 'thinking' ? 0.85 : 0.5,
            load
          });
          updateMeters(load);
        }
      }

      if (message.type === 'NPC_SPEAK') {
        const payload = message.payload as PixelPalResponse | undefined;
        if (payload) {
          emotion = payload.emotion;
          renderer?.setEmotion(payload.emotion);
          updateSpeech(payload.text, payload.tone, payload.emotion);
        }
      }
    }
  });
}

start();
