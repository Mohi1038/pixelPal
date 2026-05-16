import type { CharacterId } from '@/shared/types';
import { buildCrystal } from './crystal';
import { buildJerry } from './jerry';
import { buildLily } from './lily';
import { buildSparky } from './sparky';
import type { CharacterBuilder, CharacterRig } from './types';

const builders: Record<CharacterId, CharacterBuilder> = {
  crystal: buildCrystal,
  sparky: buildSparky,
  jerry: buildJerry,
  lily: buildLily
};

export function buildCharacter(id: CharacterId): CharacterRig {
  return builders[id]();
}

export type { CharacterRig, FaceRig } from './types';
