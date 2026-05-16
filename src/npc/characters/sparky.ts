import * as THREE from 'three';
import { addLegs, flatMaterial } from './shared';
import type { CharacterRig } from './types';
import type { FaceRig } from './types';

function createSparkyFace(head: THREE.Group): FaceRig {
  const eyeMaterials: THREE.MeshStandardMaterial[] = [];
  const eyes: THREE.Mesh[] = [];
  const pupils: THREE.Mesh[] = [];
  const brows: THREE.Mesh[] = [];

  for (const side of [-1, 1] as const) {
    const eyeMat = flatMaterial(0x111111, { emissive: 0x222222, emissiveIntensity: 0.2 });
    eyeMaterials.push(eyeMat);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), eyeMat);
    eye.position.set(side * 0.2, 0.42, 0.52);
    head.add(eye);
    eyes.push(eye);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), flatMaterial(0x000000));
    pupil.position.set(side * 0.2, 0.4, 0.6);
    head.add(pupil);
    pupils.push(pupil);
  }

  const cheekMat = flatMaterial(0xe84838, { emissive: 0xe84838, emissiveIntensity: 0.15 });
  for (const side of [-1, 1] as const) {
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), cheekMat);
    cheek.rotation.y = side * 0.15;
    cheek.position.set(side * 0.34, 0.22, 0.5);
    head.add(cheek);
  }

  const mouthMaterial = flatMaterial(0x3a2510, { roughness: 0.9 });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.04), mouthMaterial);
  mouth.position.set(0, 0.18, 0.58);
  head.add(mouth);

  for (const side of [-1, 1] as const) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.034, 0.05), flatMaterial(0x2a2208));
    brow.position.set(side * 0.2, 0.54, 0.51);
    brow.rotation.z = side * -0.28;
    head.add(brow);
    brows.push(brow);
  }

  return { eyes, eyeMaterials, pupils, mouth, mouthMaterial, brows };
}

export function buildSparky(): CharacterRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const accentRing = new THREE.Group();
  const accentMeshes: THREE.Mesh[] = [];
  const tintMaterials: THREE.MeshStandardMaterial[] = [];

  const bodyMaterial = flatMaterial(0xf4d03f, { roughness: 0.55 });
  tintMaterials.push(bodyMaterial);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.95, 0.82), bodyMaterial);
  torso.position.y = 0.05;
  body.add(torso);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.84), flatMaterial(0x6b4a12));
  stripe.position.set(0, 0.08, -0.02);
  body.add(stripe);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.82, 0.78), bodyMaterial);
  headMesh.position.y = 0.72;
  head.add(headMesh);

  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 4), bodyMaterial);
    ear.position.set(side * 0.38, 1.12, -0.05);
    ear.rotation.z = side * -0.35;
    head.add(ear);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 4), flatMaterial(0x1a1408));
    tip.position.set(side * 0.42, 1.38, -0.05);
    tip.rotation.z = side * -0.35;
    head.add(tip);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), flatMaterial(0x1a1408));
  nose.position.set(0, 0.32, 0.62);
  head.add(nose);

  const face = createSparkyFace(head);
  tintMaterials.push(...face.eyeMaterials);

  const tailGroup = new THREE.Group();
  const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.5), bodyMaterial);
  seg1.position.set(0, 0.2, -0.55);
  seg1.rotation.y = 0.4;
  const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.45), bodyMaterial);
  seg2.position.set(0.15, 0.45, -0.85);
  seg2.rotation.set(0.2, 0.8, 0.5);
  const seg3 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.12), flatMaterial(0xf4d03f, { emissive: 0xffe566, emissiveIntensity: 0.35 }));
  seg3.position.set(0.28, 0.62, -1.05);
  seg3.rotation.set(0.3, 1.1, 0.6);
  tailGroup.add(seg1, seg2, seg3);
  tailGroup.position.set(0, 0.1, -0.35);
  body.add(tailGroup);
  accentMeshes.push(seg3);

  const armMat = flatMaterial(0xe8c82e, { roughness: 0.6 });
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), armMat);
    arm.position.set(side * 0.62, 0.15, 0.1);
    body.add(arm);
  }

  const { legs, leftLeg, rightLeg } = addLegs(body, flatMaterial(0xc9a820, { roughness: 0.6 }), { y: -0.42, spread: 0.3, length: 0.38 });

  body.add(head);
  root.add(body);

  return {
    id: 'sparky',
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
