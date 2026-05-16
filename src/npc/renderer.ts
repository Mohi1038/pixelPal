import * as THREE from 'three';
import { buildCharacter, type CharacterRig } from '@/npc/characters';
import { createGroundShadow, createPedestal } from '@/npc/characters/shared';
import type { CharacterId, EmotionState } from '@/shared/types';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  characterId?: CharacterId;
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
  accentSpread: number;
}

type Pose = 'stand' | 'jump' | 'sit';

const moodPalette: Record<EmotionState, number> = {
  idle: 0x8fd3ff,
  thinking: 0x75e6da,
  happy: 0xffd166,
  bored: 0x9aa5b1,
  surprised: 0xff8c69
};

const CHARACTER_FRAMING: Record<
  CharacterId,
  { pedestal: boolean; slotY: number; slotScale: number; cam: [number, number, number]; lookY: number }
> = {
  crystal: { pedestal: true, slotY: 0, slotScale: 0.92, cam: [0, 0.95, 6.8], lookY: 0.2 },
  sparky: { pedestal: true, slotY: 0, slotScale: 0.9, cam: [0, 0.85, 6.5], lookY: 0.18 },
  jerry: { pedestal: false, slotY: 0.05, slotScale: 0.95, cam: [0, 0.2, 5.6], lookY: 0.05 },
  lily: { pedestal: false, slotY: 0.08, slotScale: 1, cam: [0, 0.25, 5.5], lookY: 0.08 }
};

const emotionProfiles: Record<EmotionState, EmotionProfile> = {
  idle: { color: moodPalette.idle, bob: 0.08, sway: 0.14, lift: 0.02, eyeGlow: 0.9, scale: 1, lean: 0.05, accentSpread: 0.7 },
  thinking: { color: moodPalette.thinking, bob: 0.05, sway: 0.22, lift: 0.06, eyeGlow: 1.05, scale: 1.02, lean: 0.12, accentSpread: 0.95 },
  happy: { color: moodPalette.happy, bob: 0.13, sway: 0.18, lift: 0.1, eyeGlow: 1.35, scale: 1.06, lean: -0.04, accentSpread: 1.2 },
  bored: { color: moodPalette.bored, bob: 0.03, sway: 0.07, lift: -0.04, eyeGlow: 0.6, scale: 0.97, lean: 0.24, accentSpread: 0.55 },
  surprised: { color: moodPalette.surprised, bob: 0.18, sway: 0.28, lift: 0.14, eyeGlow: 1.45, scale: 1.1, lean: -0.16, accentSpread: 1.35 }
};

export class PixelPalRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly clock = new THREE.Clock();
  private readonly rig = new THREE.Group();
  private readonly characterSlot = new THREE.Group();
  private readonly shadow: THREE.Mesh;
  private readonly pedestal: THREE.Mesh;
  private characterId: CharacterId;
  private character: CharacterRig | null = null;
  private emotion: EmotionState = 'idle';
  private targetEmotion: EmotionState = 'idle';
  private contextSignal: ContextSignal = { focus: 0.5, curiosity: 0.5, load: 0.5 };
  private raf = 0;
  private pose: Pose = 'stand';
  private poseBlend = 0;
  private jumpPhase = 0;
  private jumpImpulse = 0;
  private sitTimer = 0;
  private idleSeconds = 0;
  private readonly jerryLight: THREE.DirectionalLight;

  constructor({ canvas, characterId = 'crystal' }: RenderOptions) {
    this.characterId = characterId;
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
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

    this.jerryLight = new THREE.DirectionalLight(0xffe8cc, 1.4);
    this.jerryLight.position.set(1, 3, 5);
    this.jerryLight.visible = false;
    this.scene.add(this.jerryLight);

    this.pedestal = createPedestal();
    this.pedestal.position.y = -1.5;
    this.shadow = createGroundShadow();

    this.rig.add(this.pedestal);
    this.rig.add(this.shadow);
    this.rig.add(this.characterSlot);
    this.scene.add(this.rig);

    this.mountCharacter(characterId);
  }

  private mountCharacter(id: CharacterId) {
    if (this.character) {
      this.characterSlot.remove(this.character.root);
    }
    this.characterId = id;
    this.character = buildCharacter(id);
    this.characterSlot.add(this.character.root);
    this.applyCharacterFraming(id);
    this.pose = 'stand';
    this.poseBlend = 0;
    this.jumpPhase = 0;
    this.jumpImpulse = 0;
    this.sitTimer = 0;
    this.lockCharacterColors();
  }

  private applyCharacterFraming(id: CharacterId) {
    const frame = CHARACTER_FRAMING[id];
    this.pedestal.visible = frame.pedestal;
    this.shadow.position.y = frame.pedestal ? -1.46 : -0.92;
    this.characterSlot.position.y = frame.slotY;
    this.characterSlot.scale.setScalar(frame.slotScale);
    this.camera.position.set(frame.cam[0], frame.cam[1], frame.cam[2]);
    this.camera.lookAt(0, frame.lookY, 0);
    this.jerryLight.visible = id === 'jerry';
    this.scene.fog = new THREE.Fog(id === 'jerry' ? 0x1a120c : 0x09111f, 5, id === 'jerry' ? 12 : 14);
  }

  setCharacter(id: CharacterId) {
    if (id === this.characterId) return;
    this.mountCharacter(id);
  }

  getCharacterId() {
    return this.characterId;
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setEmotion(emotion: EmotionState, signal?: Partial<ContextSignal>) {
    const prev = this.targetEmotion;
    this.targetEmotion = emotion;
    this.contextSignal = { ...this.contextSignal, ...signal };
    if (emotion === 'happy' || emotion === 'surprised') {
      this.triggerJump();
    }
    if (emotion === 'bored' && prev !== 'bored') {
      this.sitTimer = 0.4;
    }
    if (emotion !== 'bored' && emotion !== 'idle') {
      this.pose = 'stand';
    }
  }

  private triggerJump() {
    if (this.pose === 'sit') {
      this.pose = 'stand';
      this.poseBlend = 0;
    }
    this.pose = 'jump';
    this.jumpPhase = 0;
    this.jumpImpulse = 1;
  }

  /** Keep each character's palette fixed — emotions only move the rig and face. */
  private lockCharacterColors() {
    const character = this.character;
    if (!character) return;

    const bodyMat = character.bodyMaterial;
    if (bodyMat.userData.baseHex === undefined) {
      bodyMat.userData.baseHex = bodyMat.color.getHex();
    }
    bodyMat.color.setHex(bodyMat.userData.baseHex as number);

    for (const material of character.tintMaterials) {
      if (material.userData.baseHex === undefined) {
        material.userData.baseHex = material.color.getHex();
      }
      material.color.setHex(material.userData.baseHex as number);
    }

    for (const material of character.face.eyeMaterials) {
      if (material.userData.baseEmissive === undefined) {
        material.userData.baseEmissive = material.emissive.getHex();
        material.userData.baseEmissiveIntensity = material.emissiveIntensity;
      }
      material.emissive.setHex(material.userData.baseEmissive as number);
      material.emissiveIntensity = material.userData.baseEmissiveIntensity as number;
    }
  }

  start() {
    const tick = () => {
      const delta = this.clock.getDelta();
      const elapsed = this.clock.elapsedTime;
      this.emotion = this.targetEmotion;
      const profile = emotionProfiles[this.emotion];
      const character = this.character;
      if (!character) {
        this.raf = window.requestAnimationFrame(tick);
        return;
      }

      const focus = this.contextSignal.focus;
      const curiosity = this.contextSignal.curiosity;
      const load = this.contextSignal.load;
      const pace = 0.75 + curiosity * 1.2 + load * 0.55;
      const settle = 0.85 - focus * 0.25;

      if (this.emotion === 'idle' || this.emotion === 'bored') {
        this.idleSeconds += delta;
      } else {
        this.idleSeconds = 0;
      }

      if (this.emotion === 'bored') {
        this.sitTimer += delta;
        if (this.sitTimer > 1.2) {
          this.pose = 'sit';
        }
      } else if (this.emotion !== 'idle' || this.idleSeconds < 8) {
        if (this.pose === 'sit') {
          this.pose = 'stand';
        }
      } else if (this.idleSeconds > 8) {
        this.pose = 'sit';
      }

      if (this.pose === 'jump') {
        this.jumpPhase += delta * 2.8;
        if (this.jumpPhase >= Math.PI) {
          this.pose = 'stand';
          this.jumpImpulse = 0;
          this.jumpPhase = 0;
        }
      }

      const sitTarget = this.pose === 'sit' ? 1 : 0;
      this.poseBlend = THREE.MathUtils.lerp(this.poseBlend, sitTarget, delta * 4.5);

      const jumpHeight =
        this.pose === 'jump' ? Math.sin(this.jumpPhase) * (0.55 + this.jumpImpulse * 0.15) : 0;
      const isJerry = character.id === 'jerry';
      const sitDrop = this.poseBlend * (isJerry ? 0.18 : 0.42);
      const sitLean = this.poseBlend * (isJerry ? 0.12 : 0.22);

      const ambientBob = Math.sin(elapsed * (1.6 + curiosity)) * profile.bob * (1 - this.poseBlend * 0.7);
      const drift = Math.sin(elapsed * profile.sway) * (0.12 + focus * 0.08);
      const lean = profile.lean + (load - 0.5) * 0.18 + sitLean;
      const pulse = 1 + Math.sin(elapsed * (2.8 + curiosity)) * (0.01 + focus * 0.012);

      this.rig.rotation.y = drift * settle;
      this.rig.rotation.x = lean;
      this.rig.position.y = ambientBob + profile.lift + jumpHeight - sitDrop;
      this.rig.scale.setScalar(profile.scale * pulse);

      character.body.rotation.z = Math.sin(elapsed * 1.1) * 0.04 * settle * (1 - this.poseBlend);
      character.head.rotation.y = Math.sin(elapsed * 1.8) * 0.08 + (curiosity - 0.5) * 0.28;
      character.head.rotation.x =
        Math.sin(elapsed * 1.4) * 0.05 - (load - 0.5) * 0.14 + this.poseBlend * 0.18 - jumpHeight * 0.15;
      character.accentRing.rotation.y += delta * pace * 0.45;

      if (isJerry) {
        const handSway = Math.sin(elapsed * 1.3) * 0.05;
        character.leftLeg.rotation.z = handSway;
        character.rightLeg.rotation.z = -handSway;
        character.leftLeg.position.y = -this.poseBlend * 0.04;
        character.rightLeg.position.y = -this.poseBlend * 0.04;
      } else {
        const legSpread = 0.28 + this.poseBlend * 0.18;
        const legBend = this.poseBlend * 0.55 + jumpHeight * 0.4;
        character.leftLeg.position.x = -legSpread;
        character.rightLeg.position.x = legSpread;
        character.leftLeg.rotation.x = legBend;
        character.rightLeg.rotation.x = legBend;
        character.legs.position.y = -sitDrop * 0.35;
      }

      this.updateFace(character, elapsed, profile);
      this.updateAccents(character, elapsed, delta, pace, focus, profile, curiosity);
      this.updateShadow(jumpHeight, sitDrop, profile.scale * pulse);

      this.renderer.render(this.scene, this.camera);
      this.raf = window.requestAnimationFrame(tick);
    };

    tick();
  }

  private updateShadow(jumpHeight: number, sitDrop: number, scale: number) {
    const heightFactor = 1 - jumpHeight * 1.35 + sitDrop * 0.35;
    const shadowScale = (0.92 + sitDrop * 0.22) / Math.max(0.55, heightFactor) * scale;
    this.shadow.scale.set(shadowScale, shadowScale * (0.85 + sitDrop * 0.1), 1);
    const mat = this.shadow.material as THREE.MeshBasicMaterial;
    mat.opacity = THREE.MathUtils.lerp(0.5, 0.22, jumpHeight * 1.6) * (0.75 + sitDrop * 0.15);
  }

  private updateFace(character: CharacterRig, elapsed: number, profile: EmotionProfile) {
    const { face } = character;
    const mouthHappy = this.emotion === 'happy';
    const mouthBored = this.emotion === 'bored';
    const mouthSurprised = this.emotion === 'surprised';

    const isJerry = character.id === 'jerry';
    const isSparky = character.id === 'sparky';
    face.mouthMaterial.color = new THREE.Color(
      isJerry
        ? mouthHappy
          ? 0x3a2818
          : mouthBored
            ? 0x5a5048
            : mouthSurprised
              ? 0x2a1810
              : 0x3a2818
        : mouthHappy
          ? 0x2d4c1f
          : mouthBored
            ? 0x4d5870
            : mouthSurprised
              ? 0x5a3020
              : 0x1d2f4c
    );

    if (face.mouth) {
      if (isJerry) {
        const jerrySmile = mouthBored ? 0.88 : mouthSurprised ? 1.18 : 1.15;
        face.mouth.scale.set(jerrySmile, jerrySmile, 1);
        face.mouth.rotation.z = 0;
      } else {
        const mouthScale = mouthHappy ? 1.35 : mouthBored ? 0.72 : mouthSurprised ? 1.5 : 1;
        face.mouth.scale.set(mouthScale, mouthHappy ? 1.2 : mouthSurprised ? 0.85 : 1, 1);
      }
    }

    for (let i = 0; i < face.brows.length; i += 1) {
      const brow = face.brows[i];
      if (isJerry) {
        const side = i === 0 ? -1 : 1;
        const base = side * 0.14;
        const mood = mouthBored ? -0.16 : mouthSurprised ? -0.22 : -0.04;
        brow.rotation.z = base + side * mood;
      } else if (isSparky) {
        const side = i === 0 ? -1 : 1;
        const base = side * -0.28;
        const mood =
          mouthBored ? 0.14 : mouthSurprised ? -0.18 : mouthHappy ? -0.08 : -0.06;
        brow.rotation.z = base + side * mood;
      } else {
        brow.rotation.z =
          this.emotion === 'happy'
            ? -0.08
            : this.emotion === 'bored'
              ? 0.12
              : this.emotion === 'surprised'
                ? -0.22
                : this.emotion === 'thinking'
                  ? 0.06
                  : 0;
      }
    }

    for (const material of face.eyeMaterials) {
      if (material.userData.baseEmissiveIntensity === undefined) {
        material.userData.baseEmissiveIntensity = material.emissiveIntensity;
      }
      material.emissiveIntensity = material.userData.baseEmissiveIntensity as number;
    }

    const blinkCycle = (elapsed * 1.5) % 4;
    const blink =
      blinkCycle > 3.55 ? Math.max(0.06, 1 - (blinkCycle - 3.55) * 7) : 1;
    const emotionEyeScale = mouthBored ? 0.72 : mouthSurprised ? 1.18 : 1;

    for (let i = 0; i < face.pupils.length; i += 1) {
      const pupil = face.pupils[i];
      const eye = face.eyes[i];
      if (!eye) continue;

      if (!pupil.userData.home) {
        pupil.userData.home = {
          x: pupil.position.x - eye.position.x,
          y: pupil.position.y - eye.position.y,
          z: pupil.position.z - eye.position.z
        };
      }
      const home = pupil.userData.home as { x: number; y: number; z: number };
      pupil.position.set(eye.position.x + home.x, eye.position.y + home.y, eye.position.z + home.z);

      if (eye.userData.baseScaleY === undefined) {
        eye.userData.baseScaleY = eye.scale.y;
      }
      const baseY = eye.userData.baseScaleY as number;
      eye.scale.y = baseY * emotionEyeScale * blink;
      pupil.visible = blink > 0.12;
    }
  }

  private updateAccents(
    character: CharacterRig,
    elapsed: number,
    delta: number,
    pace: number,
    focus: number,
    profile: EmotionProfile,
    curiosity: number
  ) {
    if (character.id === 'crystal') {
      for (let index = 0; index < character.accentMeshes.length; index += 1) {
        const shard = character.accentMeshes[index];
        const direction = index % 2 === 0 ? 1 : -1;
        shard.rotation.y += delta * direction * (0.3 + pace * 0.2);
        shard.position.y = 1.8 + Math.sin(elapsed * (2 + focus) + index) * (0.05 + profile.accentSpread * 0.05);
        shard.scale.setScalar(0.85 + curiosity * 0.3);
      }
    }

    if (character.id === 'sparky' && character.accentMeshes[0]) {
      character.accentMeshes[0].rotation.z = Math.sin(elapsed * 4) * 0.25;
    }

    if (character.id === 'jerry' && character.accentMeshes[0]) {
      character.accentMeshes[0].rotation.y = Math.sin(elapsed * 2.2) * 0.35;
    }
  }

  stop() {
    window.cancelAnimationFrame(this.raf);
  }
}
