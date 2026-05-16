import * as THREE from 'three';
import type { CharacterRig } from './types';
import type { FaceRig } from './types';

const FUR = 0xb56b2a;
const FUR_DARK = 0x8f4f1c;
const CREAM = 0xf0dcc0;
const PINK = 0xf4a8b0;

function furMat(color = FUR) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0,
    flatShading: false
  });
}

function creamMat() {
  return new THREE.MeshStandardMaterial({
    color: CREAM,
    roughness: 0.7,
    metalness: 0,
    flatShading: false
  });
}

function createJerryFace(head: THREE.Group, snout: THREE.Object3D): FaceRig {
  const eyeMaterials: THREE.MeshStandardMaterial[] = [];
  const eyes: THREE.Mesh[] = [];
  const pupils: THREE.Mesh[] = [];
  const brows: THREE.Mesh[] = [];

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0,
    emissive: 0xffffff,
    emissiveIntensity: 0.35
  });

  for (const side of [-1, 1] as const) {
    eyeMaterials.push(eyeWhiteMat);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), eyeWhiteMat);
    eye.scale.set(0.9, 1.15, 0.35);
    eye.position.set(side * 0.15, 0.2, 0.36);
    eye.renderOrder = 2;
    head.add(eye);
    eyes.push(eye);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.4, metalness: 0 })
    );
    pupil.position.set(side * 0.15, 0.22, 0.44);
    pupil.renderOrder = 3;
    head.add(pupil);
    pupils.push(pupil);
  }

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.25, metalness: 0.15 })
  );
  nose.scale.set(1.2, 0.85, 0.9);
  nose.position.set(0, 0.04, 0.48);
  nose.renderOrder = 2;
  head.add(nose);

  const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.9, metalness: 0 });
  // Water reflection of the old frown arc: corners dip in local Y, center lifts — reads as smile on camera.
  const smile = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.11, 0.055, 0),
    new THREE.Vector3(0, -0.02, 0.02),
    new THREE.Vector3(0.11, 0.055, 0)
  );
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(smile, 16, 0.013, 6, false), mouthMaterial);
  mouth.position.set(0, -0.085, 0.46);
  mouth.rotation.set(0, 0.08, 0);
  mouth.renderOrder = 2;
  head.add(mouth);

  for (const side of [-1, 1] as const) {
    const browArc = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.05, -0.008, 0),
      new THREE.Vector3(0, 0.042, 0.01),
      new THREE.Vector3(0.05, -0.008, 0)
    );
    const brow = new THREE.Mesh(new THREE.TubeGeometry(browArc, 8, 0.011, 4, false), furMat(FUR_DARK));
    brow.position.set(side * 0.15, 0.33, 0.35);
    brow.rotation.z = side * 0.14;
    brow.renderOrder = 2;
    head.add(brow);
    brows.push(brow);
  }

  const whiskerMat = new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 0.95, metalness: 0 });
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i += 1) {
      const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.28, 4), whiskerMat);
      whisker.rotation.z = Math.PI / 2;
      whisker.rotation.y = side * (0.18 + i * 0.07);
      whisker.rotation.x = -0.05 + i * 0.07;
      whisker.position.set(side * 0.2, -0.02 + i * 0.035, 0.44);
      snout.add(whisker);
    }
  }

  return { eyes, eyeMaterials, pupils, mouth, mouthMaterial, brows };
}

function buildPearBody(material: THREE.MeshStandardMaterial) {
  const profile = [
    new THREE.Vector2(0.001, -0.78),
    new THREE.Vector2(0.26, -0.74),
    new THREE.Vector2(0.36, -0.38),
    new THREE.Vector2(0.34, 0.02),
    new THREE.Vector2(0.12, 0.2)
  ];
  return new THREE.Mesh(new THREE.LatheGeometry(profile, 20), material);
}

/** Hands behind back — paws peek from the sides so they read from the front camera. */
function addHandBehind(parent: THREE.Group, side: -1 | 1, fur: THREE.Material, pawMat: THREE.Material) {
  const hand = new THREE.Group();

  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.11, 6, 12), fur);
  arm.rotation.set(0.12, side * -0.3, side * 0.95);
  arm.position.set(side * 0.1, 0.02, -0.04);
  hand.add(arm);

  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), pawMat);
  paw.scale.set(1.05, 0.88, 0.85);
  paw.position.set(side * 0.3, -0.16, 0.14);
  paw.renderOrder = 2;
  hand.add(paw);

  const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), fur);
  knuckle.position.set(side * 0.18, -0.08, 0.06);
  hand.add(knuckle);

  parent.add(hand);
  return hand;
}

export function buildJerry(): CharacterRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const accentRing = new THREE.Group();
  const accentMeshes: THREE.Mesh[] = [];
  const tintMaterials: THREE.MeshStandardMaterial[] = [];

  const bodyMaterial = furMat();
  tintMaterials.push(bodyMaterial);

  const torso = buildPearBody(bodyMaterial);
  torso.castShadow = true;
  body.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14), creamMat());
  belly.scale.set(0.78, 1.18, 0.32);
  belly.position.set(0, -0.22, 0.24);
  body.add(belly);
  tintMaterials.push(belly.material as THREE.MeshStandardMaterial);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.1, 12), bodyMaterial);
  neck.position.y = 0.24;
  body.add(neck);

  head.position.y = 0.34;

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), bodyMaterial);
  cranium.scale.set(1.08, 1, 0.94);
  cranium.position.y = 0.34;
  head.add(cranium);

  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), creamMat());
  snout.scale.set(1.05, 0.78, 0.88);
  snout.position.set(0, 0.08, 0.28);
  head.add(snout);

  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), furMat(FUR_DARK));
    ear.scale.set(0.95, 1.15, 0.42);
    ear.position.set(side * 0.4, 0.52, -0.06);
    head.add(ear);

    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshStandardMaterial({ color: PINK, roughness: 0.75 }));
    inner.scale.set(0.9, 1.1, 0.35);
    inner.position.set(side * 0.4, 0.52, 0.02);
    head.add(inner);
  }

  const face = createJerryFace(head, snout);
  tintMaterials.push(...face.eyeMaterials);

  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.42, -0.22),
    new THREE.Vector3(0.05, -0.22, -0.48),
    new THREE.Vector3(-0.03, 0, -0.72),
    new THREE.Vector3(0.04, -0.06, -0.9)
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 20, 0.038, 8, false), furMat(FUR_DARK));
  tail.position.z = -0.05;
  body.add(tail);
  accentMeshes.push(tail);

  const hands = new THREE.Group();
  hands.position.set(0, -0.08, 0);
  const pawMat = creamMat();
  const leftHand = addHandBehind(hands, -1, furMat(FUR_DARK), pawMat);
  const rightHand = addHandBehind(hands, 1, furMat(FUR_DARK), pawMat);
  body.add(hands);
  accentMeshes.push(
    leftHand.children[1] as THREE.Mesh,
    rightHand.children[1] as THREE.Mesh
  );

  body.add(head);
  root.add(body);

  root.scale.setScalar(1.12);
  root.position.y = 0.08;

  return {
    id: 'jerry',
    root,
    body,
    head,
    legs: hands,
    leftLeg: leftHand,
    rightLeg: rightHand,
    accentRing,
    accentMeshes,
    face,
    bodyMaterial,
    tintMaterials
  };
}
