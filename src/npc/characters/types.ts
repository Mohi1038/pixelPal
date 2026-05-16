import * as THREE from 'three';
import type { CharacterId } from '@/shared/types';

export interface FaceRig {
  eyes: THREE.Mesh[];
  eyeMaterials: THREE.MeshStandardMaterial[];
  pupils: THREE.Mesh[];
  mouth: THREE.Mesh | null;
  mouthMaterial: THREE.MeshStandardMaterial;
  brows: THREE.Mesh[];
}

export interface CharacterRig {
  id: CharacterId;
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  accentRing: THREE.Group;
  accentMeshes: THREE.Mesh[];
  face: FaceRig;
  bodyMaterial: THREE.MeshStandardMaterial;
  tintMaterials: THREE.MeshStandardMaterial[];
}

export type CharacterBuilder = () => CharacterRig;
