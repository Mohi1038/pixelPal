import * as THREE from 'three';
import { addLegs, createFaceRig, flatMaterial } from './shared';
import type { CharacterRig } from './types';

export function buildCrystal(): CharacterRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const accentRing = new THREE.Group();
  const accentMeshes: THREE.Mesh[] = [];
  const tintMaterials: THREE.MeshStandardMaterial[] = [];

  const bodyMaterial = flatMaterial(0x8fd3ff);
  tintMaterials.push(bodyMaterial);

  const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(1.02, 0), bodyMaterial);
  torso.position.y = -0.08;
  body.add(torso);

  const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.86, 0), flatMaterial(0xcfefff, { roughness: 0.36 }));
  chest.position.y = 0.68;
  body.add(chest);
  tintMaterials.push(chest.material as THREE.MeshStandardMaterial);

  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), flatMaterial(0xdff8ff, { roughness: 0.45 }));
  skull.position.y = 1.18;
  head.add(skull);

  const mask = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.78, 0.7), flatMaterial(0x1b2a44, { roughness: 0.95 }));
  mask.position.set(0, 1.12, 0.14);
  head.add(mask);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.1, 0.08),
    flatMaterial(0x91d4ff, { emissive: 0x91d4ff, emissiveIntensity: 0.3 })
  );
  visor.position.set(0, 1.14, 0.52);
  head.add(visor);

  const face = createFaceRig(head, { eyeY: 1.16, eyeZ: 0.5, mouthY: 0.78, mouthZ: 0.54, eyeSpacing: 0.24 });
  face.brows[0].material = flatMaterial(0x8fd3ff, { roughness: 0.4 });
  tintMaterials.push(...face.eyeMaterials);

  const shardGeometry = new THREE.ConeGeometry(0.17, 0.68, 4);
  const shardMaterial = flatMaterial(0x75e6da, { roughness: 0.4 });
  tintMaterials.push(shardMaterial);
  for (let index = 0; index < 5; index += 1) {
    const shard = new THREE.Mesh(shardGeometry, shardMaterial);
    shard.position.set(Math.cos((index / 5) * Math.PI * 2) * 0.9, 1.78, Math.sin((index / 5) * Math.PI * 2) * 0.9);
    shard.rotation.x = Math.PI;
    shard.rotation.z = (index % 2 ? 1 : -1) * 0.4;
    accentRing.add(shard);
    accentMeshes.push(shard);
  }

  const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.85, 4), flatMaterial(0x75e6da, { roughness: 0.4 }));
  antennaStem.position.y = 1.88;
  head.add(antennaStem);
  const antennaTip = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.13, 0),
    flatMaterial(0xffffff, { emissive: 0x75e6da, emissiveIntensity: 1.1 })
  );
  antennaTip.position.y = 2.28;
  head.add(antennaTip);

  const { legs, leftLeg, rightLeg } = addLegs(body, flatMaterial(0x5eb8d4, { roughness: 0.5 }), { y: -0.72, spread: 0.32, length: 0.5 });

  body.add(head);
  body.add(accentRing);
  root.add(body);

  return {
    id: 'crystal',
    root,
    body,
    head,
    legs,
    leftLeg,
    rightLeg,
    accentRing,
    accentMeshes,
    face,
    bodyMaterial,
    tintMaterials
  };
}
