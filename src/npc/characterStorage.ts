import type { CharacterId } from '@/shared/types';

const CHARACTER_KEY = 'pixelpal.settings.character';

export async function loadCharacterId(): Promise<CharacterId> {
  const result = await chrome.storage.local.get(CHARACTER_KEY);
  const value = result[CHARACTER_KEY] as CharacterId | undefined;
  if (value === 'crystal' || value === 'sparky' || value === 'jerry' || value === 'lily') {
    return value;
  }
  return 'crystal';
}

export async function saveCharacterId(characterId: CharacterId) {
  await chrome.storage.local.set({ [CHARACTER_KEY]: characterId });
}
