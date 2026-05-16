import * as THREE from 'three';
import type { CharacterRig } from './types';
import type { FaceRig } from './types';

const SKIN = 0xffd8cc;
const SKIN_SHADOW = 0xf0b8a8;
const DRESS = 0xf08cbb;
const DRESS_LIGHT = 0xffb8dc;
const HAIR = 0x6b3858;
const HAIR_LIGHT = 0x8a4a68;

function softMat(color: number, opts: { emissive?: number; emissiveIntensity?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0,
    flatShading: false,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0
  });
}

function createLilyFace(head: THREE.Group): FaceRig {
  const eyeMaterials: THREE.MeshStandardMaterial[] = [];
  const eyes: THREE.Mesh[] = [];
  const pupils: THREE.Mesh[] = [];
  const brows: THREE.Mesh[] = [];

  const eyeWhite = softMat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.2 });

  for (const side of [-1, 1] as const) {
    eyeMaterials.push(eyeWhite);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), eyeWhite);
    eye.scale.set(1.05, 1.28, 0.42);
    eye.position.set(side * 0.13, 0.1, 0.36);
    eye.renderOrder = 2;
    head.add(eye);
    eyes.push(eye);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 10, 10),
      softMat(0x3a2048)
    );
    pupil.position.set(side * 0.13, 0.1, 0.44);
    pupil.renderOrder = 3;
    head.add(pupil);
    pupils.push(pupil);
  }

  const blush = softMat(0xffa8c0, { emissive: 0xffa8c0, emissiveIntensity: 0.1 });
  for (const side of [-1, 1] as const) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), blush);
    cheek.scale.set(1.2, 0.85, 0.45);
    cheek.position.set(side * 0.2, -0.06, 0.32);
    head.add(cheek);
  }

  const mouthMaterial = softMat(0xe86888, { roughness: 0.8 });
  const smile = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.06, 0, 0),
    new THREE.Vector3(0, 0.035, 0.015),
    new THREE.Vector3(0.06, 0, 0)
  );
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(smile, 12, 0.01, 5, false), mouthMaterial);
  mouth.position.set(0, -0.1, 0.38);
  head.add(mouth);

  const browArc = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.1, 0, 0),
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(0.1, 0, 0)
  );
  const brow = new THREE.Mesh(new THREE.TubeGeometry(browArc, 8, 0.008, 4, false), softMat(HAIR));
  brow.position.set(0, 0.24, 0.34);
  head.add(brow);
  brows.push(brow);

  return { eyes, eyeMaterials, pupils, mouth, mouthMaterial, brows };
}

export function buildLily(): CharacterRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const accentRing = new THREE.Group();
  const accentMeshes: THREE.Mesh[] = [];
  const tintMaterials: THREE.MeshStandardMaterial[] = [];

  const skin = softMat(SKIN);
  const dress = softMat(DRESS);
  const bodyMaterial = dress;
  tintMaterials.push(bodyMaterial, skin);

  const skirt = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), dress);
  skirt.scale.set(1.15, 0.75, 1.1);
  skirt.position.y = -0.38;
  body.add(skirt);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), dress);
  torso.scale.set(1.05, 0.95, 0.82);
  torso.position.y = 0.02;
  body.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 16), softMat(DRESS_LIGHT));
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.18, 0.02);
  body.add(collar);

  head.position.y = 0.28;

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 16), skin);
  cranium.scale.set(1.12, 1.18, 0.92);
  cranium.position.y = 0.36;
  head.add(cranium);

  const faceOval = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 14), softMat(SKIN_SHADOW));
  faceOval.scale.set(0.95, 1.05, 0.55);
  faceOval.position.set(0, 0.22, 0.14);
  head.add(faceOval);

  const bow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), softMat(0xff9ed0, { emissive: 0xff9ed0, emissiveIntensity: 0.2 }));
  bow.scale.set(1.6, 0.75, 0.55);
  bow.position.set(0, 0.68, 0.06);
  head.add(bow);
  accentMeshes.push(bow);

  for (const side of [-1, 1] as const) {
    const pigtail = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), softMat(HAIR));
    pigtail.scale.set(0.95, 1.35, 0.95);
    pigtail.position.set(side * 0.34, 0.42, -0.06);
    head.add(pigtail);

    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), softMat(HAIR_LIGHT));
    puff.position.set(side * 0.34, 0.2, -0.04);
    head.add(puff);

    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 6, 12), softMat(0xffc0e0));
    tie.rotation.x = Math.PI / 2;
    tie.position.set(side * 0.28, 0.48, 0.04);
    head.add(tie);
  }

  const bangs = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), softMat(HAIR));
  bangs.scale.set(1.35, 0.65, 0.7);
  bangs.position.set(0, 0.52, 0.18);
  head.add(bangs);

  const face = createLilyFace(head);
  tintMaterials.push(...face.eyeMaterials);

  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 5, 10), skin);
    arm.rotation.z = side * 0.35;
    arm.position.set(side * 0.3, 0.02, 0.06);
    body.add(arm);
  }

  const legs = new THREE.Group();
  legs.position.y = -0.55;
  const sockMat = softMat(0xffffff);
  const shoeMat = softMat(0xff88b8);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  for (const [leg, side] of [
    [leftLeg, -1],
    [rightLeg, 1]
  ] as const) {
    const sock = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.1, 5, 10), sockMat);
    sock.position.y = 0.04;
    leg.add(sock);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), shoeMat);
    shoe.scale.set(1.2, 0.6, 1.4);
    shoe.position.set(side * 0.02, -0.06, 0.03);
    leg.add(shoe);
    leg.position.set(side * 0.1, 0, 0.04);
    legs.add(leg);
  }

  body.add(legs);
  body.add(head);
  root.add(body);
  root.scale.setScalar(1.08);
  root.position.y = 0.05;

  return {
    id: 'lily',
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
