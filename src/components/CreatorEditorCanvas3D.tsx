import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
  SpotItem,
  GizmoEditMode,
  PlayableBoundary,
  PlacedObject,
} from '../types';
import {
  ArrowUp,
  Move,
  RotateCw,
  Maximize2,
  X,
  MapPin,
  ZoomIn,
  ZoomOut,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Box,
  Loader2,
  RotateCcw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CreatorEditorCanvas3DProps {
  sceneAssetBlobUrl?: string | null;
  sceneAssetId?: string | null;
  placedObjects: PlacedObject[];
  spots: SpotItem[];
  boundary: PlayableBoundary;
  selectedSpotId: string | null;
  selectedObjectId: string | null;
  onSelectSpot: (id: string | null) => void;
  onSelectObject: (id: string | null) => void;
  onUpdateSpotPosition: (id: string, position: [number, number, number]) => void;
  onUpdateSpotRotation: (id: string, rotation: number) => void;
  onRemoveSpot: (id: string) => void;
  onUpdateObjectTransform: (
    id: string,
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => void;
  onRemoveObject: (id: string) => void;
  onSceneClickInsertionPoint: (point: [number, number, number] | null) => void;
  insertionCursorPoint: [number, number, number] | null;
  isAvatarMode: boolean; // Toggle MODO AVATAR (ON = visitor teleport; OFF = edit)
  showBoundaryGhost: boolean; // Eye toggle (ON = show ghost wireframe, OFF = hidden)
  showSpots?: boolean; // Toggle to hide all spots so user can focus purely on 3D objects
  lockSpots?: boolean; // Toggle to disable spot controls so clicks target only 3D objects
  onToggleShowSpots?: () => void;
  onToggleLockSpots?: () => void;
  activeGizmoMode: GizmoEditMode;
  onChangeGizmoMode: (mode: GizmoEditMode) => void;
  avatarCurrentSpotId: string | null;
  onAvatarTeleport: (spotId: string) => void;
}

// Reusable safe numeric input that preserves intermediate typing and strictly prevents NaN/zero-scale
interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  precision?: number;
  className?: string;
}

const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  step = 0.05,
  min,
  max,
  precision = 2,
  className = '',
}) => {
  const safeVal = Number.isFinite(value) ? Number(value.toFixed(precision)) : 0;
  const [localStr, setLocalStr] = useState<string>(safeVal.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused && Number.isFinite(value)) {
      setLocalStr(Number(value.toFixed(precision)).toString());
    }
  }, [value, isFocused, precision]);

  const commit = (str: string) => {
    const parsed = parseFloat(str);
    if (!isNaN(parsed) && isFinite(parsed)) {
      let clamped = parsed;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      const finalVal = parseFloat(clamped.toFixed(precision));
      onChange(finalVal);
      setLocalStr(finalVal.toString());
    } else {
      setLocalStr(Number(value.toFixed(precision)).toString());
    }
  };

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={isFocused ? localStr : safeVal.toString()}
      onFocus={() => {
        setIsFocused(true);
        setLocalStr(safeVal.toString());
      }}
      onChange={(e) => {
        setLocalStr(e.target.value);
        const parsed = parseFloat(e.target.value);
        if (!isNaN(parsed) && isFinite(parsed)) {
          let clamped = parsed;
          if (min !== undefined) clamped = Math.max(min, clamped);
          if (max !== undefined) clamped = Math.min(max, clamped);
          onChange(parseFloat(clamped.toFixed(precision)));
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        commit(localStr);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          commit(localStr);
          (e.target as HTMLInputElement).blur();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={className}
    />
  );
};

export const CreatorEditorCanvas3D: React.FC<CreatorEditorCanvas3DProps> = ({
  sceneAssetBlobUrl,
  sceneAssetId,
  placedObjects,
  spots,
  boundary,
  selectedSpotId,
  selectedObjectId,
  onSelectSpot,
  onSelectObject,
  onUpdateSpotPosition,
  onUpdateSpotRotation,
  onRemoveSpot,
  onUpdateObjectTransform,
  onRemoveObject,
  onSceneClickInsertionPoint,
  insertionCursorPoint,
  isAvatarMode,
  showBoundaryGhost,
  showSpots = true,
  lockSpots = false,
  onToggleShowSpots,
  onToggleLockSpots,
  activeGizmoMode,
  onChangeGizmoMode,
  avatarCurrentSpotId,
  onAvatarTeleport,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const defaultRoomGroupRef = useRef<THREE.Group | null>(null);
  const customScenarioGroupRef = useRef<THREE.Group | null>(null);
  const placedObjectsGroupRef = useRef<THREE.Group | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const boundaryWireframeRef = useRef<THREE.LineSegments | null>(null);
  const insertionMarkerRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const transformControlsRef = useRef<TransformControls | null>(null);

  // High-performance object mesh and GLTF model caches (prevents destruction & reloads)
  const meshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const gltfCacheRef = useRef<Map<string, THREE.Group>>(new Map());

  // Throttled transform sync to React state during dragging
  const pendingTransformUpdateRef = useRef<{
    id: string;
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    };
  } | null>(null);
  const dragRafIdRef = useRef<number | null>(null);

  const scheduleReactTransformUpdate = (
    id: string,
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => {
    pendingTransformUpdateRef.current = { id, transform };
    if (!dragRafIdRef.current) {
      dragRafIdRef.current = requestAnimationFrame(() => {
        dragRafIdRef.current = null;
        if (pendingTransformUpdateRef.current) {
          onUpdateObjectTransformRef.current(
            pendingTransformUpdateRef.current.id,
            pendingTransformUpdateRef.current.transform
          );
          pendingTransformUpdateRef.current = null;
        }
      });
    }
  };

  const flushReactTransformUpdate = () => {
    if (dragRafIdRef.current) {
      cancelAnimationFrame(dragRafIdRef.current);
      dragRafIdRef.current = null;
    }
    if (pendingTransformUpdateRef.current) {
      onUpdateObjectTransformRef.current(
        pendingTransformUpdateRef.current.id,
        pendingTransformUpdateRef.current.transform
      );
      pendingTransformUpdateRef.current = null;
    }
  };

  // Keep refs for event listeners
  const selectedObjectIdRef = useRef<string | null>(selectedObjectId);
  selectedObjectIdRef.current = selectedObjectId;
  const onUpdateObjectTransformRef = useRef(onUpdateObjectTransform);
  onUpdateObjectTransformRef.current = onUpdateObjectTransform;
  const activeGizmoModeRef = useRef(activeGizmoMode);
  activeGizmoModeRef.current = activeGizmoMode;

  // Loading indicator state for 3D GLB scenarios
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  const [scenarioLoadingMsg, setScenarioLoadingMsg] = useState('Carregando cenário 3D...');

  // Precision Inspector minimize toggle
  const [isInspectorMinimized, setIsInspectorMinimized] = useState(false);

  // Screen positions for 2D UI overlays
  const [spotGizmoScreenPos, setSpotGizmoScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [objectGizmoScreenPos, setObjectGizmoScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Camera angles with wide limitless zoom
  const cameraAngleRef = useRef({ theta: 0.02, phi: 0.22, distance: 5.6 });
  const isOrbitingRef = useRef(false);
  const isTransformDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Direct object drag on floor (Blender style)
  const isDirectDraggingObjectRef = useRef(false);
  const directDragStartPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const directDragStartMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const directDragStartRotYRef = useRef<number>(0);
  const directDragStartScaleRef = useRef<number>(1);

  // Spot dragging in screen space
  const isDraggingSpotRef = useRef(false);

  // 1. Initial Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#101115');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.05,
      250
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Architectural Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const ceilingKeyLight = new THREE.DirectionalLight(0xfff7ed, 1.3);
    ceilingKeyLight.position.set(2.5, 6, 3);
    ceilingKeyLight.castShadow = true;
    ceilingKeyLight.shadow.mapSize.width = 1024;
    ceilingKeyLight.shadow.mapSize.height = 1024;
    ceilingKeyLight.shadow.camera.near = 0.5;
    ceilingKeyLight.shadow.camera.far = 25;
    scene.add(ceilingKeyLight);

    const fillLight = new THREE.DirectionalLight(0x8c96a5, 0.45);
    fillLight.position.set(-4, 4, 1);
    scene.add(fillLight);

    const scenarioSunLight = new THREE.DirectionalLight(0xfffae6, 0.7);
    scenarioSunLight.position.set(0, 7, -3);
    scene.add(scenarioSunLight);

    // Default Architecture Room Group
    const defaultRoomGroup = new THREE.Group();
    scene.add(defaultRoomGroup);
    defaultRoomGroupRef.current = defaultRoomGroup;

    // Floor (Dark charcoal tiles, fine grout)
    const floorTexture = createFloorTileTexture();
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(12, 12);

    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1c1d22,
      map: floorTexture,
      roughness: 0.88,
      metalness: 0.08,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    defaultRoomGroup.add(floor);
    floorMeshRef.current = floor;

    // Dark grey textured walls
    const wallTexture = createWallTileTexture();
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(10, 4);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x18191d,
      map: wallTexture,
      roughness: 0.95,
      metalness: 0.05,
    });

    const backWallGeo = new THREE.PlaneGeometry(36, 12);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 6, -6.5);
    backWall.receiveShadow = true;
    backWall.name = 'backWall';
    defaultRoomGroup.add(backWall);

    const leftWallGeo = new THREE.PlaneGeometry(36, 12);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-10, 6, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.name = 'leftWall';
    defaultRoomGroup.add(leftWall);

    const rightWallGeo = new THREE.PlaneGeometry(36, 12);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(10, 6, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.name = 'rightWall';
    defaultRoomGroup.add(rightWall);

    // Group for Custom GLB Scenario or procedural room architecture
    const customScenarioGroup = new THREE.Group();
    scene.add(customScenarioGroup);
    customScenarioGroupRef.current = customScenarioGroup;

    // Group for Placed 3D Objects
    const placedObjectsGroup = new THREE.Group();
    scene.add(placedObjectsGroup);
    placedObjectsGroupRef.current = placedObjectsGroup;

    // 3D TransformControls (Blender-like 3D visual handles)
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.85;
    scene.add(transformControls.getHelper());
    transformControlsRef.current = transformControls;

    let tcRafId: number | null = null;
    transformControls.addEventListener('dragging-changed', (event: any) => {
      isTransformDraggingRef.current = event.value;
      isOrbitingRef.current = false;
      if (!event.value) {
        if (tcRafId) {
          cancelAnimationFrame(tcRafId);
          tcRafId = null;
        }
        const attached = transformControls.object;
        if (attached && selectedObjectIdRef.current) {
          const px = Number.isFinite(attached.position.x) ? parseFloat(attached.position.x.toFixed(2)) : 0;
          const py = Number.isFinite(attached.position.y) ? parseFloat(attached.position.y.toFixed(2)) : 0;
          const pz = Number.isFinite(attached.position.z) ? parseFloat(attached.position.z.toFixed(2)) : 0;
          const rx = Number.isFinite(attached.rotation.x) ? parseFloat(attached.rotation.x.toFixed(2)) : 0;
          const ry = Number.isFinite(attached.rotation.y) ? parseFloat(attached.rotation.y.toFixed(2)) : 0;
          const rz = Number.isFinite(attached.rotation.z) ? parseFloat(attached.rotation.z.toFixed(2)) : 0;
          const sx = Number.isFinite(attached.scale.x) && attached.scale.x >= 0.05 ? parseFloat(attached.scale.x.toFixed(2)) : 1;
          const sy = Number.isFinite(attached.scale.y) && attached.scale.y >= 0.05 ? parseFloat(attached.scale.y.toFixed(2)) : 1;
          const sz = Number.isFinite(attached.scale.z) && attached.scale.z >= 0.05 ? parseFloat(attached.scale.z.toFixed(2)) : 1;
          onUpdateObjectTransformRef.current(selectedObjectIdRef.current, {
            position: [px, py, pz],
            rotation: [rx, ry, rz],
            scale: [sx, sy, sz],
          });
        }
      }
    });

    transformControls.addEventListener('objectChange', () => {
      const attached = transformControls.object;
      if (!attached || !selectedObjectIdRef.current) return;
      if (tcRafId) cancelAnimationFrame(tcRafId);
      tcRafId = requestAnimationFrame(() => {
        tcRafId = null;
        if (!selectedObjectIdRef.current) return;
        const px = Number.isFinite(attached.position.x) ? parseFloat(attached.position.x.toFixed(2)) : 0;
        const py = Number.isFinite(attached.position.y) ? parseFloat(attached.position.y.toFixed(2)) : 0;
        const pz = Number.isFinite(attached.position.z) ? parseFloat(attached.position.z.toFixed(2)) : 0;
        const rx = Number.isFinite(attached.rotation.x) ? parseFloat(attached.rotation.x.toFixed(2)) : 0;
        const ry = Number.isFinite(attached.rotation.y) ? parseFloat(attached.rotation.y.toFixed(2)) : 0;
        const rz = Number.isFinite(attached.rotation.z) ? parseFloat(attached.rotation.z.toFixed(2)) : 0;
        const sx = Number.isFinite(attached.scale.x) && attached.scale.x >= 0.05 ? parseFloat(attached.scale.x.toFixed(2)) : 1;
        const sy = Number.isFinite(attached.scale.y) && attached.scale.y >= 0.05 ? parseFloat(attached.scale.y.toFixed(2)) : 1;
        const sz = Number.isFinite(attached.scale.z) && attached.scale.z >= 0.05 ? parseFloat(attached.scale.z.toFixed(2)) : 1;
        onUpdateObjectTransformRef.current(selectedObjectIdRef.current, {
          position: [px, py, pz],
          rotation: [rx, ry, rz],
          scale: [sx, sy, sz],
        });
      });
    });

    // Avatar mesh for visitor mode
    const avatarGroup = createSimpleAvatarMesh();
    avatarGroup.position.set(0.8, 0.02, 1.1);
    avatarGroup.visible = false;
    scene.add(avatarGroup);
    avatarGroupRef.current = avatarGroup;

    // Insertion Point 3D Marker
    const markerGroup = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.18, 0.24, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const markerRing = new THREE.Mesh(ringGeo, ringMat);
    markerRing.rotation.x = -Math.PI / 2;
    markerGroup.add(markerRing);

    const pinGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.y = 0.2;
    markerGroup.add(pin);

    markerGroup.visible = false;
    scene.add(markerGroup);
    insertionMarkerRef.current = markerGroup;

    // Boundary Ghost Wireframe
    const boxGeo = new THREE.BoxGeometry(boundary.x, boundary.y, boundary.z);
    const wireframeGeo = new THREE.WireframeGeometry(boxGeo);
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.35,
    });
    const wireframeMesh = new THREE.LineSegments(wireframeGeo, wireframeMat);
    wireframeMesh.position.set(0, boundary.y / 2, 0);
    wireframeMesh.visible = showBoundaryGhost;
    scene.add(wireframeMesh);
    boundaryWireframeRef.current = wireframeMesh;

    // Render loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Camera Orbit position with broad limitless zoom range
      if (cameraRef.current) {
        const { theta, phi, distance } = cameraAngleRef.current;
        const cam = cameraRef.current;
        cam.position.x = distance * Math.sin(theta) * Math.cos(phi);
        cam.position.y = distance * Math.sin(phi) + 0.55;
        cam.position.z = distance * Math.cos(theta) * Math.cos(phi);
        cam.lookAt(0.3, 0.7, -0.6);

        // Project selected spot position to 2D screen
        if (selectedSpotId && showSpots) {
          const currentSpot = spots.find((s) => s.id === selectedSpotId);
          if (currentSpot && container) {
            const worldPos = new THREE.Vector3(...currentSpot.position);
            worldPos.y += 1.35;

            const proj = worldPos.clone().project(cam);
            const rect = container.getBoundingClientRect();
            const sx = ((proj.x + 1) / 2) * rect.width;
            const sy = ((-proj.y + 1) / 2) * rect.height;

            if (proj.z < 1) {
              setSpotGizmoScreenPos({ x: sx, y: sy });
            } else {
              setSpotGizmoScreenPos(null);
            }
          }
        } else {
          setSpotGizmoScreenPos(null);
        }

        // Project selected object position to 2D screen
        if (selectedObjectId) {
          const currentObj = placedObjects.find((o) => o.id === selectedObjectId);
          if (currentObj && container) {
            const worldPos = new THREE.Vector3(...currentObj.position);
            worldPos.y += 0.95;

            const proj = worldPos.clone().project(cam);
            const rect = container.getBoundingClientRect();
            const sx = ((proj.x + 1) / 2) * rect.width;
            const sy = ((-proj.y + 1) / 2) * rect.height;

            if (proj.z < 1) {
              setObjectGizmoScreenPos({ x: sx, y: sy });
            } else {
              setObjectGizmoScreenPos(null);
            }
          }
        } else {
          setObjectGizmoScreenPos(null);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Mouse handlers for natural orbit and Blender-style direct object dragging
    const handleMouseDown = (e: MouseEvent) => {
      if (isTransformDraggingRef.current) return;
      if (e.target !== renderer.domElement || e.button !== 0) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Check if clicking on an object in the scene
      if (placedObjectsGroupRef.current && !isAvatarMode) {
        const objHits = raycaster.intersectObjects(
          placedObjectsGroupRef.current.children,
          true
        );
        if (objHits.length > 0) {
          let hitObj: THREE.Object3D | null = objHits[0].object;
          while (hitObj && !(hitObj as any).userData?.placedObjectId && hitObj.parent) {
            hitObj = hitObj.parent;
          }
          if (hitObj && (hitObj as any).userData?.placedObjectId) {
            const foundId = (hitObj as any).userData.placedObjectId;
            onSelectObject(foundId);
            onSelectSpot(null);

            // Prepare for direct drag if in mover, rodar or escalar mode
            const targetObj = placedObjects.find((o) => o.id === foundId);
            if (targetObj) {
              isDirectDraggingObjectRef.current = true;
              directDragStartPosRef.current = {
                x: targetObj.position[0],
                y: targetObj.position[1],
                z: targetObj.position[2],
              };
              directDragStartRotYRef.current = targetObj.rotation[1];
              directDragStartScaleRef.current = targetObj.scale[0];
              directDragStartMouseRef.current = { x: e.clientX, y: e.clientY };
            }
            return;
          }
        }
      }

      // If not clicking an object, orbit camera
      isOrbitingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      // 1. Direct object manipulation (Blender style) with 60 FPS in-place transform
      if (isDirectDraggingObjectRef.current && selectedObjectIdRef.current && directDragStartPosRef.current) {
        const dx = e.clientX - directDragStartMouseRef.current.x;
        const dy = e.clientY - directDragStartMouseRef.current.y;
        const mode = activeGizmoModeRef.current;
        const targetGroup = meshMapRef.current.get(selectedObjectIdRef.current);

        if (mode === 'mover') {
          // Raycast to floor to get precise target coordinates
          const rect = container.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.02);
          const targetPt = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(floorPlane, targetPt)) {
            const newX = parseFloat(targetPt.x.toFixed(2));
            const newY = directDragStartPosRef.current.y;
            const newZ = parseFloat(targetPt.z.toFixed(2));
            if (targetGroup) {
              targetGroup.position.set(newX, newY, newZ);
            }
            scheduleReactTransformUpdate(selectedObjectIdRef.current, {
              position: [newX, newY, newZ],
              rotation: [0, directDragStartRotYRef.current, 0],
              scale: [directDragStartScaleRef.current, directDragStartScaleRef.current, directDragStartScaleRef.current],
            });
          }
        } else if (mode === 'rodar') {
          const deltaAngle = (dx * 0.02);
          const newRotY = directDragStartRotYRef.current + deltaAngle;
          if (targetGroup) {
            targetGroup.rotation.set(0, newRotY, 0);
          }
          scheduleReactTransformUpdate(selectedObjectIdRef.current, {
            position: [directDragStartPosRef.current.x, directDragStartPosRef.current.y, directDragStartPosRef.current.z],
            rotation: [0, newRotY, 0],
            scale: [directDragStartScaleRef.current, directDragStartScaleRef.current, directDragStartScaleRef.current],
          });
        } else if (mode === 'escalar') {
          const scaleDelta = (dx * 0.008);
          const newScale = Math.max(0.1, Math.min(5.0, directDragStartScaleRef.current + scaleDelta));
          const s = parseFloat(newScale.toFixed(2));
          if (targetGroup) {
            targetGroup.scale.set(s, s, s);
          }
          scheduleReactTransformUpdate(selectedObjectIdRef.current, {
            position: [directDragStartPosRef.current.x, directDragStartPosRef.current.y, directDragStartPosRef.current.z],
            rotation: [0, directDragStartRotYRef.current, 0],
            scale: [s, s, s],
          });
        } else if (mode === 'elevar') {
          const elevDelta = -(dy * 0.008);
          const newY = Math.max(0, Math.min(3.0, directDragStartPosRef.current.y + elevDelta));
          const yVal = parseFloat(newY.toFixed(2));
          if (targetGroup) {
            targetGroup.position.y = yVal;
          }
          scheduleReactTransformUpdate(selectedObjectIdRef.current, {
            position: [directDragStartPosRef.current.x, yVal, directDragStartPosRef.current.z],
            rotation: [0, directDragStartRotYRef.current, 0],
            scale: [directDragStartScaleRef.current, directDragStartScaleRef.current, directDragStartScaleRef.current],
          });
        }
        return;
      }

      // 2. Camera orbiting
      if (!isOrbitingRef.current || isTransformDraggingRef.current) return;
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;

      cameraAngleRef.current.theta -= dx * 0.004;
      cameraAngleRef.current.phi = Math.max(
        0.02,
        Math.min(0.95, cameraAngleRef.current.phi + dy * 0.003)
      );

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isOrbitingRef.current = false;
      isDraggingSpotRef.current = false;
      if (isDirectDraggingObjectRef.current) {
        isDirectDraggingObjectRef.current = false;
        flushReactTransformUpdate();
      }
    };

    // Canvas click: Mark insertion point in scene when clicking empty floor
    const handleClick = (e: MouseEvent) => {
      if (isTransformDraggingRef.current) return;
      if (!container || !cameraRef.current || !floorMeshRef.current) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check hit on floor
      const floorHits = raycaster.intersectObject(floorMeshRef.current);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        const coords: [number, number, number] = [
          parseFloat(pt.x.toFixed(2)),
          0.02,
          parseFloat(pt.z.toFixed(2)),
        ];

        if (!isAvatarMode) {
          onSceneClickInsertionPoint(coords);
        }
      }
    };

    // Limitless smooth mouse wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = 1 + (e.deltaY > 0 ? 0.08 : -0.08);
      cameraAngleRef.current.distance = Math.max(
        0.15,
        Math.min(60.0, cameraAngleRef.current.distance * factor)
      );
    };

    // Keyboard shortcuts for Blender-style tools: G (move), R (rotate), S (scale), E (elevate), Delete
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        onChangeGizmoMode('mover');
      } else if (e.key === 'r' || e.key === 'R') {
        onChangeGizmoMode('rodar');
      } else if (e.key === 's' || e.key === 'S') {
        onChangeGizmoMode('escalar');
      } else if (e.key === 'e' || e.key === 'E') {
        onChangeGizmoMode('elevar');
      } else if (e.key === 'Delete') {
        // Explicit Delete key ONLY (never Backspace, so text editing never deletes scene objects)
        if (selectedObjectIdRef.current) {
          onRemoveObject(selectedObjectIdRef.current);
        }
      } else if (e.key === 'Escape') {
        onSelectObject(null);
        onSelectSpot(null);
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domEl.addEventListener('click', handleClick);
    domEl.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = container.clientWidth / container.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domEl.removeEventListener('click', handleClick);
      domEl.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      transformControls.dispose();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, []);

  // 2. Load Real 3D GLB Scenario OR Procedural Architectural Room
  useEffect(() => {
    const group = customScenarioGroupRef.current;
    if (!group) return;

    // Clear previous custom scenario
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    if (!sceneAssetBlobUrl) {
      // If no custom blob URL, render architectural theme for current sceneAssetId
      if (defaultRoomGroupRef.current) {
        defaultRoomGroupRef.current.children.forEach((c) => {
          c.visible = true;
        });
      }

      if (sceneAssetId === 'inv-scene-1') {
        // Build Crimson Salon architectural decor
        const scarletRoom = createScarletSalonArchitecture();
        group.add(scarletRoom);
        if (defaultRoomGroupRef.current) {
          defaultRoomGroupRef.current.children.forEach((c) => {
            if (c.name !== 'floor') c.visible = false;
          });
        }
      } else if (sceneAssetId === 'inv-scene-2') {
        // Build Industrial Loft architectural decor
        const loftRoom = createLoftArchitecture();
        group.add(loftRoom);
        if (defaultRoomGroupRef.current) {
          defaultRoomGroupRef.current.children.forEach((c) => {
            if (c.name !== 'floor') c.visible = false;
          });
        }
      }
      setIsLoadingScenario(false);
      return;
    }

    // Load actual GLB using GLTFLoader!
    setIsLoadingScenario(true);
    setScenarioLoadingMsg('Carregando modelo 3D do cenário...');

    // Hide default walls so the uploaded scenario model is not occluded
    if (defaultRoomGroupRef.current) {
      defaultRoomGroupRef.current.children.forEach((c) => {
        if (c.name !== 'floor') c.visible = false;
      });
    }

    const loader = new GLTFLoader();
    loader.load(
      sceneAssetBlobUrl,
      (gltf) => {
        const model = gltf.scene;

        // Auto-scale & center model so it fits the room gracefully
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.z);

        if (maxDim > 0) {
          const targetDim = 11.5;
          const scale = targetDim / maxDim;
          model.scale.set(scale, scale, scale);
        }

        // Align floor
        box.setFromObject(model);
        model.position.y = -box.min.y;

        // Enable shadows & double-sided materials
        model.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            const mat = (node as THREE.Mesh).material;
            if (mat) {
              if (Array.isArray(mat)) {
                mat.forEach((item) => (item.side = THREE.DoubleSide));
              } else {
                mat.side = THREE.DoubleSide;
              }
            }
          }
        });

        group.add(model);
        setIsLoadingScenario(false);
      },
      (progress) => {
        if (progress.total > 0) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          setScenarioLoadingMsg(`Carregando cenário: ${pct}%...`);
        }
      },
      (err) => {
        console.warn('GLTFLoader error on scenario:', err);
        setIsLoadingScenario(false);
        if (defaultRoomGroupRef.current) {
          defaultRoomGroupRef.current.children.forEach((c) => {
            c.visible = true;
          });
        }
      }
    );
  }, [sceneAssetBlobUrl, sceneAssetId]);

  // 3. High-Performance Render and In-Place Transform Synchronization (Never destroy existing meshes!)
  useEffect(() => {
    const group = placedObjectsGroupRef.current;
    if (!group) return;

    const currentIds = new Set(placedObjects.map((o) => o.id));

    // 1. Clean up only objects that were explicitly deleted
    meshMapRef.current.forEach((meshGroup, id) => {
      if (!currentIds.has(id)) {
        group.remove(meshGroup);
        meshGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
              if (Array.isArray(m.material)) {
                m.material.forEach((mat) => mat.dispose());
              } else {
                m.material.dispose();
              }
            }
          }
        });
        meshMapRef.current.delete(id);
      }
    });

    // 2. Synchronize existing objects in-place (0ms, 0 allocations, 60fps) or instantiate new
    placedObjects.forEach((obj) => {
      const existing = meshMapRef.current.get(obj.id);
      if (existing) {
        // Fast in-place transform sync - object NEVER disappears when adjusting numbers or dragging!
        const px = Number.isFinite(obj.position[0]) ? obj.position[0] : existing.position.x;
        const py = Number.isFinite(obj.position[1]) ? obj.position[1] : existing.position.y;
        const pz = Number.isFinite(obj.position[2]) ? obj.position[2] : existing.position.z;
        existing.position.set(px, py, pz);

        const rx = Number.isFinite(obj.rotation[0]) ? obj.rotation[0] : existing.rotation.x;
        const ry = Number.isFinite(obj.rotation[1]) ? obj.rotation[1] : existing.rotation.y;
        const rz = Number.isFinite(obj.rotation[2]) ? obj.rotation[2] : existing.rotation.z;
        existing.rotation.set(rx, ry, rz);

        const sx = Number.isFinite(obj.scale[0]) && obj.scale[0] >= 0.05 ? obj.scale[0] : existing.scale.x;
        const sy = Number.isFinite(obj.scale[1]) && obj.scale[1] >= 0.05 ? obj.scale[1] : existing.scale.y;
        const sz = Number.isFinite(obj.scale[2]) && obj.scale[2] >= 0.05 ? obj.scale[2] : existing.scale.z;
        existing.scale.set(sx, sy, sz);
        return;
      }

      // New object: create once and store in meshMapRef!
      const objGroup = new THREE.Group();
      objGroup.position.set(...obj.position);
      objGroup.rotation.set(...obj.rotation);
      objGroup.scale.set(...obj.scale);
      (objGroup as any).userData = { placedObjectId: obj.id };

      meshMapRef.current.set(obj.id, objGroup);
      group.add(objGroup);

      if (obj.fileBlobUrl) {
        // Check if model was already parsed and cached
        const cachedModel = gltfCacheRef.current.get(obj.fileBlobUrl);
        if (cachedModel) {
          objGroup.add(cachedModel.clone(true));
        } else {
          // Load custom uploaded GLB file once
          const loader = new GLTFLoader();
          loader.load(
            obj.fileBlobUrl,
            (gltf) => {
              const m = gltf.scene;
              const b = new THREE.Box3().setFromObject(m);
              const s = b.getSize(new THREE.Vector3());
              const maxD = Math.max(s.x, s.y, s.z);
              if (maxD > 0) {
                const targetSize = 1.4;
                const scaleFactor = targetSize / maxD;
                m.scale.set(scaleFactor, scaleFactor, scaleFactor);
              }
              m.traverse((node) => {
                if ((node as THREE.Mesh).isMesh) {
                  node.castShadow = true;
                  node.receiveShadow = true;
                  const mat = (node as THREE.Mesh).material;
                  if (mat) {
                    if (Array.isArray(mat)) {
                      mat.forEach((item) => (item.side = THREE.DoubleSide));
                    } else {
                      mat.side = THREE.DoubleSide;
                    }
                  }
                }
              });
              gltfCacheRef.current.set(obj.fileBlobUrl!, m);
              if (meshMapRef.current.has(obj.id)) {
                objGroup.add(m.clone(true));
              }
            },
            undefined,
            () => {
              // Fallback mesh if file corrupted
              const fallbackMesh = createDecorativeMesh(obj.name);
              if (meshMapRef.current.has(obj.id)) {
                objGroup.add(fallbackMesh);
              }
            }
          );
        }
      } else if (obj.modelType === 'sofa' || obj.name.toLowerCase().includes('sofa')) {
        const sofa = createSectionalLSofa();
        objGroup.add(sofa);
      } else {
        const decorative = createDecorativeMesh(obj.name);
        objGroup.add(decorative);
      }
    });

    // Reattach TransformControls if selected object exists
    if (transformControlsRef.current) {
      if (selectedObjectId) {
        const target = meshMapRef.current.get(selectedObjectId);
        if (target) {
          if (transformControlsRef.current.object !== target) {
            transformControlsRef.current.attach(target);
          }
        } else {
          transformControlsRef.current.detach();
        }
      } else {
        transformControlsRef.current.detach();
      }
    }
  }, [placedObjects, selectedObjectId]);

  // 4. Update TransformControls visual mode (Mover, Rodar, Escalar, Elevar)
  useEffect(() => {
    const tc = transformControlsRef.current;
    if (!tc) return;

    if (!selectedObjectId || isAvatarMode) {
      tc.detach();
      return;
    }

    if (activeGizmoMode === 'mover') {
      tc.setMode('translate');
      tc.showX = true;
      tc.showY = false;
      tc.showZ = true;
    } else if (activeGizmoMode === 'elevar') {
      tc.setMode('translate');
      tc.showX = false;
      tc.showY = true;
      tc.showZ = false;
    } else if (activeGizmoMode === 'rodar') {
      tc.setMode('rotate');
      tc.showX = false;
      tc.showY = true;
      tc.showZ = false;
    } else if (activeGizmoMode === 'escalar') {
      tc.setMode('scale');
      tc.showX = true;
      tc.showY = true;
      tc.showZ = true;
    }
  }, [activeGizmoMode, selectedObjectId, isAvatarMode]);

  // 5. Update Boundary Ghost visibility
  useEffect(() => {
    if (boundaryWireframeRef.current) {
      boundaryWireframeRef.current.visible = showBoundaryGhost;
    }
  }, [showBoundaryGhost]);

  // 6. Update Insertion Marker
  useEffect(() => {
    if (!insertionMarkerRef.current) return;
    if (insertionCursorPoint) {
      insertionMarkerRef.current.position.set(...insertionCursorPoint);
      insertionMarkerRef.current.visible = true;
    } else {
      insertionMarkerRef.current.visible = false;
    }
  }, [insertionCursorPoint]);

  // 7. Update Avatar visibility and position
  useEffect(() => {
    if (!avatarGroupRef.current) return;
    if (isAvatarMode && avatarCurrentSpotId) {
      const activeSpot = spots.find((s) => s.id === avatarCurrentSpotId);
      if (activeSpot) {
        avatarGroupRef.current.position.set(...activeSpot.position);
        avatarGroupRef.current.rotation.y = THREE.MathUtils.degToRad(activeSpot.rotation);
        avatarGroupRef.current.visible = true;
      }
    } else {
      avatarGroupRef.current.visible = false;
    }
  }, [isAvatarMode, avatarCurrentSpotId, spots]);

  // Spot dragging logic (only active when lockSpots is false)
  const handleSpotDragMouseDown = (spotId: string, e: React.MouseEvent) => {
    if (lockSpots) return;
    e.stopPropagation();
    if (isAvatarMode) {
      onAvatarTeleport(spotId);
      return;
    }

    onSelectSpot(spotId);
    onSelectObject(null);
    isDraggingSpotRef.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const spot = spots.find((s) => s.id === spotId);
    if (!spot) return;
    const initialPos = [...spot.position] as [number, number, number];

    const onMove = (moveEvt: MouseEvent) => {
      if (!isDraggingSpotRef.current) return;
      const dx = (moveEvt.clientX - startX) * 0.008;
      const dz = (moveEvt.clientY - startY) * 0.008;

      onUpdateSpotPosition(spotId, [
        parseFloat((initialPos[0] + dx).toFixed(2)),
        initialPos[1],
        parseFloat((initialPos[2] + dz).toFixed(2)),
      ]);
    };

    const onUp = () => {
      isDraggingSpotRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const selectedSpot = spots.find((s) => s.id === selectedSpotId);
  const selectedObj = placedObjects.find((o) => o.id === selectedObjectId);

  // Precision object transform actions (guarded against NaN and vanishing)
  const handleUpdateObjPos = (axis: 0 | 1 | 2, val: number) => {
    if (!selectedObj) return;
    if (isNaN(val) || !isFinite(val)) return;
    const newPos = [...selectedObj.position] as [number, number, number];
    newPos[axis] = parseFloat(val.toFixed(2));
    onUpdateObjectTransform(selectedObj.id, {
      position: newPos,
      rotation: selectedObj.rotation,
      scale: selectedObj.scale,
    });
  };

  const handleStepObjPos = (axis: 0 | 1 | 2, delta: number) => {
    if (!selectedObj) return;
    const currentVal = selectedObj.position[axis];
    if (isNaN(currentVal) || !isFinite(currentVal)) return;
    handleUpdateObjPos(axis, currentVal + delta);
  };

  const handleUpdateObjRotY = (deg: number) => {
    if (!selectedObj) return;
    if (isNaN(deg) || !isFinite(deg)) return;
    const rad = THREE.MathUtils.degToRad(deg % 360);
    onUpdateObjectTransform(selectedObj.id, {
      position: selectedObj.position,
      rotation: [selectedObj.rotation[0], rad, selectedObj.rotation[2]],
      scale: selectedObj.scale,
    });
  };

  const handleStepObjRotY = (deltaDeg: number) => {
    if (!selectedObj) return;
    const currentDeg = Math.round(THREE.MathUtils.radToDeg(selectedObj.rotation[1]));
    handleUpdateObjRotY(currentDeg + deltaDeg);
  };

  const handleUpdateObjScale = (scaleFactor: number) => {
    if (!selectedObj) return;
    if (isNaN(scaleFactor) || !isFinite(scaleFactor) || scaleFactor <= 0) return;
    const safeScale = Math.max(0.05, Math.min(10.0, parseFloat(scaleFactor.toFixed(2))));
    onUpdateObjectTransform(selectedObj.id, {
      position: selectedObj.position,
      rotation: selectedObj.rotation,
      scale: [safeScale, safeScale, safeScale],
    });
  };

  const handleStepObjScale = (delta: number) => {
    if (!selectedObj) return;
    const currentScale = selectedObj.scale[0] || 1;
    handleUpdateObjScale(currentScale + delta);
  };

  // Precision spot transform actions
  const handleUpdateSpotPos = (axis: 0 | 1 | 2, val: number) => {
    if (!selectedSpot) return;
    if (isNaN(val) || !isFinite(val)) return;
    const newPos = [...selectedSpot.position] as [number, number, number];
    newPos[axis] = parseFloat(val.toFixed(2));
    onUpdateSpotPosition(selectedSpot.id, newPos);
  };

  const handleStepSpotPos = (axis: 0 | 1 | 2, delta: number) => {
    if (!selectedSpot) return;
    const currentVal = selectedSpot.position[axis];
    if (isNaN(currentVal) || !isFinite(currentVal)) return;
    handleUpdateSpotPos(axis, currentVal + delta);
  };

  const handleUpdateSpotRot = (deg: number) => {
    if (!selectedSpot) return;
    if (isNaN(deg) || !isFinite(deg)) return;
    const safeDeg = Math.round(((deg % 360) + 360) % 360);
    onUpdateSpotRotation(selectedSpot.id, safeDeg);
  };

  const handleStepSpotRot = (deltaDeg: number) => {
    if (!selectedSpot) return;
    handleUpdateSpotRot(selectedSpot.rotation + deltaDeg);
  };

  // Unlimited smooth zoom controls
  const handleZoom = (factor: number) => {
    cameraAngleRef.current.distance = Math.max(
      0.15,
      Math.min(60.0, cameraAngleRef.current.distance * factor)
    );
  };

  const handleResetCamera = () => {
    cameraAngleRef.current = { theta: 0.02, phi: 0.22, distance: 5.6 };
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#101115] font-sans">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP FLOATING BLENDER TOOLBAR (Mover, Rodar, Escalar, Elevar) */}
      {!isAvatarMode && (
        <div className="absolute top-3 left-4 z-20 flex items-center gap-1.5 bg-[#121317]/95 border border-[#d4af37]/60 rounded-xl px-2 py-1.5 shadow-[0_4px_25px_rgba(0,0,0,0.85)] backdrop-blur-md">
          <span className="text-[10px] font-semibold tracking-wider text-[#d4af37]/75 uppercase px-1 hidden sm:inline">
            Ferramenta:
          </span>

          <button
            type="button"
            onClick={() => onChangeGizmoMode('mover')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeGizmoMode === 'mover'
                ? 'bg-[#d4af37] text-black shadow-md font-bold'
                : 'text-[#e8d5b5]/80 hover:text-[#ffd700] hover:bg-[#d4af37]/15'
            }`}
            title="Mover objeto no plano do chão (Atalho: G)"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Mover (G)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeGizmoMode('rodar')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeGizmoMode === 'rodar'
                ? 'bg-[#d4af37] text-black shadow-md font-bold'
                : 'text-[#e8d5b5]/80 hover:text-[#ffd700] hover:bg-[#d4af37]/15'
            }`}
            title="Rotacionar em graus no eixo Y (Atalho: R)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rodar (R)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeGizmoMode('escalar')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeGizmoMode === 'escalar'
                ? 'bg-[#d4af37] text-black shadow-md font-bold'
                : 'text-[#e8d5b5]/80 hover:text-[#ffd700] hover:bg-[#d4af37]/15'
            }`}
            title="Escalar objeto proporcionalmente (Atalho: S)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Escalar (S)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeGizmoMode('elevar')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeGizmoMode === 'elevar'
                ? 'bg-[#d4af37] text-black shadow-md font-bold'
                : 'text-[#e8d5b5]/80 hover:text-[#ffd700] hover:bg-[#d4af37]/15'
            }`}
            title="Elevar objeto no eixo vertical (Atalho: E)"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Elevar (E)</span>
          </button>

          <div className="h-4 w-[1px] bg-[#d4af37]/30 mx-1 hidden sm:block" />

          {/* Quick Spots Toggles in Toolbar */}
          {onToggleShowSpots && (
            <button
              type="button"
              onClick={onToggleShowSpots}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                showSpots ? 'text-[#ffd700] hover:bg-[#d4af37]/15' : 'text-red-400 bg-red-950/30'
              }`}
              title={showSpots ? 'Ocultar spots da cena' : 'Mostrar spots na cena'}
            >
              {showSpots ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          )}

          {onToggleLockSpots && (
            <button
              type="button"
              onClick={onToggleLockSpots}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                lockSpots ? 'text-[#ffd700] bg-[#d4af37]/25' : 'text-[#d4af37]/60 hover:text-[#d4af37]'
              }`}
              title={lockSpots ? 'Spots travados (cliques afetam só objetos 3D)' : 'Travar spots'}
            >
              {lockSpots ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}

      {/* Scenario Loading Indicator Overlay */}
      {isLoadingScenario && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#121317]/95 border border-[#d4af37] rounded-xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.9)] backdrop-blur-md flex items-center gap-3 text-xs text-[#ffd700] animate-fade-in">
          <Loader2 className="w-5 h-5 animate-spin text-[#d4af37]" />
          <span className="font-semibold">{scenarioLoadingMsg}</span>
        </div>
      )}

      {/* Floating 2D SPOTS Overlaid in Scene (Only rendered when showSpots === true) */}
      {showSpots && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {spots.map((spot) => {
            if (!cameraRef.current || !mountRef.current) return null;
            const posVec = new THREE.Vector3(...spot.position);
            const proj = posVec.project(cameraRef.current);
            if (proj.z > 1) return null;

            const rect = mountRef.current.getBoundingClientRect();
            const screenX = ((proj.x + 1) / 2) * rect.width;
            const screenY = ((-proj.y + 1) / 2) * rect.height;

            const isSelected = selectedSpotId === spot.id;
            const isAvatarHere = isAvatarMode && avatarCurrentSpotId === spot.id;

            return (
              <div
                key={spot.id}
                style={{ left: `${screenX}px`, top: `${screenY}px` }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group ${
                  lockSpots ? 'pointer-events-none opacity-60' : 'pointer-events-auto cursor-pointer'
                }`}
                onClick={(e) => {
                  if (lockSpots) return;
                  e.stopPropagation();
                  if (isAvatarMode) {
                    onAvatarTeleport(spot.id);
                  } else {
                    onSelectSpot(spot.id);
                    onSelectObject(null);
                  }
                }}
                onMouseDown={(e) => handleSpotDragMouseDown(spot.id, e)}
              >
                {spot.type === 'sentar' ? (
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full bg-transparent border-2 border-[#d4af37] flex items-center justify-center text-[#d4af37] transition-transform ${
                        isSelected || isAvatarHere
                          ? 'scale-110 shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                          : ''
                      }`}
                    >
                      <MapPin className="w-4 h-4 fill-[#d4af37] stroke-black" />
                    </div>
                    <span className="mt-1 text-[11px] font-medium text-[#d4af37] tracking-wider select-none">
                      SPOT sentar
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="mb-1 text-[11px] font-medium text-[#d4af37] tracking-wider select-none">
                      SPOT em pé
                    </span>
                    <div
                      className={`w-28 h-12 rounded-[50%] border border-[#d4af37] bg-[#d4af37]/5 transition-all ${
                        isSelected
                          ? 'border-[#ffd700] ring-1 ring-[#ffd700]/60 bg-[#d4af37]/15'
                          : 'group-hover:border-[#ffd700]'
                      } ${isAvatarHere ? 'bg-[#d4af37]/25 ring-2 ring-[#d4af37]' : ''}`}
                    >
                      {isAvatarHere && (
                        <div className="w-full h-full flex items-center justify-center text-[#d4af37] text-[10px] font-bold">
                          Avatar
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FLOATING GIZMO OVER SELECTED SPOT */}
      {showSpots && !lockSpots && selectedSpot && spotGizmoScreenPos && !isAvatarMode && (
        <div
          style={{
            left: `${spotGizmoScreenPos.x}px`,
            top: `${spotGizmoScreenPos.y}px`,
          }}
          className="absolute transform -translate-x-1/2 -translate-y-full z-20 flex flex-col items-center pointer-events-auto animate-fade-in"
        >
          <div className="bg-[#141519]/95 border border-[#d4af37] rounded-lg px-2.5 py-1.5 shadow-[0_4px_25px_rgba(0,0,0,0.85)] backdrop-blur-md flex items-center gap-3 text-[#d4af37]">
            <button
              type="button"
              onClick={() => {
                onChangeGizmoMode('elevar');
                handleStepSpotPos(1, 0.05);
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded transition-all cursor-pointer ${
                activeGizmoMode === 'elevar'
                  ? 'bg-[#d4af37]/25 text-[#ffd700] ring-1 ring-[#d4af37]'
                  : 'text-[#d4af37]/80 hover:text-[#d4af37] hover:bg-[#d4af37]/10'
              }`}
            >
              <ArrowUp className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] font-semibold tracking-wider">ELEVAR</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeGizmoMode('mover')}
              className={`flex flex-col items-center justify-center p-1.5 rounded transition-all cursor-pointer ${
                activeGizmoMode === 'mover'
                  ? 'bg-[#d4af37]/25 text-[#ffd700] ring-1 ring-[#d4af37]'
                  : 'text-[#d4af37]/80 hover:text-[#d4af37] hover:bg-[#d4af37]/10'
              }`}
            >
              <Move className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] font-semibold tracking-wider">MOVER</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeGizmoMode('rodar');
                handleStepSpotRot(45);
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded transition-all cursor-pointer ${
                activeGizmoMode === 'rodar'
                  ? 'bg-[#d4af37]/25 text-[#ffd700] ring-1 ring-[#d4af37]'
                  : 'text-[#d4af37]/80 hover:text-[#d4af37] hover:bg-[#d4af37]/10'
              }`}
            >
              <RotateCw className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] font-semibold tracking-wider">RODAR</span>
            </button>
          </div>

          <div className="w-[1px] h-3 border-l border-dashed border-[#d4af37]/70 my-0.5" />

          <button
            type="button"
            onClick={() => onRemoveSpot(selectedSpot.id)}
            className="px-3 py-1 rounded-md bg-red-950/80 border border-red-500/80 text-red-300 hover:text-white hover:bg-red-900 text-[11px] font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Excluir spot</span>
          </button>
        </div>
      )}

      {/* FLOATING DIRECT INTERACTIVE SLIDER BAR HUD OVER SELECTED PLACED OBJECT */}
      {selectedObj && objectGizmoScreenPos && !isAvatarMode && (
        <div
          style={{
            left: `${objectGizmoScreenPos.x}px`,
            top: `${objectGizmoScreenPos.y}px`,
          }}
          className="absolute transform -translate-x-1/2 -translate-y-full z-20 flex flex-col items-center pointer-events-auto animate-fade-in"
        >
          {/* Main Floating Controller Box */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121317]/95 border border-[#d4af37] rounded-xl p-2.5 shadow-[0_6px_30px_rgba(0,0,0,0.9)] backdrop-blur-md flex flex-col gap-2 min-w-[260px] text-[#e8d5b5]"
          >
            {/* Top mode indicator & Object name */}
            <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-1.5 text-xs">
              <span className="font-bold text-[#ffd700] truncate max-w-[140px]">
                {selectedObj.name}
              </span>
              <button
                type="button"
                onClick={() => onRemoveObject(selectedObj.id)}
                className="p-1 rounded text-red-400 hover:text-white hover:bg-red-900/80 transition-colors cursor-pointer"
                title="Excluir objeto (Lixeira)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* DYNAMIC INTERACTIVE SLIDER BAR: Drag to increase/decrease smoothly! */}
            {activeGizmoMode === 'escalar' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[#d4af37]">Barra de Escala:</span>
                  <span className="font-mono text-[#ffd700] text-xs font-bold bg-black/40 px-1.5 py-0.5 rounded border border-[#d4af37]/30">
                    {selectedObj.scale[0].toFixed(2)}x
                  </span>
                </div>

                {/* Range Slider for Scale */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepObjScale(-0.05)}
                    className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="0.2"
                    max="3.5"
                    step="0.02"
                    value={selectedObj.scale[0]}
                    onChange={(e) => handleUpdateObjScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#20222a] rounded-lg appearance-none cursor-pointer accent-[#ffd700]"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepObjScale(0.05)}
                    className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                  >
                    +
                  </button>
                </div>

                {/* Quick scale preset pills */}
                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {[0.5, 0.75, 1.0, 1.5, 2.0].map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => handleUpdateObjScale(sc)}
                      className={`py-0.5 rounded text-[9px] font-mono transition-colors ${
                        Math.abs(selectedObj.scale[0] - sc) < 0.05
                          ? 'bg-[#d4af37] text-black font-bold'
                          : 'bg-[#181a20] text-[#e8d5b5]/80 hover:bg-[#d4af37]/20 hover:text-[#ffd700]'
                      }`}
                    >
                      {sc}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeGizmoMode === 'rodar' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[#d4af37]">Barra de Rotação:</span>
                  <span className="font-mono text-[#ffd700] text-xs font-bold bg-black/40 px-1.5 py-0.5 rounded border border-[#d4af37]/30">
                    {Math.round(((THREE.MathUtils.radToDeg(selectedObj.rotation[1]) % 360) + 360) % 360)}°
                  </span>
                </div>

                {/* Range Slider for Rotation */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepObjRotY(-15)}
                    className="px-1.5 py-0.5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black text-[10px] font-semibold text-[#ffd700]"
                  >
                    -15°
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={Math.round(((THREE.MathUtils.radToDeg(selectedObj.rotation[1]) % 360) + 360) % 360)}
                    onChange={(e) => handleUpdateObjRotY(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#20222a] rounded-lg appearance-none cursor-pointer accent-[#ffd700]"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepObjRotY(15)}
                    className="px-1.5 py-0.5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black text-[10px] font-semibold text-[#ffd700]"
                  >
                    +15°
                  </button>
                </div>

                {/* Quick angle pills */}
                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {[0, 45, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => handleUpdateObjRotY(deg)}
                      className="py-0.5 rounded bg-[#181a20] hover:bg-[#d4af37] hover:text-black text-[9px] font-mono text-[#e8d5b5]/80"
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeGizmoMode === 'elevar' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[#d4af37]">Barra de Altura (Y):</span>
                  <span className="font-mono text-[#ffd700] text-xs font-bold bg-black/40 px-1.5 py-0.5 rounded border border-[#d4af37]/30">
                    {selectedObj.position[1].toFixed(2)}m
                  </span>
                </div>

                {/* Range Slider for Elevation */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepObjPos(1, -0.05)}
                    className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.02"
                    value={selectedObj.position[1]}
                    onChange={(e) => handleUpdateObjPos(1, parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#20222a] rounded-lg appearance-none cursor-pointer accent-[#ffd700]"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepObjPos(1, 0.05)}
                    className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {activeGizmoMode === 'mover' && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[#ffd700]">
                  <span>Mover no Chão:</span>
                  <span className="font-mono text-[10px] text-[#e8d5b5]/80">
                    X: {selectedObj.position[0].toFixed(2)}m · Z: {selectedObj.position[2].toFixed(2)}m
                  </span>
                </div>
                <p className="text-[10px] text-[#e8d5b5]/60 leading-tight">
                  Arraste diretamente o objeto na cena ou use as setas 3D vermelha e azul!
                </p>
              </div>
            )}
          </div>

          <div className="w-[1px] h-3 border-l border-dashed border-[#d4af37]/70 my-0.5" />
        </div>
      )}

      {/* Floating Insertion Marker Banner */}
      {insertionCursorPoint && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-[#121317]/95 border border-[#d4af37] rounded-lg px-4 py-2 shadow-[0_4px_25px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center gap-3 text-xs text-[#e8d5b5]">
          <span className="text-[#d4af37] font-semibold">
            Ponto marcado em [{insertionCursorPoint[0]}, {insertionCursorPoint[2]}].
          </span>
          <span className="text-[#e8d5b5]/80">
            Clique em um item do inventário à esquerda para nascer aqui!
          </span>
          <button
            type="button"
            onClick={() => onSceneClickInsertionPoint(null)}
            className="p-0.5 rounded text-[#d4af37]/60 hover:text-[#d4af37] cursor-pointer"
            title="Cancelar ponto de inserção"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* DOCKED PRECISION NUMERIC INSPECTOR */}
      {(selectedObj || selectedSpot) && !isAvatarMode && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-2xl bg-[#121317]/95 border border-[#d4af37]/70 rounded-xl p-3 shadow-[0_10px_35px_rgba(0,0,0,0.9)] backdrop-blur-md text-[#e8d5b5] animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#d4af37]/25">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#d4af37]/15 border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37]">
                {selectedObj ? <Box className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#ffd700]">
                    {selectedObj ? selectedObj.name : selectedSpot?.name}
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded border border-[#d4af37]/40 text-[#d4af37]">
                    {selectedObj ? 'Móvel / Objeto' : `Spot ${selectedSpot?.type}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedObj) {
                    onRemoveObject(selectedObj.id);
                  } else if (selectedSpot) {
                    onRemoveSpot(selectedSpot.id);
                  }
                }}
                className="px-2.5 py-1 rounded bg-red-950/70 border border-red-500/70 text-red-300 hover:text-white hover:bg-red-800 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Excluir da sala"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Excluir</span>
              </button>

              <button
                type="button"
                onClick={() => setIsInspectorMinimized(!isInspectorMinimized)}
                className="p-1 text-[#d4af37]/70 hover:text-[#d4af37] cursor-pointer"
                title={isInspectorMinimized ? 'Expandir painel' : 'Minimizar painel'}
              >
                {isInspectorMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectObject(null);
                  onSelectSpot(null);
                }}
                className="p-1 text-[#d4af37]/70 hover:text-[#d4af37] cursor-pointer ml-1"
                title="Fechar seleção"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: Direct Numeric Inputs & Steppers */}
          {!isInspectorMinimized && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              {/* Column 1: Posição X, Y, Z */}
              <div className="p-2 rounded-lg bg-black/40 border border-[#d4af37]/20 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#d4af37] tracking-wider block">
                  Posição (Metros)
                </span>

                {/* X */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-[#e8d5b5]/70 w-3">X</span>
                  <div className="flex items-center gap-1 flex-1">
                    <button
                      type="button"
                      onClick={() => (selectedObj ? handleStepObjPos(0, -0.05) : handleStepSpotPos(0, -0.05))}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                    >
                      -
                    </button>
                    <NumericInput
                      step={0.05}
                      precision={2}
                      value={selectedObj ? selectedObj.position[0] : selectedSpot?.position[0] ?? 0}
                      onChange={(val) =>
                        selectedObj
                          ? handleUpdateObjPos(0, val)
                          : handleUpdateSpotPos(0, val)
                      }
                      className="w-full bg-[#14151a] border border-[#d4af37]/40 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-[#ffd700] outline-none focus:border-[#d4af37]"
                    />
                    <button
                      type="button"
                      onClick={() => (selectedObj ? handleStepObjPos(0, 0.05) : handleStepSpotPos(0, 0.05))}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Y (Elevação) */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-[#e8d5b5]/70 w-3">Y</span>
                  <div className="flex items-center gap-1 flex-1">
                    <button
                      type="button"
                      onClick={() => (selectedObj ? handleStepObjPos(1, -0.05) : handleStepSpotPos(1, -0.05))}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                    >
                      -
                    </button>
                    <NumericInput
                      step={0.05}
                      min={0}
                      max={5}
                      precision={2}
                      value={selectedObj ? selectedObj.position[1] : selectedSpot?.position[1] ?? 0}
                      onChange={(val) =>
                        selectedObj
                          ? handleUpdateObjPos(1, val)
                          : handleUpdateSpotPos(1, val)
                      }
                      className="w-full bg-[#14151a] border border-[#d4af37]/40 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-[#ffd700] outline-none focus:border-[#d4af37]"
                    />
                    <button
                      type="button"
                      onClick={() => (selectedObj ? handleStepObjPos(1, 0.05) : handleStepSpotPos(1, 0.05))}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Z */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-[#e8d5b5]/70 w-3">Z</span>
                  <div className="flex items-center gap-1 flex-1">
                    <button
                      type="button"
                      onClick={() => (selectedObj ? handleStepObjPos(2, -0.05) : handleStepSpotPos(2, -0.05))}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                    >
                      -
                    </button>
                    <NumericInput
                      step={0.05}
                      precision={2}
                      value={selectedObj ? selectedObj.position[2] : selectedSpot?.position[2] ?? 0}
                      onChange={(val) =>
                        selectedObj
                          ? handleUpdateObjPos(2, val)
                          : handleUpdateSpotPos(2, val)
                      }
                      className="w-full bg-[#14151a] border border-[#d4af37]/40 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-[#ffd700] outline-none focus:border-[#d4af37]"
                    />
                    <button
                      type="button"
                      onClick={() => (selectedObj ? handleStepObjPos(2, 0.05) : handleStepSpotPos(2, 0.05))}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs text-[#ffd700]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 2: Rotação Y (Graus °) */}
              <div className="p-2 rounded-lg bg-black/40 border border-[#d4af37]/20 space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#d4af37] tracking-wider block">
                    Rotação (Graus °)
                  </span>
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => (selectedObj ? handleStepObjRotY(-15) : handleStepSpotRot(-15))}
                      className="px-2 py-1 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black text-[10px] font-semibold text-[#ffd700]"
                    >
                      -15°
                    </button>
                    <NumericInput
                      step={5}
                      min={0}
                      max={360}
                      precision={0}
                      value={
                        selectedObj
                          ? Math.round(((THREE.MathUtils.radToDeg(selectedObj.rotation[1]) % 360) + 360) % 360)
                          : selectedSpot?.rotation || 0
                      }
                      onChange={(deg) =>
                        selectedObj
                          ? handleUpdateObjRotY(deg)
                          : handleUpdateSpotRot(deg)
                      }
                      className="w-full bg-[#14151a] border border-[#d4af37]/40 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-[#ffd700] outline-none focus:border-[#d4af37]"
                    />
                    <button
                      type="button"
                      onClick={() => (selectedObj ? handleStepObjRotY(15) : handleStepSpotRot(15))}
                      className="px-2 py-1 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black text-[10px] font-semibold text-[#ffd700]"
                    >
                      +15°
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => (selectedObj ? handleUpdateObjRotY(deg) : handleUpdateSpotRot(deg))}
                      className="py-0.5 rounded bg-[#16181f] hover:bg-[#d4af37] hover:text-black text-[9px] font-mono text-[#e8d5b5]/80"
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 3: Escala (para Objetos) */}
              <div className="p-2 rounded-lg bg-black/40 border border-[#d4af37]/20 space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#d4af37] tracking-wider block">
                    Escala (Multiplicador)
                  </span>

                  {selectedObj ? (
                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepObjScale(-0.1)}
                        className="px-2 py-1 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black text-[10px] font-semibold text-[#ffd700]"
                      >
                        -0.1
                      </button>
                      <NumericInput
                        step={0.05}
                        min={0.05}
                        max={10}
                        precision={2}
                        value={selectedObj.scale[0]}
                        onChange={(val) => handleUpdateObjScale(val)}
                        className="w-full bg-[#14151a] border border-[#d4af37]/40 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-[#ffd700] outline-none focus:border-[#d4af37]"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepObjScale(0.1)}
                        className="px-2 py-1 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black text-[10px] font-semibold text-[#ffd700]"
                      >
                        +0.1
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#e8d5b5]/50 mt-2">
                      Spot de teletransporte não possui escala variável.
                    </p>
                  )}
                </div>

                {selectedObj && (
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[0.5, 0.75, 1.0, 1.5].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => handleUpdateObjScale(sc)}
                        className="py-0.5 rounded bg-[#16181f] hover:bg-[#d4af37] hover:text-black text-[9px] font-mono text-[#e8d5b5]/80"
                      >
                        {sc}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera Zoom & Reset Controls without artificial limits */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => handleZoom(0.7)}
          className="w-8 h-8 rounded-lg bg-[#141519]/90 border border-[#d4af37]/50 hover:border-[#d4af37] text-[#ffd700] hover:bg-[#d4af37]/15 flex items-center justify-center cursor-pointer shadow-md transition-all"
          title="Aproximar Zoom (Sem Limites)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => handleZoom(1.35)}
          className="w-8 h-8 rounded-lg bg-[#141519]/90 border border-[#d4af37]/50 hover:border-[#d4af37] text-[#ffd700] hover:bg-[#d4af37]/15 flex items-center justify-center cursor-pointer shadow-md transition-all"
          title="Afastar Zoom (Visão Ampla)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          className="w-8 h-8 rounded-lg bg-[#141519]/90 border border-[#d4af37]/50 hover:border-[#d4af37] text-[#d4af37] hover:text-[#ffd700] hover:bg-[#d4af37]/15 flex items-center justify-center cursor-pointer shadow-md transition-all"
          title="Resetar Visão da Câmera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// Procedural 3D Modern Bed Model
function create3DBedMesh(): THREE.Group {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x22242b,
    roughness: 0.8,
    metalness: 0.1,
  });

  const mattressMat = new THREE.MeshStandardMaterial({
    color: 0xe8e6e2,
    roughness: 0.95,
  });

  const duvetMat = new THREE.MeshStandardMaterial({
    color: 0x363842,
    roughness: 0.9,
  });

  const pillowMat = new THREE.MeshStandardMaterial({
    color: 0xf5f3ee,
    roughness: 0.85,
  });

  // Base platform
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 1.7), woodMat);
  base.position.set(0, 0.14, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Headboard
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 1.7), woodMat);
  headboard.position.set(-1.0, 0.55, 0);
  headboard.castShadow = true;
  group.add(headboard);

  // Mattress
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.24, 1.55), mattressMat);
  mattress.position.set(0.04, 0.38, 0);
  mattress.castShadow = true;
  mattress.receiveShadow = true;
  group.add(mattress);

  // Duvet folded
  const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.56), duvetMat);
  duvet.position.set(0.32, 0.47, 0);
  duvet.castShadow = true;
  duvet.receiveShadow = true;
  group.add(duvet);

  // Pillows
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.55), pillowMat);
  p1.position.set(-0.65, 0.54, -0.38);
  p1.rotation.z = 0.12;
  p1.castShadow = true;
  group.add(p1);

  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.55), pillowMat);
  p2.position.set(-0.65, 0.54, 0.38);
  p2.rotation.z = 0.12;
  p2.castShadow = true;
  group.add(p2);

  return group;
}

// Procedural Scarlet Salon Architecture
function createScarletSalonArchitecture(): THREE.Group {
  const group = new THREE.Group();

  const scarletMat = new THREE.MeshStandardMaterial({
    color: 0x3d0f17,
    roughness: 0.85,
    metalness: 0.15,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.35,
    metalness: 0.75,
  });

  // Back Wall in rich scarlet
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(36, 12), scarletMat);
  backWall.position.set(0, 6, -6.48);
  backWall.receiveShadow = true;
  group.add(backWall);

  // Side walls
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(36, 12), scarletMat);
  leftWall.position.set(-9.98, 6, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(36, 12), scarletMat);
  rightWall.position.set(9.98, 6, 0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // Classical architectural molding frames on back wall
  for (let i = -3; i <= 3; i++) {
    const molding = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.6, 0.04), goldMat);
    molding.position.set(i * 2.8, 5.0, -6.44);
    molding.castShadow = true;
    group.add(molding);
  }

  // Classical Columns
  for (const x of [-6.5, 6.5]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 11.5, 24), goldMat);
    column.position.set(x, 5.75, -6.2);
    column.castShadow = true;
    group.add(column);
  }

  return group;
}

// Procedural Concrete Loft Architecture
function createLoftArchitecture(): THREE.Group {
  const group = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x27292e,
    roughness: 0.95,
    metalness: 0.1,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x121316,
    roughness: 0.5,
    metalness: 0.6,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x3d4b60,
    roughness: 0.1,
    metalness: 0.4,
  });

  // Back Wall with huge industrial grid window
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(36, 12), concreteMat);
  backWall.position.set(0, 6, -6.48);
  backWall.receiveShadow = true;
  group.add(backWall);

  // Industrial Window
  const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 6.5), glassMat);
  windowGlass.position.set(0, 6.0, -6.44);
  group.add(windowGlass);

  // Black Iron Window Grid
  for (let i = -3; i <= 3; i++) {
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 6.5, 0.08), steelMat);
    vBar.position.set(i * 1.5, 6.0, -6.42);
    group.add(vBar);
  }
  for (let j = -2; j <= 2; j++) {
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.06, 0.08), steelMat);
    hBar.position.set(0, 6.0 + j * 1.2, -6.42);
    group.add(hBar);
  }

  // Steel Pillars
  for (const x of [-7.5, 7.5]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 11.5, 0.45), steelMat);
    pillar.position.set(x, 5.75, -6.2);
    pillar.castShadow = true;
    group.add(pillar);
  }

  return group;
}

// Builder for Sectional L-Sofa with Chaise Longue
function createSectionalLSofa(): THREE.Group {
  const group = new THREE.Group();

  const fabricMat = new THREE.MeshStandardMaterial({
    color: 0x3e4046,
    roughness: 0.9,
    metalness: 0.05,
  });

  const darkBaseMat = new THREE.MeshStandardMaterial({
    color: 0x1f2125,
    roughness: 0.95,
  });

  const legMat = new THREE.MeshStandardMaterial({
    color: 0x0f1013,
    roughness: 0.4,
  });

  // Base
  const mainBase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.22, 0.95), darkBaseMat);
  mainBase.position.set(0.65, 0.16, 0);
  mainBase.castShadow = true;
  group.add(mainBase);

  const chaiseBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 1.7), darkBaseMat);
  chaiseBase.position.set(-0.95, 0.16, 0.38);
  chaiseBase.castShadow = true;
  group.add(chaiseBase);

  // Cushions
  for (let i = 0; i < 2; i++) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.88), fabricMat);
    cushion.position.set(0.3 + i * 0.9, 0.35, 0.02);
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    group.add(cushion);
  }

  const chaiseCushion = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.2, 1.62), fabricMat);
  chaiseCushion.position.set(-0.95, 0.35, 0.38);
  chaiseCushion.castShadow = true;
  chaiseCushion.receiveShadow = true;
  group.add(chaiseCushion);

  // Backrest
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.55, 0.22), fabricMat);
  backrest.position.set(0.2, 0.62, -0.42);
  backrest.castShadow = true;
  group.add(backrest);

  // Back pillows
  for (let i = -1; i <= 2; i++) {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.14), fabricMat);
    pillow.position.set(-0.7 + i * 0.76, 0.65, -0.28);
    pillow.rotation.x = -0.06;
    pillow.castShadow = true;
    group.add(pillow);
  }

  // Accent throw pillows
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.95 });
  const throwPillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.12), accentMat);
  throwPillow1.position.set(-1.25, 0.52, 0.2);
  throwPillow1.rotation.set(0.1, 0.4, 0.2);
  group.add(throwPillow1);

  const throwPillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.1), accentMat);
  throwPillow2.position.set(1.45, 0.52, -0.15);
  throwPillow2.rotation.set(0.1, -0.3, -0.1);
  group.add(throwPillow2);

  // Armrest
  const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 0.98), fabricMat);
  armrest.position.set(1.75, 0.44, 0.02);
  armrest.castShadow = true;
  group.add(armrest);

  // Legs
  const legPositions = [
    [-1.35, 0.04, 1.15],
    [-0.55, 0.04, 1.15],
    [-1.35, 0.04, -0.4],
    [1.7, 0.04, 0.4],
    [1.7, 0.04, -0.4],
    [0.2, 0.04, -0.4],
  ];

  legPositions.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), legMat);
    leg.position.set(lx, ly, lz);
    group.add(leg);
  });

  return group;
}

// Procedural decorative object mesh
function createDecorativeMesh(name: string): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2b2d34,
    roughness: 0.7,
    metalness: 0.2,
  });

  if (name.toLowerCase().includes('cama') || name.toLowerCase().includes('bed')) {
    const bed = create3DBedMesh();
    g.add(bed);
  } else if (name.toLowerCase().includes('mesa')) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 32), mat);
    top.position.y = 0.45;
    top.castShadow = true;
    g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 16), mat);
    leg.position.y = 0.225;
    leg.castShadow = true;
    g.add(leg);
  } else if (name.toLowerCase().includes('estátua') || name.toLowerCase().includes('dourad')) {
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.35), mat);
    pedestal.position.y = 0.25;
    pedestal.castShadow = true;
    g.add(pedestal);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.8,
    });
    const statue = new THREE.Mesh(new THREE.TorusKnotGeometry(0.14, 0.04, 64, 16), goldMat);
    statue.position.y = 0.65;
    statue.castShadow = true;
    g.add(statue);
  } else {
    // Default elegant cube / coffee block
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), mat);
    box.position.y = 0.225;
    box.castShadow = true;
    g.add(box);
  }

  return g;
}

// Floor tiles texture
function createFloorTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#222328';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(40,42,48,0.2)' : 'rgba(24,25,29,0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = '#141518';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 508);

  return new THREE.CanvasTexture(canvas);
}

// Wall texture
function createWallTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c1d22';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#141519';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// Visitor avatar mesh
function createSimpleAvatarMesh(): THREE.Group {
  const group = new THREE.Group();
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2025, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89d7c, roughness: 0.6 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.5, 16), darkMat);
  body.position.y = 0.45;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), skinMat);
  head.position.y = 0.8;
  head.castShadow = true;
  group.add(head);

  return group;
}
