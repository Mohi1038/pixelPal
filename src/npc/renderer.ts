import * as THREE from 'three';
import type { EmotionState } from '@/shared/types';

interface RenderOptions {
  canvas: HTMLCanvasElement;
}

interface ContextSignal {
  focus: number;
  curiosity: number;
  load: number;
}

interface EmotionProfile {
  color: number;
  bob: number;
  sway: number;
  lift: number;
  eyeGlow: number;
  scale: number;
  lean: number;
  antennaSpread: number;
}

const moodPalette: Record<EmotionState, number> = {
  idle: 0x8fd3ff,
  thinking: 0x75e6da,
  happy: 0xffd166,
  bored: 0x9aa5b1,
  surprised: 0xff8c69
};

const emotionProfiles: Record<EmotionState, EmotionProfile> = {
  idle: { color: moodPalette.idle, bob: 0.08, sway: 0.14, lift: 0.02, eyeGlow: 0.9, scale: 1, lean: 0.05, antennaSpread: 0.7 },
  thinking: { color: moodPalette.thinking, bob: 0.05, sway: 0.22, lift: 0.06, eyeGlow: 1.05, scale: 1.02, lean: 0.12, antennaSpread: 0.95 },
  happy: { color: moodPalette.happy, bob: 0.13, sway: 0.18, lift: 0.1, eyeGlow: 1.35, scale: 1.06, lean: -0.04, antennaSpread: 1.2 },
  bored: { color: moodPalette.bored, bob: 0.03, sway: 0.07, lift: -0.04, eyeGlow: 0.6, scale: 0.97, lean: 0.24, antennaSpread: 0.55 },
  surprised: { color: moodPalette.surprised, bob: 0.18, sway: 0.28, lift: 0.14, eyeGlow: 1.45, scale: 1.1, lean: -0.16, antennaSpread: 1.35 }
};

export class PixelPalRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly clock = new THREE.Clock();
  private readonly rig = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly accentRing = new THREE.Group();
  private readonly shards: THREE.Mesh[] = [];
  private readonly mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x1d2f4c, flatShading: true, roughness: 0.85 });
  private emotion: EmotionState = 'idle';
  private targetEmotion: EmotionState = 'idle';
  private contextSignal: ContextSignal = { focus: 0.5, curiosity: 0.5, load: 0.5 };
  private raf = 0;
  private readonly eyeMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    color: moodPalette.idle,
    flatShading: true,
    roughness: 0.72,
    metalness: 0.08
  });

  constructor({ canvas }: RenderOptions) {
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 6.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.fog = new THREE.Fog(0x09111f, 6, 14);
    this.scene.add(new THREE.AmbientLight(0x8ed7ff, 1.6));

    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(-3, 5, 4);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x6cffd5, 0.9);
    rim.position.set(4, 2, -2);
    this.scene.add(rim);

    this.scene.add(this.rig);
    this.createNpc();
  }

  private createNpc() {
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.95, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x0d1b30, flatShading: true, roughness: 0.92, metalness: 0.04 })
    );
    pedestal.position.y = -1.5;
    this.rig.add(pedestal);

    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), this.bodyMaterial);
    body.position.y = -0.08;
    this.body.add(body);

    const chest = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.88, 0),
      new THREE.MeshStandardMaterial({ color: 0xcfefff, flatShading: true, roughness: 0.36, metalness: 0.08 })
    );
    chest.position.y = 0.7;
    this.body.add(chest);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 0),
      new THREE.MeshStandardMaterial({ color: 0xdff8ff, flatShading: true, roughness: 0.45, metalness: 0.08 })
    );
    core.position.y = 1.2;
    this.head.add(core);

    const mask = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.82, 0.74),
      new THREE.MeshStandardMaterial({ color: 0x1b2a44, flatShading: true, roughness: 0.95, metalness: 0.02 })
    );
    mask.position.set(0, 1.15, 0.15);
    this.head.add(mask);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x91d4ff, emissive: 0x91d4ff, emissiveIntensity: 0.3, flatShading: true })
    );
    visor.position.set(0, 1.16, 0.54);
    this.head.add(visor);

    const eyeGeometry = new THREE.SphereGeometry(0.1, 10, 8);
    const leftEyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x91d4ff, emissiveIntensity: 0.9 });
    const rightEyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x91d4ff, emissiveIntensity: 0.9 });
    this.eyeMaterials.push(leftEyeMaterial, rightEyeMaterial);

    const leftEye = new THREE.Mesh(eyeGeometry, leftEyeMaterial);
    leftEye.position.set(-0.25, 1.18, 0.52);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, rightEyeMaterial);
    rightEye.position.set(0.25, 1.18, 0.52);
    this.head.add(rightEye);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.05), this.mouthMaterial);
    mouth.position.set(0, 0.92, 0.55);
    this.head.add(mouth);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.08, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x8fd3ff, flatShading: true, roughness: 0.4, metalness: 0.05 })
    );
    brow.position.set(0, 1.42, 0.5);
    this.head.add(brow);

    const shardGeometry = new THREE.ConeGeometry(0.18, 0.72, 4);
    const shardMaterial = new THREE.MeshStandardMaterial({ color: 0x75e6da, flatShading: true, roughness: 0.4, metalness: 0.12 });
    for (let index = 0; index < 5; index += 1) {
      const shard = new THREE.Mesh(shardGeometry, shardMaterial);
      shard.position.set(Math.cos((index / 5) * Math.PI * 2) * 0.92, 1.82, Math.sin((index / 5) * Math.PI * 2) * 0.92);
      shard.rotation.x = Math.PI;
      shard.rotation.z = (index % 2 ? 1 : -1) * 0.4;
      this.accentRing.add(shard);
      this.shards.push(shard);
    }

    const antenna = new THREE.Group();
    const antennaStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 0.9, 4),
      new THREE.MeshStandardMaterial({ color: 0x75e6da, flatShading: true, roughness: 0.4 })
    );
    antennaStem.position.y = 1.9;
    antenna.add(antennaStem);

    const antennaTip = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.14, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x75e6da, emissiveIntensity: 1.1, flatShading: true })
    );
    antennaTip.position.y = 2.35;
    antenna.add(antennaTip);

    this.head.add(antenna);
    this.body.add(this.head);
    this.body.add(this.accentRing);
    this.rig.add(this.body);
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setEmotion(emotion: EmotionState, signal?: Partial<ContextSignal>) {
    this.targetEmotion = emotion;
    this.contextSignal = { ...this.contextSignal, ...signal };
    const color = new THREE.Color(moodPalette[emotion]);
    this.bodyMaterial.color.lerp(color, 0.9);
    for (const material of this.eyeMaterials) {
      material.emissive = color.clone();
    }
  }

  start() {
    const tick = () => {
      const delta = this.clock.getDelta();
      const elapsed = this.clock.elapsedTime;
      this.emotion = this.targetEmotion;
      const profile = emotionProfiles[this.emotion];

      const focus = this.contextSignal.focus;
      const curiosity = this.contextSignal.curiosity;
      const load = this.contextSignal.load;
      const pace = 0.75 + curiosity * 1.2 + load * 0.55;
      const settle = 0.85 - focus * 0.25;

      const ambientBob = Math.sin(elapsed * (1.6 + curiosity)) * profile.bob;
      const drift = Math.sin(elapsed * profile.sway) * (0.12 + focus * 0.08);
      const lean = profile.lean + (load - 0.5) * 0.18;
      const pulse = 1 + Math.sin(elapsed * (2.8 + curiosity)) * (0.01 + focus * 0.012);

      this.rig.rotation.y = drift * settle;
      this.rig.rotation.x = lean;
      this.rig.position.y = ambientBob + profile.lift;
      this.rig.scale.setScalar(profile.scale * pulse);

      this.body.rotation.z = Math.sin(elapsed * 1.1) * 0.04 * settle;
      this.head.rotation.y = Math.sin(elapsed * 1.8) * 0.08 + (curiosity - 0.5) * 0.28;
      this.head.rotation.x = Math.sin(elapsed * 1.4) * 0.05 - (load - 0.5) * 0.14;
      this.accentRing.rotation.y += delta * pace * 0.45;
      this.accentRing.rotation.x = Math.sin(elapsed * 1.2) * 0.1 + (this.emotion === 'surprised' ? 0.1 : 0);

      this.mouthMaterial.color = new THREE.Color(this.emotion === 'happy' ? 0x2d4c1f : this.emotion === 'bored' ? 0x4d5870 : 0x1d2f4c);

      const eyeOpen = profile.eyeGlow + (this.emotion === 'surprised' ? 0.3 : 0) - (this.emotion === 'bored' ? 0.4 : 0);
      for (const material of this.eyeMaterials) {
        material.emissiveIntensity = eyeOpen;
      }

      for (let index = 0; index < this.shards.length; index += 1) {
        const shard = this.shards[index];
        const direction = index % 2 === 0 ? 1 : -1;
        shard.rotation.y += delta * direction * (0.3 + pace * 0.2);
        shard.position.y = 1.8 + Math.sin(elapsed * (2 + focus) + index) * (0.05 + profile.antennaSpread * 0.05);
        shard.scale.setScalar(0.85 + curiosity * 0.3);
      }

      this.renderer.render(this.scene, this.camera);
      this.raf = window.requestAnimationFrame(tick);
    };

    tick();
  }

  stop() {
    window.cancelAnimationFrame(this.raf);
  }
}
