import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AvatarPose, AvatarTransform, Spot, RoomEditorState } from '../types';

interface LoungeCanvas3DProps {
  currentPose: AvatarPose;
  transform: AvatarTransform;
  spots: Spot[];
  currentSpotId: number;
  onSelectSpot: (spotId: number) => void;
  cameraMode: 'orbit' | 'frontal' | 'closeup' | 'topdown';
  equippedAccessories: string[];
  onUpdateAvatarHeadScreenPos?: (positions: Record<number, { x: number; y: number }>) => void;
  editorRoom?: RoomEditorState;
  showSpotArrows?: boolean;
}

export const LoungeCanvas3D: React.FC<LoungeCanvas3DProps> = ({
  currentPose,
  transform,
  spots,
  currentSpotId,
  onSelectSpot,
  cameraMode,
  equippedAccessories,
  onUpdateAvatarHeadScreenPos,
  editorRoom,
  showSpotArrows = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const headPosRef = useRef<Record<number, THREE.Vector3>>({});
  const animationFrameRef = useRef<number>(0);
  const spotClickablesGroupRef = useRef<THREE.Group | null>(null);
  const spotAnimatedMeshesRef = useRef<
    Array<{
      group: THREE.Group;
      arrowGroup: THREE.Group;
      arrowMat: THREE.MeshBasicMaterial;
      outerRingMat: THREE.MeshBasicMaterial;
      innerRingMat: THREE.MeshBasicMaterial;
      spotId: number;
      baseY: number;
    }>
  >([]);

  const currentSpotIdRef = useRef(currentSpotId);
  currentSpotIdRef.current = currentSpotId;

  const showSpotArrowsRef = useRef(showSpotArrows);
  showSpotArrowsRef.current = showSpotArrows;

  const onSelectSpotRef = useRef(onSelectSpot);
  onSelectSpotRef.current = onSelectSpot;

  // Mouse orbit interaction
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAnglesRef = useRef({ theta: 0, phi: 0.18, radius: 4.8 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#141416');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.4, 4.8);
    camera.lookAt(0, 0.45, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting matching Reference Image 1 (warm architectural cove lighting + directional key light)
    const ambientLight = new THREE.AmbientLight(0xd9d0c5, 0.65);
    scene.add(ambientLight);

    // Warm cove strip light along top back wall
    const coveLight = new THREE.DirectionalLight(0xffecd2, 1.2);
    coveLight.position.set(0, 3.2, -1.8);
    coveLight.castShadow = true;
    coveLight.shadow.mapSize.width = 1024;
    coveLight.shadow.mapSize.height = 1024;
    scene.add(coveLight);

    // Warm ceiling spot focusing on rug
    const spotLight = new THREE.SpotLight(0xffdfa8, 2.5, 12, Math.PI / 3.5, 0.4, 1);
    spotLight.position.set(0, 4.0, 1.5);
    spotLight.target.position.set(0, 0.2, 0);
    spotLight.castShadow = true;
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Subtle blue fill from front
    const fillLight = new THREE.DirectionalLight(0x90a4ae, 0.35);
    fillLight.position.set(0, 2.0, 4.0);
    scene.add(fillLight);

    // Architectural Concrete Lounge Room (Reference 1)
    const roomMaterial = new THREE.MeshStandardMaterial({
      color: 0x38393c,
      roughness: 0.85,
      metalness: 0.1,
    });

    // Floor (smooth dark concrete)
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x222326,
      roughness: 0.6,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Back Wall with cove ledge
    const backWallGeo = new THREE.PlaneGeometry(16, 8);
    const backWall = new THREE.Mesh(backWallGeo, roomMaterial);
    backWall.position.set(0, 4, -3.2);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Cove ledge geometry
    const ledgeGeo = new THREE.BoxGeometry(16, 0.15, 0.4);
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x2d2e30, roughness: 0.7 });
    const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
    ledge.position.set(0, 3.4, -3.0);
    scene.add(ledge);

    // Warm LED strip glowing line on ledge
    const stripGeo = new THREE.BoxGeometry(16, 0.05, 0.05);
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xffe2b2 });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, 3.48, -2.95);
    scene.add(strip);

    // Right Wall with shelf niche (seen in Reference 1)
    const rightWallGeo = new THREE.PlaneGeometry(12, 8);
    const rightWall = new THREE.Mesh(rightWallGeo, roomMaterial);
    rightWall.position.set(4.5, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Shelf niche interior
    const shelfGeo = new THREE.BoxGeometry(0.35, 1.8, 2.2);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x1f2022, roughness: 0.9 });
    const shelfNiche = new THREE.Mesh(shelfGeo, shelfMat);
    shelfNiche.position.set(4.35, 1.6, -1.0);
    scene.add(shelfNiche);

    // Warm light inside shelf
    const shelfLight = new THREE.PointLight(0xffd599, 1.2, 3);
    shelfLight.position.set(4.1, 1.8, -1.0);
    scene.add(shelfLight);

    // Decorative vase on shelf
    const vaseGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 16);
    const vaseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
    const vase = new THREE.Mesh(vaseGeo, vaseMat);
    vase.position.set(4.2, 1.1, -1.2);
    scene.add(vase);

    // Golden Carpet with Fringes (Reference 1)
    const rugGeo = new THREE.PlaneGeometry(4.4, 2.6);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x9b7a3e,
      roughness: 0.75,
      metalness: 0.35,
    });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.015, 0.1);
    rug.receiveShadow = true;
    scene.add(rug);

    // Spot Meshes: Glowing circles (círculos brilhantes) + discreet blinking down-arrow
    const spotClickablesGroup = new THREE.Group();
    scene.add(spotClickablesGroup);
    spotClickablesGroupRef.current = spotClickablesGroup;
    spotAnimatedMeshesRef.current = [];

    const createGlowingSpotMesh = (spotId: number, posX: number, posY: number, posZ: number) => {
      const group = new THREE.Group();
      group.position.set(posX, posY, posZ);
      (group as any).userData = { spotId, isSpotInteractive: true };

      // 1. Ground Glowing Disc (Thin circle flat on the floor at Y = 0.015)
      const discGeo = new THREE.CircleGeometry(0.48, 32);
      const discMat = new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.015;
      (disc as any).userData = { spotId, isSpotInteractive: true };
      group.add(disc);

      // 2. Outer Luminous Neon Ring
      const outerRingGeo = new THREE.RingGeometry(0.42, 0.50, 32);
      const outerRingMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
      outerRing.rotation.x = -Math.PI / 2;
      outerRing.position.y = 0.018;
      (outerRing as any).userData = { spotId, isSpotInteractive: true };
      group.add(outerRing);

      // 3. Inner Pulsing Halo Ring
      const innerRingGeo = new THREE.RingGeometry(0.20, 0.25, 32);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color: 0xfff0a0,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.02;
      (innerRing as any).userData = { spotId, isSpotInteractive: true };
      group.add(innerRing);

      // 4. Center Beacon Dot
      const centerDotGeo = new THREE.CircleGeometry(0.07, 16);
      const centerDotMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const centerDot = new THREE.Mesh(centerDotGeo, centerDotMat);
      centerDot.rotation.x = -Math.PI / 2;
      centerDot.position.y = 0.022;
      (centerDot as any).userData = { spotId, isSpotInteractive: true };
      group.add(centerDot);

      // 5. Floating Discreet Blinking Arrow pointing down (seta piscando p baixo)
      const arrowGroup = new THREE.Group();
      arrowGroup.name = `spotArrow-${spotId}`;
      (arrowGroup as any).userData = { spotId, isSpotArrow: true };

      // Inverted Cone (pointing down: tip at bottom)
      const coneGeo = new THREE.ConeGeometry(0.11, 0.24, 16);
      const arrowMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.85,
      });
      const cone = new THREE.Mesh(coneGeo, arrowMat);
      cone.rotation.x = Math.PI; // Inverted pointing downwards!
      cone.position.y = 0.82;
      (cone as any).userData = { spotId, isSpotInteractive: true };
      arrowGroup.add(cone);

      // Small round base for the arrow
      const capGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.04, 16);
      const cap = new THREE.Mesh(capGeo, arrowMat);
      cap.position.y = 0.94;
      (cap as any).userData = { spotId, isSpotInteractive: true };
      arrowGroup.add(cap);

      group.add(arrowGroup);
      spotClickablesGroup.add(group);

      spotAnimatedMeshesRef.current.push({
        group,
        arrowGroup,
        arrowMat,
        outerRingMat,
        innerRingMat,
        spotId,
        baseY: 0,
      });

      return group;
    };

    // Spot Meshes: either from editorRoom spots or default 3 spots
    if (editorRoom && spots.length > 0) {
      spots.forEach((spot) => {
        createGlowingSpotMesh(spot.id, spot.position[0], spot.position[1], spot.position[2]);
      });
    } else {
      // Spot 1: Left (Maya)
      createGlowingSpotMesh(1, -1.45, 0, 0);

      // Spot 2: Center (Player)
      createGlowingSpotMesh(2, 0, 0, 0.2);

      // Spot 3: Right (Zack)
      createGlowingSpotMesh(3, 1.45, 0, 0);
    }

    // If editorRoom has placedObjects, render them!
    if (editorRoom?.placedObjects && editorRoom.placedObjects.length > 0) {
      const gltfLoader = new GLTFLoader();
      editorRoom.placedObjects.forEach((obj) => {
        const objGroup = new THREE.Group();
        objGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
        objGroup.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
        objGroup.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);

        if (obj.fileBlobUrl) {
          gltfLoader.load(obj.fileBlobUrl, (gltf) => {
            objGroup.add(gltf.scene);
          });
        } else if (
          obj.type === 'avatar' ||
          obj.isAvatar ||
          obj.name.toLowerCase().includes('avatar')
        ) {
          const avatarMesh = createCharacterMesh({
            skinColor: 0xcca080,
            hairColor: 0x1f1b18,
            clothColor: 0xd4af37,
            pantsColor: 0x202227,
            hasGlasses: false,
            hasGoldChain: true,
            hairStyle: 'curly',
          });
          avatarMesh.position.y = 0.28;
          objGroup.add(avatarMesh);
        } else {
          // Stylish furniture mesh
          const sofaGeo = new THREE.BoxGeometry(1.8, 0.5, 0.8);
          const sofaMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.8 });
          const sofaMesh = new THREE.Mesh(sofaGeo, sofaMat);
          sofaMesh.position.y = 0.25;
          objGroup.add(sofaMesh);
        }
        scene.add(objGroup);
      });
    }

    // Create Avatar Meshes matching Reference Image 1 (only when not custom editorRoom)
    if (!editorRoom) {
      // Left Avatar: Maya (smiling, beige cozy sweater, cream pants)
      const mayaGroup = createCharacterMesh({
        skinColor: 0xdfb498,
        hairColor: 0x2c1d11,
        clothColor: 0xeee7db, // cream sweater
        pantsColor: 0xd8cbba, // cream pants
        hasGlasses: false,
        hasGoldChain: false,
        hairStyle: 'female-long',
      });
      mayaGroup.position.set(-1.45, 0.28, 0);
      mayaGroup.rotation.y = THREE.MathUtils.degToRad(20);
      scene.add(mayaGroup);

      // Right Avatar: Zack (glasses, army green hoodie, gold chain)
      const zackGroup = createCharacterMesh({
        skinColor: 0x966848,
        hairColor: 0x1a1a1a,
        clothColor: 0x475338, // army green hoodie
        pantsColor: 0x222429, // dark grey pants
        hasGlasses: true,
        hasGoldChain: true,
        hairStyle: 'afro-short',
      });
      zackGroup.position.set(1.45, 0.28, 0);
      zackGroup.rotation.y = THREE.MathUtils.degToRad(-25);
      scene.add(zackGroup);
    }

    // Center Avatar: Player (Luzenne - black hoodie, gold chain, sunglasses, customized pose)
    const playerGroup = createCharacterMesh({
      skinColor: 0xcca080,
      hairColor: 0x1f1b18,
      clothColor: 0x19191d, // black hoodie
      pantsColor: 0x202227, // black joggers
      hasGlasses: true,
      hasGoldChain: true,
      hairStyle: 'curly',
    });
    playerGroup.position.set(0, 0.28, 0.2);
    scene.add(playerGroup);
    playerGroupRef.current = playerGroup;

    // Track head positions in 3D for speech bubble placement
    headPosRef.current = {
      1: new THREE.Vector3(-1.45, 1.25, 0),
      2: new THREE.Vector3(0, 1.25, 0.2),
      3: new THREE.Vector3(1.45, 1.25, 0),
    };

    // Render loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Smooth camera orbit positioning
      if (cameraRef.current) {
        const cam = cameraRef.current;
        let targetRadius = cameraAnglesRef.current.radius;
        let targetPhi = cameraAnglesRef.current.phi;
        let targetTheta = cameraAnglesRef.current.theta;
        let targetLookAtY = 0.55;

        if (cameraMode === 'frontal') {
          targetRadius = 4.4;
          targetPhi = 0.1;
          targetTheta = 0;
          targetLookAtY = 0.5;
        } else if (cameraMode === 'closeup') {
          targetRadius = 2.4;
          targetPhi = 0.05;
          targetTheta = 0;
          targetLookAtY = 0.65;
        } else if (cameraMode === 'topdown') {
          targetRadius = 5.2;
          targetPhi = 0.75;
          targetTheta = 0;
          targetLookAtY = 0.2;
        }

        const x = targetRadius * Math.sin(targetTheta) * Math.cos(targetPhi);
        const y = targetRadius * Math.sin(targetPhi) + 0.35;
        const z = targetRadius * Math.cos(targetTheta) * Math.cos(targetPhi);

        cam.position.lerp(new THREE.Vector3(x, y, z), 0.05);
        cam.lookAt(0, targetLookAtY, 0);

        // Project 3D head positions to 2D screen coordinates
        if (onUpdateAvatarHeadScreenPos && container) {
          const rect = container.getBoundingClientRect();
          const screenPosMap: Record<number, { x: number; y: number }> = {};

          // Update player head position based on actual player avatar position in 3D
          if (playerGroupRef.current) {
            const playerWorldHead = new THREE.Vector3();
            playerGroupRef.current.getWorldPosition(playerWorldHead);
            // Position bubble directly over top of avatar head
            const headHeight = 1.30 * (transform.scale || 1.0) * (transform.sizeY || 1.0);
            playerWorldHead.y += headHeight;
            headPosRef.current[currentSpotIdRef.current] = playerWorldHead;
          }

          Object.entries(headPosRef.current).forEach(([idStr, vec3]) => {
            const tempVec = vec3.clone();
            tempVec.project(cam);
            if (tempVec.z < 1) {
              const screenX = ((tempVec.x + 1) / 2) * rect.width;
              const screenY = ((-tempVec.y + 1) / 2) * rect.height;
              screenPosMap[Number(idStr)] = { x: screenX, y: screenY };
            }
          });

          onUpdateAvatarHeadScreenPos(screenPosMap);
        }
      }

      // Animate spot circles & blinking down-arrows
      const time = performance.now() * 0.001;
      spotAnimatedMeshesRef.current.forEach((item) => {
        const isCurrentSpot = item.spotId === currentSpotIdRef.current;
        // Show arrow only if not currently occupying this spot and toggle is on
        const shouldShowArrow = showSpotArrowsRef.current && !isCurrentSpot;
        item.arrowGroup.visible = shouldShowArrow;

        if (shouldShowArrow) {
          // Bobbing up and down
          item.arrowGroup.position.y = item.baseY + Math.sin(time * 3.6) * 0.07;
          // Discreet blinking/pulsing opacity
          item.arrowMat.opacity = 0.45 + 0.55 * Math.abs(Math.sin(time * 3.2));
        }

        // Soft pulse on inner glowing circle
        item.innerRingMat.opacity = 0.35 + 0.45 * Math.sin(time * 2.8);
        item.outerRingMat.opacity = isCurrentSpot ? 0.95 : 0.70;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Direct 3D Raycasting on Click: click on spot circle / arrow to move there
    let clickStartX = 0;
    let clickStartY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      clickStartX = e.clientX;
      clickStartY = e.clientY;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      cameraAnglesRef.current.theta -= deltaX * 0.005;
      cameraAnglesRef.current.phi = Math.max(
        -0.05,
        Math.min(0.65, cameraAnglesRef.current.phi + deltaY * 0.005)
      );

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      isDraggingRef.current = false;

      // Detect click if drag was minimal (< 5px)
      const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
      if (dist < 5 && container && cameraRef.current && spotClickablesGroupRef.current) {
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(
          spotClickablesGroupRef.current.children,
          true
        );
        if (intersects.length > 0) {
          let hitObj: THREE.Object3D | null = intersects[0].object;
          while (hitObj && (hitObj as any).userData?.spotId === undefined && hitObj.parent) {
            hitObj = hitObj.parent;
          }
          if (hitObj && (hitObj as any).userData?.spotId !== undefined) {
            const clickedSpotId = (hitObj as any).userData.spotId;
            onSelectSpotRef.current(clickedSpotId);
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAnglesRef.current.radius = Math.max(
        2.2,
        Math.min(7.0, cameraAnglesRef.current.radius + e.deltaY * 0.003)
      );
    };

    // Keyboard arrow keys navigation to move scenario / orbit room
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        cameraAnglesRef.current.theta += 0.06;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        cameraAnglesRef.current.theta -= 0.06;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (e.shiftKey) {
          cameraAnglesRef.current.radius = Math.max(2.0, cameraAnglesRef.current.radius - 0.3);
        } else {
          cameraAnglesRef.current.phi = Math.min(0.65, cameraAnglesRef.current.phi + 0.04);
        }
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (e.shiftKey) {
          cameraAnglesRef.current.radius = Math.min(7.0, cameraAnglesRef.current.radius + 0.3);
        } else {
          cameraAnglesRef.current.phi = Math.max(-0.05, cameraAnglesRef.current.phi - 0.04);
        }
      }
    };

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = container.clientWidth / container.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domEl.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domEl.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, []);

  // Update Player transform & Spot position & Pose geometry
  useEffect(() => {
    if (!playerGroupRef.current) return;
    const player = playerGroupRef.current;

    // Spot position
    const activeSpot = spots.find((s) => s.id === currentSpotId) || spots[1];
    player.position.set(
      activeSpot.position[0],
      activeSpot.position[1] + (currentPose.heightOffset || 0),
      activeSpot.position[2]
    );

    // Transform from Gizmo (Scale, SizeY, Angle)
    player.scale.set(
      transform.scale,
      transform.scale * transform.sizeY,
      transform.scale
    );

    // Rotation: spot base angle + gizmo angle + pose angle offset
    const totalAngleDeg = activeSpot.rotation + transform.angle + (currentPose.rotationOffset || 0);
    player.rotation.y = THREE.MathUtils.degToRad(totalAngleDeg);
  }, [transform, currentPose, currentSpotId, spots]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden" ref={mountRef}>
      {/* Spot Click Targets Overlay */}
      <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
        {/* Helper overlay for spot clicks */}
      </div>
    </div>
  );
};

// Procedural stylized 3D avatar mesh builder matching the stylish figures in Reference 1
function createCharacterMesh(options: {
  skinColor: number;
  hairColor: number;
  clothColor: number;
  pantsColor: number;
  hasGlasses: boolean;
  hasGoldChain: boolean;
  hairStyle: 'female-long' | 'curly' | 'afro-short';
}) {
  const group = new THREE.Group();

  // Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: options.skinColor,
    roughness: 0.6,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: options.hairColor,
    roughness: 0.8,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: options.clothColor,
    roughness: 0.7,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: options.pantsColor,
    roughness: 0.75,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, // White clean sneakers matching reference
    roughness: 0.4,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.9,
    roughness: 0.2,
  });

  // Torso / Hoodie
  const torsoGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.45, 16);
  const torso = new THREE.Mesh(torsoGeo, clothMat);
  torso.position.y = 0.42;
  torso.castShadow = true;
  group.add(torso);

  // Hoodie collar / hood
  const hoodGeo = new THREE.TorusGeometry(0.16, 0.06, 12, 24);
  const hood = new THREE.Mesh(hoodGeo, clothMat);
  hood.rotation.x = Math.PI / 2.2;
  hood.position.set(0, 0.62, -0.04);
  group.add(hood);

  // Gold chain necklace (if equipped)
  if (options.hasGoldChain) {
    const chainGeo = new THREE.TorusGeometry(0.14, 0.018, 8, 24);
    const chain = new THREE.Mesh(chainGeo, goldMat);
    chain.rotation.x = Math.PI / 2.4;
    chain.position.set(0, 0.58, 0.05);
    group.add(chain);
  }

  // Head & Neck
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.12, 12);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 0.68;
  group.add(neck);

  const headGeo = new THREE.SphereGeometry(0.17, 24, 24);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 0.84, 0.02);
  head.castShadow = true;
  group.add(head);

  // Hair
  if (options.hairStyle === 'curly') {
    // Curly volume hair matching Reference 1 center player
    const hairGeo = new THREE.SphereGeometry(0.19, 16, 16);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.9, -0.02);
    group.add(hair);

    // Front curls
    for (let i = -2; i <= 2; i++) {
      const curlGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const curl = new THREE.Mesh(curlGeo, hairMat);
      curl.position.set(i * 0.05, 0.95, 0.12);
      group.add(curl);
    }
  } else if (options.hairStyle === 'female-long') {
    // Long wavy hair matching Maya
    const topHairGeo = new THREE.SphereGeometry(0.185, 16, 16);
    const topHair = new THREE.Mesh(topHairGeo, hairMat);
    topHair.position.set(0, 0.88, -0.01);
    group.add(topHair);

    const backHairGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.45, 12);
    const backHair = new THREE.Mesh(backHairGeo, hairMat);
    backHair.position.set(0, 0.65, -0.1);
    group.add(backHair);
  } else {
    // Short afro/fade for Zack
    const afroGeo = new THREE.SphereGeometry(0.185, 16, 16);
    const afro = new THREE.Mesh(afroGeo, hairMat);
    afro.position.set(0, 0.88, 0);
    group.add(afro);
  }

  // Sunglasses / Glasses
  if (options.hasGlasses) {
    const glassesFrameMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.8,
      roughness: 0.2,
    });
    const glassesGeo = new THREE.BoxGeometry(0.24, 0.06, 0.05);
    const glasses = new THREE.Mesh(glassesGeo, glassesFrameMat);
    glasses.position.set(0, 0.85, 0.17);
    group.add(glasses);
  }

  // Seated Cross-legged / Relaxed Legs on Pouf
  // Pelvis
  const pelvisGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.15, 16);
  const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvis.position.y = 0.14;
  group.add(pelvis);

  // Left Leg (folded forward/side)
  const leftThighGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.35, 12);
  const leftThigh = new THREE.Mesh(leftThighGeo, pantsMat);
  leftThigh.rotation.set(Math.PI / 2.5, 0, -Math.PI / 4.5);
  leftThigh.position.set(-0.18, 0.12, 0.18);
  group.add(leftThigh);

  const leftShinGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.34, 12);
  const leftShin = new THREE.Mesh(leftShinGeo, pantsMat);
  leftShin.rotation.set(0, 0, Math.PI / 2.3);
  leftShin.position.set(-0.08, 0.06, 0.32);
  group.add(leftShin);

  // Right Leg (folded forward/side)
  const rightThighGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.35, 12);
  const rightThigh = new THREE.Mesh(rightThighGeo, pantsMat);
  rightThigh.rotation.set(Math.PI / 2.5, 0, Math.PI / 4.5);
  rightThigh.position.set(0.18, 0.12, 0.18);
  group.add(rightThigh);

  const rightShinGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.34, 12);
  const rightShin = new THREE.Mesh(rightShinGeo, pantsMat);
  rightShin.rotation.set(0, 0, -Math.PI / 2.3);
  rightShin.position.set(0.08, 0.06, 0.32);
  group.add(rightShin);

  // White sneakers
  const shoeLeftGeo = new THREE.BoxGeometry(0.1, 0.08, 0.18);
  const shoeLeft = new THREE.Mesh(shoeLeftGeo, shoeMat);
  shoeLeft.position.set(-0.25, 0.05, 0.35);
  group.add(shoeLeft);

  const shoeRightGeo = new THREE.BoxGeometry(0.1, 0.08, 0.18);
  const shoeRight = new THREE.Mesh(shoeRightGeo, shoeMat);
  shoeRight.position.set(0.25, 0.05, 0.35);
  group.add(shoeRight);

  // Arms resting naturally
  const armLGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.32, 10);
  const armL = new THREE.Mesh(armLGeo, clothMat);
  armL.rotation.set(0.3, 0, 0.4);
  armL.position.set(-0.28, 0.36, 0.1);
  group.add(armL);

  const armRGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.32, 10);
  const armR = new THREE.Mesh(armRGeo, clothMat);
  armR.rotation.set(0.3, 0, -0.4);
  armR.position.set(0.28, 0.36, 0.1);
  group.add(armR);

  return group;
}
