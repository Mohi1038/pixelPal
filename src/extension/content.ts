import { loadCharacterId, saveCharacterId } from '@/npc/characterStorage';
import { PixelPalRenderer } from '@/npc/renderer';
import {
  CHARACTER_IDS,
  CHARACTER_LABELS,
  type CharacterId,
  type EmotionState,
  type PixelPalMessage,
  type PixelPalResponse,
  type PageSnapshot
} from '@/shared/types';

const ROOT_ID = 'pixelpal-root';
let renderer: PixelPalRenderer | null = null;
let emotion: EmotionState = 'idle';
let idleTimer = 0;
let snapshotTimer = 0;
let selectionTimer = 0;
let insightPanel: HTMLDivElement | null = null;
let insightTitle: HTMLDivElement | null = null;
let insightText: HTMLDivElement | null = null;
let insightSources: HTMLDivElement | null = null;
let insightFollowUps: HTMLDivElement | null = null;
let insightSelection: HTMLDivElement | null = null;
let activeSelection = '';
let characterId: CharacterId = 'crystal';
let characterPicker: HTMLDivElement | null = null;

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

function isSelectionInsideOverlay() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const anchorNode = selection.anchorNode;
  return Boolean(anchorNode && anchorNode instanceof Node && anchorNode.parentElement?.closest?.(`#${ROOT_ID}`));
}

function clearInsightPanel() {
  if (!insightPanel) return;
  insightPanel.hidden = true;
  activeSelection = '';
  if (insightTitle) insightTitle.textContent = '';
  if (insightText) insightText.textContent = '';
  if (insightSelection) insightSelection.textContent = '';
  if (insightSources) insightSources.innerHTML = '';
  if (insightFollowUps) insightFollowUps.innerHTML = '';
}

function showInsightPanel(selection: string, statusText = 'Thinking...') {
  if (!insightPanel || !insightTitle || !insightText || !insightSelection || !insightSources || !insightFollowUps) return;
  activeSelection = selection;
  insightPanel.hidden = false;
  insightSelection.textContent = selection;
  insightTitle.textContent = 'PixelPal is explaining your highlight';
  insightText.textContent = statusText;
  insightSources.innerHTML = '';
  insightFollowUps.innerHTML = '';
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
        display: flex;
        flex-direction: column;
        width: 240px;
        height: 300px;
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

      .insight-panel {
        position: absolute;
        left: 0;
        top: 312px;
        width: 300px;
        padding: 14px 14px 12px;
        background: linear-gradient(180deg, rgba(10, 18, 31, 0.97), rgba(7, 12, 21, 0.98));
        border: 1px solid rgba(148, 224, 255, 0.18);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        clip-path: polygon(4% 0, 96% 0, 100% 8%, 100% 94%, 96% 100%, 4% 100%, 0 92%, 0 6%);
        color: #eef8ff;
        pointer-events: auto;
        display: grid;
        gap: 10px;
        max-height: 260px;
        overflow: auto;
        user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
      }

      .insight-panel[hidden] {
        display: none;
      }

      .insight-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: rgba(159, 215, 255, 0.8);
      }

      .insight-title {
        font-size: 14px;
        font-weight: 700;
        color: #dff8ff;
        user-select: none;
      }

      .insight-selection {
        font-size: 13px;
        line-height: 1.5;
        color: rgba(238, 248, 255, 0.85);
        user-select: none;
      }

      .insight-text {
        font-size: 14px;
        line-height: 1.55;
        color: #eef8ff;
        user-select: none;
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip {
        padding: 6px 10px;
        font-size: 12px;
        border: 1px solid rgba(148, 224, 255, 0.18);
        background: rgba(124, 234, 249, 0.08);
        color: #c8f4ff;
        clip-path: polygon(8% 0, 100% 0, 100% 82%, 92% 100%, 0 100%, 0 18%);
        user-select: none;
      }

      button.chip {
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
        font: inherit;
      }

      .stage:active {
        cursor: grabbing;
      }

      .viewport {
        position: relative;
        flex: 1;
        min-height: 248px;
        overflow: hidden;
      }

      canvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      .character-picker {
        flex-shrink: 0;
        display: flex;
        gap: 6px;
        justify-content: center;
        padding: 6px 8px 8px;
        pointer-events: auto;
      }

      .character-btn {
        appearance: none;
        -webkit-appearance: none;
        border: 1px solid rgba(148, 224, 255, 0.22);
        background: rgba(8, 16, 28, 0.82);
        color: rgba(220, 244, 255, 0.88);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.04em;
        padding: 5px 7px;
        cursor: pointer;
        clip-path: polygon(10% 0, 100% 0, 100% 78%, 90% 100%, 0 100%, 0 22%);
        transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
      }

      .character-btn:hover {
        border-color: rgba(148, 224, 255, 0.45);
        color: #eff8ff;
      }

      .character-btn[aria-pressed="true"] {
        background: rgba(124, 234, 249, 0.18);
        border-color: rgba(124, 234, 249, 0.55);
        color: #dff8ff;
      }

      @keyframes entrance {
        from {
          transform: translate3d(28px, 30px, 0) scale(0.94) rotate(-1deg);
          opacity: 0;
        }
      }
    </style>
    <div class="stage">
        <div class="viewport">
          <canvas id="npc-canvas"></canvas>
        </div>
        <div class="character-picker" id="character-picker"></div>
    </div>
    <div class="insight-panel" id="insight-panel" hidden>
      <div class="insight-label">Selected text</div>
      <div class="insight-selection" id="insight-selection"></div>
      <div class="insight-title" id="insight-title"></div>
      <div class="insight-text" id="insight-text"></div>
      <div>
        <div class="insight-label">Sources</div>
        <div class="chip-row" id="insight-sources"></div>
      </div>
      <div>
        <div class="insight-label">Ask next</div>
        <div class="chip-row" id="insight-followups"></div>
      </div>
    </div>
  `;

  const canvas = shadow.getElementById('npc-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  insightPanel = shadow.getElementById('insight-panel') as HTMLDivElement | null;
  insightTitle = shadow.getElementById('insight-title') as HTMLDivElement | null;
  insightText = shadow.getElementById('insight-text') as HTMLDivElement | null;
  insightSources = shadow.getElementById('insight-sources') as HTMLDivElement | null;
  insightFollowUps = shadow.getElementById('insight-followups') as HTMLDivElement | null;
  insightSelection = shadow.getElementById('insight-selection') as HTMLDivElement | null;

  characterPicker = shadow.getElementById('character-picker') as HTMLDivElement | null;

  const stage = shadow.querySelector('.stage') as HTMLElement | null;
  const viewport = shadow.querySelector('.viewport') as HTMLElement | null;
  if (stage && viewport) {
    const resize = () => {
      const rect = viewport.getBoundingClientRect();
      renderer?.resize(rect.width, rect.height);
    };
    resize();
    new ResizeObserver(resize).observe(viewport);

    // Drag functionality
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    stage.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.character-picker')) {
        return;
      }
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

  void setupCharacterPicker(canvas).then(() => {
    renderer?.start();
  });
}

function updateCharacterPickerUi() {
  if (!characterPicker) return;
  for (const button of characterPicker.querySelectorAll<HTMLButtonElement>('.character-btn')) {
    const id = button.dataset.character as CharacterId | undefined;
    button.setAttribute('aria-pressed', id === characterId ? 'true' : 'false');
  }
}

async function setupCharacterPicker(canvas: HTMLCanvasElement) {
  characterId = await loadCharacterId();
  renderer = new PixelPalRenderer({ canvas, characterId });
  updateCharacterPickerUi();

  if (!characterPicker) return;

  characterPicker.innerHTML = '';
  for (const id of CHARACTER_IDS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-btn';
    button.dataset.character = id;
    button.textContent = CHARACTER_LABELS[id];
    button.setAttribute('aria-pressed', id === characterId ? 'true' : 'false');
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      characterId = id;
      renderer?.setCharacter(id);
      updateCharacterPickerUi();
      await saveCharacterId(id);
    });
    characterPicker.appendChild(button);
  }
}

function updateMeters(contextScore = 0.5) {
  void contextScore;
}

function updateSpeech(payload: PixelPalResponse & { selectedText?: string; sources?: string[]; followUps?: string[] }) {
  if (!insightPanel || !insightText || !insightTitle || !insightSources || !insightFollowUps || !insightSelection) {
    return;
  }

  const responseText = payload.text ?? '';
  const selectedText = payload.selectedText ?? '';
  const sources = payload.sources ?? [];
  const followUps = payload.followUps ?? [];

  insightPanel.hidden = false;
  activeSelection = selectedText;
  insightSelection.textContent = selectedText;

  insightTitle.textContent = 'PixelPal says';
  insightText.textContent = responseText;
  insightSources.innerHTML = '';
  insightFollowUps.innerHTML = '';

  const sourceItems = sources.length ? sources : ['Google Search', 'Wikipedia', 'Britannica'];
  for (const source of sourceItems) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = source;
    insightSources.appendChild(chip);
  }

  const followUpItems = followUps.length ? followUps : ['Tell me more', 'Explain simply', 'Give an example'];
  for (const item of followUpItems) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.textContent = item;
    chip.addEventListener('click', () => {
      if (!activeSelection) return;
      showInsightPanel(activeSelection, 'Asking a follow-up...');
      emit({
        type: 'ASK_AI',
        payload: {
          selection: activeSelection,
          question: item
        }
      });
    });
    insightFollowUps.appendChild(chip);
  }
}

async function start() {
  console.log('🎮 PixelPal: Initializing content script...');
  ensureOverlay();
  console.log('✅ PixelPal: Overlay created');
  const snapshot = extractPageSnapshot();
  console.log('📸 PixelPal: Page snapshot:', snapshot);
  emit({ type: 'PAGE_SNAPSHOT', payload: snapshot });
  console.log('📤 PixelPal: Snapshot emitted to background');

  const askAboutSelection = () => {
    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(() => {
      if (isSelectionInsideOverlay()) {
        return;
      }

      const selection = window.getSelection()?.toString().replace(/\s+/g, ' ').trim() ?? '';
      if (!selection) {
        clearInsightPanel();
        return;
      }

      showInsightPanel(selection, 'Looking up the highlighted text...');
      emit({
        type: 'ASK_AI',
        payload: {
          selection,
          question: selection
        }
      });
    }, 120);
  };

  const onActivity = (type: PixelPalMessage['type']) => {
    idleTimer = window.setTimeout(() => emit({ type: 'IDLE_TIMEOUT' }), 10000);
    emit({ type });
  };

  window.addEventListener('scroll', () => onActivity('USER_SCROLL'), { passive: true });
  window.addEventListener('click', () => onActivity('USER_CLICK'), { passive: true });
  window.addEventListener('focus', () => onActivity('PAGE_FOCUS'));
  window.addEventListener('mousemove', () => onActivity('USER_ACTIVITY'), { passive: true });
  window.addEventListener('mouseup', askAboutSelection, { passive: true });
  window.addEventListener('keyup', (event) => {
    if (event.key === 'Shift' || event.key.startsWith('Arrow')) {
      askAboutSelection();
    }
  });

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
        const payload = message.payload as (PixelPalResponse & { selectedText?: string; sources?: string[]; followUps?: string[] }) | undefined;
        if (payload) {
          emotion = payload.emotion;
          renderer?.setEmotion(payload.emotion);
          updateSpeech(payload);
        }
      }
    }
  });
}

start();
