import * as THREE from 'three';
import type { FaceRig } from './types';

export function flatMaterial(color: number, opts: { emissive?: number; emissiveIntensity?: number; roughness?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.roughness ?? 0.72,
    metalness: 0.06,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0
  });
}

export function createGroundShadow(): THREE.Mesh {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 28),
    new THREE.MeshBasicMaterial({
      color: 0x02060f,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.46;
  shadow.renderOrder = -1;
  return shadow;
}

export function createPedestal(color = 0x0d1b30) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.85, 0.16, 8),
    flatMaterial(color, { roughness: 0.92 })
  );
}

export function createFaceRig(head: THREE.Group, options: { eyeY: number; eyeZ: number; mouthY: number; mouthZ: number; eyeSpacing?: number }): FaceRig {
  const spacing = options.eyeSpacing ?? 0.22;
  const eyeGeometry = new THREE.SphereGeometry(0.09, 8, 6);
  const eyeMaterials: THREE.MeshStandardMaterial[] = [];
  const eyes: THREE.Mesh[] = [];
  const pupils: THREE.Mesh[] = [];
  const brows: THREE.Mesh[] = [];

  for (const side of [-1, 1] as const) {
    const eyeMat = flatMaterial(0xffffff, { emissive: 0x91d4ff, emissiveIntensity: 0.85 });
    eyeMaterials.push(eyeMat);
    const eye = new THREE.Mesh(eyeGeometry, eyeMat);
    eye.position.set(side * spacing, options.eyeY, options.eyeZ);
    head.add(eye);
    eyes.push(eye);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 6, 6),
      flatMaterial(0x0a1020)
    );
    pupil.position.set(side * spacing, options.eyeY, options.eyeZ + 0.06);
    head.add(pupil);
    pupils.push(pupil);
  }

  const mouthMaterial = flatMaterial(0x1d2f4c, { roughness: 0.85 });
  const mouthCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.12, 0, 0),
    new THREE.Vector3(0, -0.045, 0.02),
    new THREE.Vector3(0.12, 0, 0)
  );
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 16, 0.018, 5, false), mouthMaterial);
  mouth.position.set(0, options.mouthY, options.mouthZ);
  head.add(mouth);

  const brow = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.06, 0.08),
    flatMaterial(0x8fd3ff, { roughness: 0.4 })
  );
  brow.position.set(0, options.eyeY + 0.18, options.eyeZ - 0.02);
  head.add(brow);
  brows.push(brow);

  return { eyes, eyeMaterials, pupils, mouth, mouthMaterial, brows };
}

export function addLegs(
  body: THREE.Group,
  material: THREE.Material,
  options: { y: number; spread?: number; length?: number }
): { legs: THREE.Group; leftLeg: THREE.Object3D; rightLeg: THREE.Object3D } {
  const legs = new THREE.Group();
  const spread = options.spread ?? 0.28;
  const length = options.length ?? 0.55;
  const geo = new THREE.BoxGeometry(0.22, length, 0.24);
  const leftLeg = new THREE.Mesh(geo, material);
  leftLeg.position.set(-spread, options.y - length * 0.5, 0.05);
  const rightLeg = new THREE.Mesh(geo, material);
  rightLeg.position.set(spread, options.y - length * 0.5, 0.05);
  legs.add(leftLeg, rightLeg);
  body.add(legs);
  return { legs, leftLeg, rightLeg };
}
