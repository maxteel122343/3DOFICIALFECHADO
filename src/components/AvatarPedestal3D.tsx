import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CustomizationItem, AvatarPoseConfig } from '../types';

interface AvatarPedestal3DProps {
  currentPose: string; // 'Em pé' | 'Sentar' | 'Deitar' | 'Rindo' | etc.
  equippedItems: CustomizationItem[];
  avatarModelUrl?: string;
  avatarName?: string;
  fineAdjustments: {
    panX: number;
    panY: number;
    rotationY: number;
    scale: number;
    elevationY: number;
  };
  onUpdateRotation?: (rotY: number) => void;
  onUpdateElevation?: (elevY: number) => void;
  onUpdateScale?: (scale: number) => void;
  onUpdatePan?: (x: number, y: number) => void;
  onRegisterSnapshotTaker?: (taker: () => string | null) => void;
}

export const AvatarPedestal3D: React.FC<AvatarPedestal3DProps> = ({
  currentPose,
  equippedItems,
  avatarModelUrl,
  avatarName = 'Noite de Gala',
  fineAdjustments,
  onUpdateRotation,
  onRegisterSnapshotTaker,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const pedestalGroupRef = useRef<THREE.Group | null>(null);

  // Mouse interaction
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const internalRotationRef = useRef(fineAdjustments.rotationY);

  useEffect(() => {
    internalRotationRef.current = fineAdjustments.rotationY;
  }, [fineAdjustments.rotationY]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 650;

    // Scene setup with ultra dark luxury backdrop
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b0e);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 1.45, 4.2);
    camera.lookAt(0, 1.05, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    if (onRegisterSnapshotTaker) {
      onRegisterSnapshotTaker(() => {
        try {
          if (!rendererRef.current) return null;
          return rendererRef.current.domElement.toDataURL('image/png');
        } catch (err) {
          console.error('Failed to capture snapshot from WebGL canvas:', err);
          return null;
        }
      });
    }

    // Lighting (Dark Studio Lighting)
    // 1. Soft Ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    // 2. Warm Key Light from Top-Front
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.6);
    keyLight.position.set(2.5, 4.5, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // 3. Cool Subtle Rim Light from Behind
    const rimLight = new THREE.DirectionalLight(0xddeeff, 1.1);
    rimLight.position.set(-2.5, 3.2, -2.8);
    scene.add(rimLight);

    // 4. Subtle Warm Gold Accent Underlight for Pedestal
    const goldAccentLight = new THREE.PointLight(0xc5a059, 1.8, 4.5);
    goldAccentLight.position.set(0, 0.05, 0);
    scene.add(goldAccentLight);

    // BUILD PEDESTAL (Black Obsidian Cylindrical Podium)
    const pedestalGroup = new THREE.Group();
    pedestalGroupRef.current = pedestalGroup;

    // Top Platform (Obsidian Glossy Disc)
    const discGeo = new THREE.CylinderGeometry(1.28, 1.32, 0.12, 64);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x14151a,
      roughness: 0.22,
      metalness: 0.65,
    });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    discMesh.position.y = 0.06;
    discMesh.receiveShadow = true;
    pedestalGroup.add(discMesh);

    // Gold Beveled Trim Ring
    const goldRingGeo = new THREE.TorusGeometry(1.30, 0.022, 16, 64);
    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      roughness: 0.28,
      metalness: 0.9,
    });
    const goldRing = new THREE.Mesh(goldRingGeo, goldRingMat);
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = 0.12;
    pedestalGroup.add(goldRing);

    // Lower Stepped Base
    const baseGeo = new THREE.CylinderGeometry(1.42, 1.48, 0.06, 64);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0d0e12,
      roughness: 0.45,
      metalness: 0.4,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.01;
    baseMesh.receiveShadow = true;
    pedestalGroup.add(baseMesh);

    // Floor Shadow / Contact disc
    const floorGeo = new THREE.CircleGeometry(2.2, 48);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x050608,
      transparent: true,
      opacity: 0.85,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.042;
    pedestalGroup.add(floorMesh);

    scene.add(pedestalGroup);

    // BUILD AVATAR 3D GROUP
    const avatarGroup = new THREE.Group();
    avatarGroupRef.current = avatarGroup;
    scene.add(avatarGroup);

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (avatarGroupRef.current) {
        // Apply smooth rotation & adjustments
        avatarGroupRef.current.rotation.y = internalRotationRef.current;
        avatarGroupRef.current.position.set(
          fineAdjustments.panX,
          0.12 + fineAdjustments.elevationY,
          fineAdjustments.panY
        );
        const s = fineAdjustments.scale;
        avatarGroupRef.current.scale.set(s, s, s);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Mouse Drag for Orbit Rotation
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - prevMouseRef.current.x;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      const newRot = internalRotationRef.current + deltaX * 0.012;
      internalRotationRef.current = newRot;
      if (onUpdateRotation) {
        onUpdateRotation(newRot);
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z = THREE.MathUtils.clamp(
        cameraRef.current.position.z + e.deltaY * 0.003,
        2.2,
        6.5
      );
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      renderer.dispose();
    };
  }, []);

  // Update Avatar Model/Meshes whenever Pose or Equipped Items change
  useEffect(() => {
    if (!avatarGroupRef.current) return;
    const group = avatarGroupRef.current;

    // Clear previous avatar meshes
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
    }

    if (avatarModelUrl) {
      const loader = new GLTFLoader();
      loader.load(
        avatarModelUrl,
        (gltf) => {
          const customModel = gltf.scene;
          const box = new THREE.Box3().setFromObject(customModel);
          const size = box.getSize(new THREE.Vector3());
          const targetHeight = 1.75;
          const s = targetHeight / Math.max(0.1, size.y);
          customModel.scale.set(s, s, s);

          const scaledBox = new THREE.Box3().setFromObject(customModel);
          const center = scaledBox.getCenter(new THREE.Vector3());
          customModel.position.x = -center.x;
          customModel.position.z = -center.z;
          customModel.position.y = 0.12 - scaledBox.min.y;

          customModel.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
            }
          });

          group.add(customModel);
        },
        undefined,
        () => {
          // Fallback if loading failed
          console.warn('Could not load custom avatar GLB model, falling back to base model');
        }
      );
      return;
    }

    // Check equipped items
    const hasBeret = equippedItems.some((i) => i.equipped && (i.code === '#H001' || i.category === 'chapeus'));
    const hasFedora = equippedItems.some((i) => i.equipped && i.code === '#H002');
    const hasTopHat = equippedItems.some((i) => i.equipped && i.code === '#H003');
    const hasCoat = equippedItems.some((i) => i.equipped && (i.code === '#C001' || i.category === 'casacos'));
    const hasLeatherJacket = equippedItems.some((i) => i.equipped && i.code === '#C002');
    const hasBoots = equippedItems.some((i) => i.equipped && (i.code === '#S003' || i.category === 'sapatos'));

    // Poses offsets and arm orientations
    let isSeated = currentPose === 'Sentar';
    let isReclined = currentPose === 'Deitar';
    let isLaughing = currentPose === 'Rindo';
    let isWaving = currentPose === 'Acenar';
    let isModelPose = currentPose === 'Modelo Noir';

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf5cfb3,
      roughness: 0.55,
      metalness: 0.05,
    });
    const darkHairMat = new THREE.MeshStandardMaterial({
      color: 0x181310,
      roughness: 0.85,
      metalness: 0.1,
    });
    const blackFabricMat = new THREE.MeshStandardMaterial({
      color: 0x16171b,
      roughness: 0.72,
      metalness: 0.15,
    });
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.35,
      metalness: 0.35,
    });
    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.85,
    });

    // Root model container
    const modelRoot = new THREE.Group();

    if (isSeated) {
      modelRoot.position.y = -0.38;
    } else if (isReclined) {
      modelRoot.rotation.x = -Math.PI / 4;
      modelRoot.position.y = -0.25;
      modelRoot.position.z = -0.2;
    }

    // 1. Head & Neck
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.64, 0);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.16, 24);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = -0.06;
    headGroup.add(neckMesh);

    // High Turtleneck Collar (Noir)
    const collarGeo = new THREE.CylinderGeometry(0.075, 0.088, 0.12, 24);
    const collarMesh = new THREE.Mesh(collarGeo, blackFabricMat);
    collarMesh.position.y = -0.08;
    headGroup.add(collarMesh);

    // Head Oval
    const headGeo = new THREE.SphereGeometry(0.125, 32, 28);
    headGeo.scale(0.92, 1.15, 0.98);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Hair bun / updo
    const hairGeo = new THREE.SphereGeometry(0.138, 28, 24);
    hairGeo.scale(1.02, 1.05, 1.08);
    const hairMesh = new THREE.Mesh(hairGeo, darkHairMat);
    hairMesh.position.set(0, 0.03, -0.02);
    headGroup.add(hairMesh);

    // Chignon Bun behind
    const bunGeo = new THREE.SphereGeometry(0.075, 20, 20);
    const bunMesh = new THREE.Mesh(bunGeo, darkHairMat);
    bunMesh.position.set(0, 0.02, -0.13);
    headGroup.add(bunMesh);

    // HATS / ACCESSORIES ON HEAD
    if (hasBeret) {
      // Velvet Beret (slanted slightly)
      const beretGroup = new THREE.Group();
      beretGroup.position.set(0.02, 0.12, -0.01);
      beretGroup.rotation.z = -0.28;
      beretGroup.rotation.x = -0.08;

      const beretCrownGeo = new THREE.CylinderGeometry(0.18, 0.13, 0.055, 32);
      const beretMat = new THREE.MeshStandardMaterial({
        color: 0x111215,
        roughness: 0.95,
        metalness: 0.05,
      });
      const beretCrown = new THREE.Mesh(beretCrownGeo, beretMat);
      beretGroup.add(beretCrown);

      // Gold Pin on Beret
      const pinGeo = new THREE.SphereGeometry(0.016, 12, 12);
      const pinMesh = new THREE.Mesh(pinGeo, goldAccentMat);
      pinMesh.position.set(0.12, 0.02, 0.08);
      beretGroup.add(pinMesh);

      headGroup.add(beretGroup);
    } else if (hasFedora) {
      const fedoraGroup = new THREE.Group();
      fedoraGroup.position.set(0, 0.13, 0);

      // Brim
      const brimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.02, 32);
      const fedoraBrim = new THREE.Mesh(brimGeo, blackFabricMat);
      fedoraGroup.add(fedoraBrim);

      // Crown
      const crownGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.11, 32);
      const fedoraCrown = new THREE.Mesh(crownGeo, blackFabricMat);
      fedoraCrown.position.y = 0.06;
      fedoraGroup.add(fedoraCrown);

      headGroup.add(fedoraGroup);
    } else if (hasTopHat) {
      const topHatGroup = new THREE.Group();
      topHatGroup.position.set(0, 0.13, 0);

      const brimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.02, 32);
      const hatBrim = new THREE.Mesh(brimGeo, leatherMat);
      topHatGroup.add(hatBrim);

      const crownGeo = new THREE.CylinderGeometry(0.135, 0.14, 0.22, 32);
      const hatCrown = new THREE.Mesh(crownGeo, leatherMat);
      hatCrown.position.y = 0.11;
      topHatGroup.add(hatCrown);

      headGroup.add(topHatGroup);
    }

    if (isLaughing) {
      headGroup.rotation.x = -0.15;
      headGroup.rotation.z = 0.12;
    }

    modelRoot.add(headGroup);

    // 2. Torso / Jacket / Long Coat
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.25, 0);

    // Fitted Chest
    const chestGeo = new THREE.CylinderGeometry(0.17, 0.14, 0.44, 24);
    const chestMesh = new THREE.Mesh(chestGeo, blackFabricMat);
    chestMesh.castShadow = true;
    torsoGroup.add(chestMesh);

    // Belt / Waistline with subtle gold buckle
    const beltGeo = new THREE.CylinderGeometry(0.145, 0.15, 0.045, 24);
    const beltMesh = new THREE.Mesh(beltGeo, leatherMat);
    beltMesh.position.y = -0.22;
    torsoGroup.add(beltMesh);

    const buckleGeo = new THREE.BoxGeometry(0.04, 0.03, 0.02);
    const buckleMesh = new THREE.Mesh(buckleGeo, goldAccentMat);
    buckleMesh.position.set(0, -0.22, 0.15);
    torsoGroup.add(buckleMesh);

    // Long Tailored Coat Drape (Matching Image 2 / Image 3 Trench Coat)
    if (hasCoat || !hasLeatherJacket) {
      const coatGeo = new THREE.CylinderGeometry(0.16, 0.32, 0.95, 32, 1, true);
      const coatMesh = new THREE.Mesh(coatGeo, blackFabricMat);
      coatMesh.position.y = -0.58;
      coatMesh.castShadow = true;
      torsoGroup.add(coatMesh);

      // Coat Lapels
      const lapelLGeo = new THREE.BoxGeometry(0.08, 0.36, 0.03);
      const lapelL = new THREE.Mesh(lapelLGeo, blackFabricMat);
      lapelL.position.set(-0.06, 0.04, 0.17);
      lapelL.rotation.z = 0.15;
      torsoGroup.add(lapelL);

      const lapelRGeo = new THREE.BoxGeometry(0.08, 0.36, 0.03);
      const lapelR = new THREE.Mesh(lapelRGeo, blackFabricMat);
      lapelR.position.set(0.06, 0.04, 0.17);
      lapelR.rotation.z = -0.15;
      torsoGroup.add(lapelR);
    } else {
      // Leather Jacket
      const jacketGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.50, 24);
      const jacketMesh = new THREE.Mesh(jacketGeo, leatherMat);
      torsoGroup.add(jacketMesh);
    }

    modelRoot.add(torsoGroup);

    // 3. Arms
    // Left Arm
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.21, 1.42, 0);

    const armGeo = new THREE.CylinderGeometry(0.05, 0.042, 0.56, 16);
    const leftArmMesh = new THREE.Mesh(armGeo, blackFabricMat);
    leftArmMesh.position.y = -0.26;
    leftArm.add(leftArmMesh);

    // Hand
    const handGeo = new THREE.SphereGeometry(0.038, 12, 12);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.y = -0.56;
    leftArm.add(leftHand);

    // Right Arm
    const rightArm = new THREE.Group();
    rightArm.position.set(0.21, 1.42, 0);

    const rightArmMesh = new THREE.Mesh(armGeo, blackFabricMat);
    rightArmMesh.position.y = -0.26;
    rightArm.add(rightArmMesh);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.y = -0.56;
    rightArm.add(rightHand);

    // Arm Poses
    if (isWaving) {
      rightArm.rotation.z = -2.2;
      rightArm.rotation.x = -0.3;
    } else if (isLaughing) {
      leftArm.rotation.x = 0.5;
      leftArm.rotation.z = 0.3;
      rightArm.rotation.x = 0.8;
      rightArm.rotation.z = -0.4;
      rightHand.position.set(-0.08, -0.46, 0.2);
    } else if (isModelPose) {
      leftArm.rotation.z = 0.35;
      leftArm.rotation.x = -0.25;
      rightArm.rotation.z = -0.45;
      rightArm.rotation.x = 0.15;
    } else {
      // Default: hands relaxed / coat pocket gesture (matching Image 2)
      leftArm.rotation.z = 0.12;
      leftArm.rotation.x = 0.22;
      rightArm.rotation.z = -0.12;
      rightArm.rotation.x = 0.22;
    }

    modelRoot.add(leftArm);
    modelRoot.add(rightArm);

    // 4. Legs and Boots
    const legsGroup = new THREE.Group();
    legsGroup.position.set(0, 0.95, 0);

    const legGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.82, 16);
    const leftLegMesh = new THREE.Mesh(legGeo, blackFabricMat);
    leftLegMesh.position.set(-0.09, -0.41, 0);
    leftLegMesh.castShadow = true;
    legsGroup.add(leftLegMesh);

    const rightLegMesh = new THREE.Mesh(legGeo, blackFabricMat);
    rightLegMesh.position.set(0.09, -0.41, 0);
    rightLegMesh.castShadow = true;
    legsGroup.add(rightLegMesh);

    // Boots / Shoes (Heels / Chelsea)
    const shoeGeo = new THREE.BoxGeometry(0.09, 0.11, 0.21);
    const leftShoe = new THREE.Mesh(shoeGeo, leatherMat);
    leftShoe.position.set(-0.09, -0.84, 0.035);
    leftShoe.castShadow = true;
    legsGroup.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, leatherMat);
    rightShoe.position.set(0.09, -0.84, 0.035);
    rightShoe.castShadow = true;
    legsGroup.add(rightShoe);

    // Heel Peg
    if (hasBoots) {
      const heelGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.09, 12);
      const leftHeel = new THREE.Mesh(heelGeo, leatherMat);
      leftHeel.position.set(-0.09, -0.88, -0.05);
      legsGroup.add(leftHeel);

      const rightHeel = new THREE.Mesh(heelGeo, leatherMat);
      rightHeel.position.set(0.09, -0.88, -0.05);
      legsGroup.add(rightHeel);
    }

    if (isSeated) {
      legsGroup.rotation.x = Math.PI / 2.2;
      legsGroup.position.y = 0.55;
    }

    modelRoot.add(legsGroup);

    group.add(modelRoot);
  }, [currentPose, equippedItems, avatarModelUrl, avatarName]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[460px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden"
    >
      {/* Discreet 3D Drag Hint */}
      <div className="absolute top-4 right-4 pointer-events-none text-[11px] text-zinc-500 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/5">
        <span>Arraste para girar 360°</span>
      </div>
    </div>
  );
};
