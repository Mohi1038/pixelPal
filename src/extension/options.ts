import { getDefaultLlmSettings, loadLlmSettings, saveLlmSettings } from '@/memory/localStore';
import type { LlmSettings } from '@/shared/types';

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}

const form = getElement<HTMLFormElement>('settings-form');
const provider = getElement<HTMLSelectElement>('provider');
const enabled = getElement<HTMLInputElement>('enabled');
const endpoint = getElement<HTMLInputElement>('endpoint');
const apiKey = getElement<HTMLInputElement>('apiKey');
const model = getElement<HTMLInputElement>('model');
const systemPrompt = getElement<HTMLTextAreaElement>('systemPrompt');
const temperature = getElement<HTMLInputElement>('temperature');
const maxTokens = getElement<HTMLInputElement>('maxTokens');
const status = getElement<HTMLDivElement>('status');
const modeLabel = getElement<HTMLDivElement>('mode-label');
const resetButton = getElement<HTMLButtonElement>('reset');

function refreshProviderUi(selectedProvider: LlmSettings['provider']) {
  const isLocal = selectedProvider === 'local';
  const isGemini = selectedProvider === 'gemini';
  const isAnthropic = selectedProvider === 'anthropic';
  const requiresCustomEndpoint = selectedProvider === 'openai-compatible';

  endpoint.disabled = isLocal || isGemini || isAnthropic;
  apiKey.disabled = isLocal;
  endpoint.placeholder = requiresCustomEndpoint ? 'https://api.openai.com' : 'Handled by the selected provider';
  apiKey.placeholder = isGemini ? 'AIza...' : isAnthropic ? 'sk-ant-...' : 'sk-...';
}

function readSettings(): LlmSettings {
  return {
    enabled: enabled.checked,
    provider: provider.value as LlmSettings['provider'],
    endpoint: endpoint.value.trim(),
    apiKey: apiKey.value.trim(),
    model: model.value.trim(),
    systemPrompt: systemPrompt.value.trim(),
    temperature: Number(temperature.value || 0.65),
    maxTokens: Number(maxTokens.value || 220)
  };
}

function fillForm(settings: LlmSettings) {
  enabled.checked = settings.enabled;
  provider.value = settings.provider;
  endpoint.value = settings.endpoint;
  apiKey.value = settings.apiKey;
  model.value = settings.model;
  systemPrompt.value = settings.systemPrompt;
  temperature.value = String(settings.temperature);
  maxTokens.value = String(settings.maxTokens);
  modeLabel.textContent = settings.enabled && settings.provider !== 'local' ? `${settings.provider} online` : 'Offline fallback';
  endpoint.parentElement?.setAttribute('data-provider', settings.provider);
  refreshProviderUi(settings.provider);
}

async function boot() {
  fillForm(await loadLlmSettings());
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const settings = readSettings();
  await saveLlmSettings(settings);
  modeLabel.textContent = settings.enabled && settings.provider !== 'local' ? `${settings.provider} online` : 'Offline fallback';
  status.textContent = 'Command deck saved.';
  window.setTimeout(() => {
    status.textContent = '';
  }, 1800);
});

provider.addEventListener('change', () => {
  const selected = provider.value as LlmSettings['provider'];
  refreshProviderUi(selected);
  if (selected === 'local') {
    endpoint.value = '';
  }
});

resetButton.addEventListener('click', async () => {
  const defaults = getDefaultLlmSettings();
  fillForm(defaults);
  await saveLlmSettings(defaults);
  status.textContent = 'Restored default command deck.';
  window.setTimeout(() => {
    status.textContent = '';
  }, 1800);
});

void boot();