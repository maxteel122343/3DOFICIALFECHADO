import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
  SpotItem,
  GizmoEditMode,
  PlayableBoundary,
  PlacedObject,
  InventoryItem,
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
  Ruler,
  User,
  Grid,
  Layers,
  Crosshair,
  Tag,
} from 'lucide-react';
import { MetricSizeSelectorModal } from './MetricSizeSelectorModal';
import {
  METRIC_PRESETS,
  MetricPresetItem,
  calculatePresetScale,
} from '../types/metricPresets';

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
  onClearAllSpots?: () => void;
  onRemoveOverlappingSpots?: () => void;
  onUpdateObjectTransform: (
    id: string,
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => void;
  onRemoveObject: (id: string) => void;
  onUpdateBoundary?: (boundary: PlayableBoundary) => void;
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
  customAvatarObjectId?: string | null;
  onSetCustomAvatarObjectId?: (id: string | null) => void;
  onUpdateObjectType?: (id: string, type: 'cenario' | 'movel' | 'objeto' | 'avatar') => void;
  onDropItemOnScene?: (item: InventoryItem, coords: [number, number, number]) => void;
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
  onClearAllSpots,
  onRemoveOverlappingSpots,
  onUpdateObjectTransform,
  onRemoveObject,
  onUpdateBoundary,
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
  customAvatarObjectId = null,
  onSetCustomAvatarObjectId,
  onUpdateObjectType,
  onDropItemOnScene,
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
  const activeAvatarHaloRef = useRef<THREE.Group | null>(null);
  const boundaryWireframeRef = useRef<THREE.LineSegments | null>(null);
  const insertionMarkerRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const transformControlsRef = useRef<TransformControls | null>(null);

  // Metric Reference System Groups & State (Avatar 1.70m, Grid 1m x 1m, Room 6x8x2.8m, Vertical Spatial Grid)
  const metricGridGroupRef = useRef<THREE.Group | null>(null);
  const floorMeterLabelsGroupRef = useRef<THREE.Group | null>(null);
  const spatialVerticalGridGroupRef = useRef<THREE.Group | null>(null);
  const referenceAvatarGroupRef = useRef<THREE.Group | null>(null);
  const roomBoundaryGroupRef = useRef<THREE.Group | null>(null);
  const heightIndicatorGroupRef = useRef<THREE.Group | null>(null);
  const spotsFloorGroupRef = useRef<THREE.Group | null>(null);
  const [showReferenceAvatar, setShowReferenceAvatar] = useState<boolean>(true);
  const [isReferenceAvatarSelected, setIsReferenceAvatarSelected] = useState<boolean>(false);
  const [showMetricGrid, setShowMetricGrid] = useState<boolean>(true);
  const [showFloorMeterLabels, setShowFloorMeterLabels] = useState<boolean>(false); // Ocultar marcadores de metros no chão por padrão
  const [showSpatialVerticalGrid, setShowSpatialVerticalGrid] = useState<boolean>(true);
  const [spatialGridOrigin, setSpatialGridOrigin] = useState<[number, number, number] | null>(null);
  const [isSizeSelectorModalOpen, setIsSizeSelectorModalOpen] = useState<boolean>(false);

  // Camera Orbit & Pan Navigation (Right click / Middle click drag to pan camera)
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0.3, 0.7, -0.6));
  const isPanningRef = useRef<boolean>(false);
  const hasMovedMouseDuringDownRef = useRef<boolean>(false);

  // Measured raw model bounding boxes for accurate real-world scaling & Encaixar no Metro
  const rawDimensionsMapRef = useRef<
    Map<
      string,
      {
        width: number;
        height: number;
        depth: number;
        targetHeight: number;
        label: string;
        isRoom: boolean;
      }
    >
  >(new Map());
  const [rawDimensionsState, setRawDimensionsState] = useState<{
    [id: string]: {
      width: number;
      height: number;
      depth: number;
      targetHeight: number;
      label: string;
      isRoom: boolean;
    };
  }>({});

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
  const selectedSpotIdRef = useRef<string | null>(selectedSpotId);
  selectedSpotIdRef.current = selectedSpotId;
  const onUpdateObjectTransformRef = useRef(onUpdateObjectTransform);
  onUpdateObjectTransformRef.current = onUpdateObjectTransform;
  const onUpdateSpotPositionRef = useRef(onUpdateSpotPosition);
  onUpdateSpotPositionRef.current = onUpdateSpotPosition;
  const onUpdateSpotRotationRef = useRef(onUpdateSpotRotation);
  onUpdateSpotRotationRef.current = onUpdateSpotRotation;
  const spotGizmoAnchorRef = useRef<THREE.Group | null>(null);
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
        } else if (attached && selectedSpotIdRef.current) {
          const px = Number.isFinite(attached.position.x) ? parseFloat(attached.position.x.toFixed(2)) : 0;
          const py = Number.isFinite(attached.position.y) ? parseFloat(attached.position.y.toFixed(2)) : 0;
          const pz = Number.isFinite(attached.position.z) ? parseFloat(attached.position.z.toFixed(2)) : 0;
          const deg = Math.round(((THREE.MathUtils.radToDeg(attached.rotation.y) % 360) + 360) % 360);
          onUpdateSpotPositionRef.current(selectedSpotIdRef.current, [px, py, pz]);
          onUpdateSpotRotationRef.current(selectedSpotIdRef.current, deg);
        }
      }
    });

    transformControls.addEventListener('objectChange', () => {
      const attached = transformControls.object;
      if (!attached) return;

      // Real-time spatial height guideline sync during dragging
      if (heightIndicatorGroupRef.current) {
        const grp = heightIndicatorGroupRef.current;
        const curY = attached.position.y;
        grp.visible = true;
        grp.position.set(attached.position.x, 0, attached.position.z);
        const line = grp.children[0] as THREE.Line;
        if (line) {
          line.scale.set(1, Math.max(0.001, curY), 1);
          line.computeLineDistances();
        }
        const sprite = grp.children[3] as THREE.Sprite;
        if (sprite) {
          sprite.position.set(0, Math.max(0.25, curY + 0.35), 0);
        }
      }

      if (tcRafId) cancelAnimationFrame(tcRafId);
      tcRafId = requestAnimationFrame(() => {
        tcRafId = null;
        if (selectedObjectIdRef.current) {
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
        } else if (selectedSpotIdRef.current) {
          const px = Number.isFinite(attached.position.x) ? parseFloat(attached.position.x.toFixed(2)) : 0;
          const py = Number.isFinite(attached.position.y) ? parseFloat(attached.position.y.toFixed(2)) : 0;
          const pz = Number.isFinite(attached.position.z) ? parseFloat(attached.position.z.toFixed(2)) : 0;
          const deg = Math.round(((THREE.MathUtils.radToDeg(attached.rotation.y) % 360) + 360) % 360);
          onUpdateSpotPositionRef.current(selectedSpotIdRef.current, [px, py, pz]);
          onUpdateSpotRotationRef.current(selectedSpotIdRef.current, deg);
        }
      });
    });

    // 3D Anchor for Spot Gizmo (allows full 3D manipulation of spots in the scene)
    const spotGizmoAnchor = new THREE.Group();
    spotGizmoAnchor.name = 'spotGizmoAnchor';
    const spotDiscGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 32);
    const spotDiscMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.65,
    });
    const spotDisc = new THREE.Mesh(spotDiscGeo, spotDiscMat);
    spotDisc.position.y = 0.02;
    spotGizmoAnchor.add(spotDisc);

    // Exact luminous center point (Bullseye) at (0, 0.03, 0)
    const centerPointGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const centerPointMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerPoint = new THREE.Mesh(centerPointGeo, centerPointMat);
    centerPoint.position.set(0, 0.03, 0);
    spotGizmoAnchor.add(centerPoint);

    // Exact direction arrow originating from center and staying strictly within the 0.3m disc
    const arrowDir = new THREE.Vector3(0, 0, -1);
    const arrowOrigin = new THREE.Vector3(0, 0.035, 0);
    const arrowHelper = new THREE.ArrowHelper(arrowDir, arrowOrigin, 0.28, 0xffd700, 0.10, 0.07);
    spotGizmoAnchor.add(arrowHelper);

    // Precision crosshairs on the spot disc
    const spotCrossGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.28, 0.025, 0),
      new THREE.Vector3(0.28, 0.025, 0),
      new THREE.Vector3(0, 0.025, -0.28),
      new THREE.Vector3(0, 0.025, 0.28),
    ]);
    const spotCrossMat = new THREE.LineBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8 });
    const spotCross = new THREE.LineSegments(spotCrossGeo, spotCrossMat);
    spotGizmoAnchor.add(spotCross);

    spotGizmoAnchor.visible = false;
    scene.add(spotGizmoAnchor);
    spotGizmoAnchorRef.current = spotGizmoAnchor;

    // 3D Visual floor target discs for ALL spots in the scene
    const spotsFloorGroup = new THREE.Group();
    spotsFloorGroup.name = 'spotsFloorGroup';
    scene.add(spotsFloorGroup);
    spotsFloorGroupRef.current = spotsFloorGroup;

    // Avatar mesh for visitor mode
    const avatarGroup = createSimpleAvatarMesh();
    avatarGroup.position.set(0.8, 0.02, 1.1);
    avatarGroup.visible = false;
    scene.add(avatarGroup);
    avatarGroupRef.current = avatarGroup;

    // Active Avatar Halo Ground Indicator
    const avatarHaloGroup = new THREE.Group();
    const haloRingGeo = new THREE.RingGeometry(0.38, 0.48, 32);
    const haloRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const haloRing = new THREE.Mesh(haloRingGeo, haloRingMat);
    haloRing.rotation.x = -Math.PI / 2;
    avatarHaloGroup.add(haloRing);

    const innerDiscGeo = new THREE.CircleGeometry(0.36, 32);
    const innerDiscMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
    });
    const innerDisc = new THREE.Mesh(innerDiscGeo, innerDiscMat);
    innerDisc.rotation.x = -Math.PI / 2;
    avatarHaloGroup.add(innerDisc);

    avatarHaloGroup.visible = false;
    scene.add(avatarHaloGroup);
    activeAvatarHaloRef.current = avatarHaloGroup;

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

    // Metric Grid (1m x 1m) and Axes with 1m markers
    const { group: metricGrid, labelsGroup: floorMeterLabelsGroup } = createMetricGridAndAxes();
    metricGrid.visible = showMetricGrid;
    floorMeterLabelsGroup.visible = showFloorMeterLabels;
    scene.add(metricGrid);
    metricGridGroupRef.current = metricGrid;
    floorMeterLabelsGroupRef.current = floorMeterLabelsGroup;

    // Persistent Ghost Reference Avatar (1.70m) in corner with Measuring Tape
    const refAvatar = createReferenceGhostAvatar();
    refAvatar.visible = showReferenceAvatar && !isAvatarMode;
    scene.add(refAvatar);
    referenceAvatarGroupRef.current = refAvatar;

    // Room Boundary Box (6m x 8m x 2.8m, Ceiling at Y = 2.80m)
    const roomBoundary = createRoomBoundaryBox(boundary);
    roomBoundary.visible = showBoundaryGhost;
    scene.add(roomBoundary);
    roomBoundaryGroupRef.current = roomBoundary;

    // Spatial Vertical Grid along boundary walls or custom anchor
    const spatialVerticalGrid = createSpatialVerticalGrid(boundary, spatialGridOrigin);
    spatialVerticalGrid.visible = showSpatialVerticalGrid;
    scene.add(spatialVerticalGrid);
    spatialVerticalGridGroupRef.current = spatialVerticalGrid;

    // 3D Spatial Height Indicator (Vertical Guideline, Ground Ring Target & Floating Metric Badge)
    const heightIndicatorGroup = new THREE.Group();
    heightIndicatorGroup.name = 'heightIndicatorHelper';

    const guideLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
    ]);
    const guideLineMat = new THREE.LineDashedMaterial({
      color: 0x4ade80,
      dashSize: 0.1,
      gapSize: 0.06,
    });
    const guideLine = new THREE.Line(guideLineGeo, guideLineMat);
    guideLine.computeLineDistances();
    heightIndicatorGroup.add(guideLine);

    const floorRingGeo = new THREE.RingGeometry(0.18, 0.24, 24);
    const floorRingMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.005;
    heightIndicatorGroup.add(floorRing);

    const crossGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.35, 0.006, 0),
      new THREE.Vector3(0.35, 0.006, 0),
      new THREE.Vector3(0, 0.006, -0.35),
      new THREE.Vector3(0, 0.006, 0.35),
    ]);
    const crossMat = new THREE.LineBasicMaterial({ color: 0x4ade80 });
    const crosshair = new THREE.LineSegments(crossGeo, crossMat);
    heightIndicatorGroup.add(crosshair);

    const heightBadgeSprite = createMetricTextSprite('▲ Altura: 0.00m (Solo Y=0)', '#0f172a', '#4ade80');
    heightBadgeSprite.position.set(0, 0.35, 0);
    heightIndicatorGroup.add(heightBadgeSprite);

    heightIndicatorGroup.visible = false;
    scene.add(heightIndicatorGroup);
    heightIndicatorGroupRef.current = heightIndicatorGroup;

    // Render loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Camera Orbit position with broad limitless zoom range & pan target
      if (cameraRef.current) {
        const { theta, phi, distance } = cameraAngleRef.current;
        const cam = cameraRef.current;
        const target = cameraTargetRef.current;
        cam.position.x = target.x + distance * Math.sin(theta) * Math.cos(phi);
        cam.position.y = target.y + distance * Math.sin(phi);
        cam.position.z = target.z + distance * Math.cos(theta) * Math.cos(phi);
        cam.lookAt(target.x, target.y, target.z);

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

        // Live Spatial Height & Floor Projection Tracking helper
        if (heightIndicatorGroupRef.current) {
          let targetPos: { x: number; y: number; z: number } | null = null;
          if (selectedObjectIdRef.current && meshMapRef.current.has(selectedObjectIdRef.current)) {
            const m = meshMapRef.current.get(selectedObjectIdRef.current)!;
            targetPos = { x: m.position.x, y: m.position.y, z: m.position.z };
          } else if (selectedSpotIdRef.current && spotGizmoAnchorRef.current && spotGizmoAnchorRef.current.visible) {
            const a = spotGizmoAnchorRef.current;
            targetPos = { x: a.position.x, y: a.position.y, z: a.position.z };
          }

          if (targetPos && !isAvatarMode) {
            const grp = heightIndicatorGroupRef.current;
            grp.visible = true;
            grp.position.set(targetPos.x, 0, targetPos.z);
            const line = grp.children[0] as THREE.Line;
            if (line) {
              const clampedY = Math.max(0.001, targetPos.y);
              line.scale.set(1, clampedY, 1);
              line.computeLineDistances();
            }
            const sprite = grp.children[3] as THREE.Sprite;
            if (sprite) {
              sprite.position.set(0, Math.max(0.25, targetPos.y + 0.35), 0);
            }
          } else {
            heightIndicatorGroupRef.current.visible = false;
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Mouse handlers for natural orbit, right-click camera pan, and direct object interaction
    const handleMouseDown = (e: MouseEvent) => {
      hasMovedMouseDuringDownRef.current = false;
      if (isTransformDraggingRef.current) return;
      if (e.target !== renderer.domElement) return;

      // RIGHT CLICK (button === 2) OR MIDDLE CLICK (button === 1): PAN CAMERA
      if (e.button === 2 || e.button === 1) {
        e.preventDefault();
        isPanningRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (e.button !== 0) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Check if clicking on an object in the scene to select immediately & allow direct dragging or avatar control
      if (placedObjectsGroupRef.current) {
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
            const targetObj = placedObjects.find((o) => o.id === foundId);

            if (isAvatarMode) {
              // In Avatar Mode: clicking an avatar object controls it!
              onSelectObject(foundId);
              onSelectSpot(null);
              if (
                targetObj &&
                (targetObj.type === 'avatar' ||
                  targetObj.isAvatar ||
                  targetObj.name.toLowerCase().includes('avatar') ||
                  customAvatarObjectId === foundId)
              ) {
                onSetCustomAvatarObjectId?.(foundId);
              }
              return;
            }

            onSelectObject(foundId);
            onSelectSpot(null);

            // Prepare for direct drag if in mover, rodar or escalar mode
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
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedMouseDuringDownRef.current = true;
      }

      // 0. Camera Pan Navigation (Right-click or Middle-click drag)
      if (isPanningRef.current && cameraRef.current) {
        const cam = cameraRef.current;
        const factor = cameraAngleRef.current.distance * 0.0016;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
        // Dragging right moves camera target left, dragging up moves target up
        cameraTargetRef.current.addScaledVector(right, -dx * factor);
        cameraTargetRef.current.addScaledVector(up, dy * factor);
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // 1. Direct object manipulation (Blender style) with 60 FPS in-place transform
      if (isDirectDraggingObjectRef.current && selectedObjectIdRef.current && directDragStartPosRef.current) {
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

      cameraAngleRef.current.theta -= dx * 0.004;
      cameraAngleRef.current.phi = Math.max(
        0.02,
        Math.min(0.95, cameraAngleRef.current.phi + dy * 0.003)
      );

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) {
        isPanningRef.current = false;
      }
      isOrbitingRef.current = false;
      isDraggingSpotRef.current = false;
      if (isDirectDraggingObjectRef.current) {
        isDirectDraggingObjectRef.current = false;
        flushReactTransformUpdate();
      }
    };

    // Canvas click: Direct click to select objects or mark insertion point on floor
    const handleClick = (e: MouseEvent) => {
      if (hasMovedMouseDuringDownRef.current) return;
      if (isTransformDraggingRef.current) return;
      if (!container || !cameraRef.current || !floorMeshRef.current) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check if clicking directly on an object in the 3D scene
      if (placedObjectsGroupRef.current) {
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
            const targetObj = placedObjects.find((o) => o.id === foundId);
            onSelectObject(foundId);
            onSelectSpot(null);
            if (
              isAvatarMode &&
              targetObj &&
              (targetObj.type === 'avatar' ||
                targetObj.isAvatar ||
                targetObj.name.toLowerCase().includes('avatar') ||
                customAvatarObjectId === foundId)
            ) {
              onSetCustomAvatarObjectId?.(foundId);
            }
            return;
          }
        }
      }

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
        0.05,
        Math.min(300.0, cameraAngleRef.current.distance * factor)
      );
    };

    // Keyboard shortcuts for Blender-style tools: G (move), R (rotate), S (scale), E (elevate), Delete
    // and Keyboard Arrow Navigation (setas do teclado: frente, trás, lados, cima/baixo)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Keyboard arrow keys & WASD to move/pan scenario
      const step = e.shiftKey ? 1.2 : 0.45;
      const { theta } = cameraAngleRef.current;
      const forwardVec = new THREE.Vector3(-Math.sin(theta), 0, -Math.cos(theta)).normalize();
      const rightVec = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta)).normalize();

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        cameraTargetRef.current.addScaledVector(forwardVec, step);
        return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        cameraTargetRef.current.addScaledVector(forwardVec, -step);
        return;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cameraTargetRef.current.addScaledVector(rightVec, -step);
        return;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        cameraTargetRef.current.addScaledVector(rightVec, step);
        return;
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        cameraTargetRef.current.y = Math.min(25, cameraTargetRef.current.y + step);
        return;
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        cameraTargetRef.current.y = Math.max(-5, cameraTargetRef.current.y - step);
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
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    domEl.addEventListener('contextmenu', handleContextMenu);
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
      domEl.removeEventListener('contextmenu', handleContextMenu);
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

        // Metric Auto-scale: "se for CASA / ROOM: escala = 2.8 / altura_arquivo // teto ~2.8 m"
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const rawHeight = Math.max(0.01, size.y);
        const targetCeiling = 2.80;
        const scale = targetCeiling / rawHeight;
        model.scale.set(scale, scale, scale);

        // Record scene room raw dimensions for presets & scaling
        const sceneDims = {
          width: Math.max(0.01, size.x),
          height: rawHeight,
          depth: Math.max(0.01, size.z),
          targetHeight: 2.80,
          label: 'Cenário da Sala (Teto 2,80 m)',
          isRoom: true,
        };
        rawDimensionsMapRef.current.set('__scene_room__', sceneDims);
        setRawDimensionsState((prev) => ({ ...prev, ['__scene_room__']: sceneDims }));

        // Center on X and Z
        const scaledBox = new THREE.Box3().setFromObject(model);
        const center = scaledBox.getCenter(new THREE.Vector3());
        model.position.x = -center.x;
        model.position.z = -center.z;

        // Align floor strictly at Y = 0
        scaledBox.setFromObject(model);
        model.position.y = -scaledBox.min.y;

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
          const existingDims = rawDimensionsMapRef.current.get(obj.id);
          if (existingDims) {
            setRawDimensionsState((prev) => ({ ...prev, [obj.id]: existingDims }));
          }
        } else {
          // Load custom uploaded GLB file once
          const loader = new GLTFLoader();
          loader.load(
            obj.fileBlobUrl,
            (gltf) => {
              const m = gltf.scene;

              // Unscaled raw bounding box
              const rawBox = new THREE.Box3().setFromObject(m);
              const rawSize = rawBox.getSize(new THREE.Vector3());
              const rawW = Math.max(0.01, rawSize.x);
              const rawH = Math.max(0.01, rawSize.y);
              const rawD = Math.max(0.01, rawSize.z);

              // Align base strictly to local Y = 0 (ground level)
              m.position.y = -rawBox.min.y;
              // Center horizontally
              m.position.x = -(rawBox.min.x + rawBox.max.x) / 2;
              m.position.z = -(rawBox.min.z + rawBox.max.z) / 2;

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

              // Metric scaling rules
              const metric = calculateMetricScale(rawSize, obj.type, obj.name);
              const dimsRecord = {
                width: rawW,
                height: rawH,
                depth: rawD,
                targetHeight: metric.targetHeight,
                label: metric.label,
                isRoom: metric.isRoom,
              };
              rawDimensionsMapRef.current.set(obj.id, dimsRecord);
              setRawDimensionsState((prev) => ({ ...prev, [obj.id]: dimsRecord }));

              gltfCacheRef.current.set(obj.fileBlobUrl!, m);
              if (meshMapRef.current.has(obj.id)) {
                objGroup.add(m.clone(true));
              }

              // Auto-scale on insert: if scale is virgin [1, 1, 1], scale immediately to match metric!
              if (
                obj.scale[0] === 1 &&
                obj.scale[1] === 1 &&
                obj.scale[2] === 1 &&
                Math.abs(metric.scale - 1) > 0.05
              ) {
                objGroup.scale.set(metric.scale, metric.scale, metric.scale);
                onUpdateObjectTransformRef.current(obj.id, {
                  position: [obj.position[0], 0.0, obj.position[2]],
                  rotation: obj.rotation,
                  scale: [metric.scale, metric.scale, metric.scale],
                });
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
      } else if (
        obj.type === 'avatar' ||
        obj.isAvatar ||
        obj.modelType === 'avatar' ||
        obj.name.toLowerCase().includes('avatar')
      ) {
        const avatarMesh = createSimpleAvatarMesh();
        objGroup.add(avatarMesh);
        const dimsRecord = {
          width: 0.6,
          height: 1.7,
          depth: 0.4,
          targetHeight: 1.7,
          label: 'Avatar Interativo (~1,70 m)',
          isRoom: false,
        };
        rawDimensionsMapRef.current.set(obj.id, dimsRecord);
        setRawDimensionsState((prev) => ({ ...prev, [obj.id]: dimsRecord }));
      } else if (obj.modelType === 'sofa' || obj.name.toLowerCase().includes('sofa')) {
        const sofa = createSectionalLSofa();
        objGroup.add(sofa);
        const dimsRecord = {
          width: 3.3,
          height: 0.85,
          depth: 1.7,
          targetHeight: 0.85,
          label: 'Sofá Minimalista (~0,85 m)',
          isRoom: false,
        };
        rawDimensionsMapRef.current.set(obj.id, dimsRecord);
        setRawDimensionsState((prev) => ({ ...prev, [obj.id]: dimsRecord }));
      } else {
        const decorative = createDecorativeMesh(obj.name);
        objGroup.add(decorative);
        const dimsRecord = {
          width: 1.2,
          height: 0.65,
          depth: 1.2,
          targetHeight: 0.65,
          label: 'Móvel Decorativo (~0,65 m)',
          isRoom: false,
        };
        rawDimensionsMapRef.current.set(obj.id, dimsRecord);
        setRawDimensionsState((prev) => ({ ...prev, [obj.id]: dimsRecord }));
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
      } else if (selectedSpotId && !lockSpots && showSpots && !isAvatarMode) {
        const spot = spots.find((s) => s.id === selectedSpotId);
        if (spot && spotGizmoAnchorRef.current) {
          if (!isTransformDraggingRef.current) {
            spotGizmoAnchorRef.current.position.set(...spot.position);
            spotGizmoAnchorRef.current.rotation.set(0, THREE.MathUtils.degToRad(spot.rotation), 0);
          }
          spotGizmoAnchorRef.current.visible = true;
          if (transformControlsRef.current.object !== spotGizmoAnchorRef.current) {
            transformControlsRef.current.attach(spotGizmoAnchorRef.current);
          }
        } else {
          transformControlsRef.current.detach();
        }
      } else {
        transformControlsRef.current.detach();
      }
    }
  }, [placedObjects, selectedObjectId, selectedSpotId, spots, lockSpots, showSpots, isAvatarMode]);

  // 4. Update TransformControls visual mode (Mover, Rodar, Escalar, Elevar)
  useEffect(() => {
    const tc = transformControlsRef.current;
    if (!tc) return;

    if (isAvatarMode || (!selectedObjectId && (!selectedSpotId || lockSpots || !showSpots))) {
      tc.detach();
      if (spotGizmoAnchorRef.current) spotGizmoAnchorRef.current.visible = false;
      return;
    }

    if (selectedSpotId && !selectedObjectId) {
      if (spotGizmoAnchorRef.current) spotGizmoAnchorRef.current.visible = true;
      if (activeGizmoMode === 'rodar') {
        tc.setMode('rotate');
        tc.showX = false;
        tc.showY = true;
        tc.showZ = false;
      } else if (activeGizmoMode === 'elevar') {
        tc.setMode('translate');
        tc.showX = false;
        tc.showY = true;
        tc.showZ = false;
      } else {
        tc.setMode('translate');
        tc.showX = true;
        tc.showY = true; // Seta para cima e para baixo (eixo vertical Y)
        tc.showZ = true;
      }
      return;
    }

    if (spotGizmoAnchorRef.current) spotGizmoAnchorRef.current.visible = false;
    if (activeGizmoMode === 'mover') {
      tc.setMode('translate');
      tc.showX = true;
      tc.showY = true; // Seta para cima e para baixo (eixo vertical Y)
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
  }, [activeGizmoMode, selectedObjectId, selectedSpotId, lockSpots, showSpots, isAvatarMode]);

  // 4b. Synchronize spotGizmoAnchor with active spot
  useEffect(() => {
    const tc = transformControlsRef.current;
    if (!tc) return;

    if (selectedSpotId && !selectedObjectId && !lockSpots && showSpots && !isAvatarMode) {
      const spot = spots.find((s) => s.id === selectedSpotId);
      if (spot && spotGizmoAnchorRef.current) {
        if (!isTransformDraggingRef.current) {
          spotGizmoAnchorRef.current.position.set(...spot.position);
          spotGizmoAnchorRef.current.rotation.set(0, THREE.MathUtils.degToRad(spot.rotation), 0);
        }
        spotGizmoAnchorRef.current.visible = true;
        if (tc.object !== spotGizmoAnchorRef.current) {
          tc.attach(spotGizmoAnchorRef.current);
        }
      }
    } else if (!selectedObjectId) {
      if (tc.object === spotGizmoAnchorRef.current) {
        tc.detach();
      }
      if (spotGizmoAnchorRef.current) {
        spotGizmoAnchorRef.current.visible = false;
      }
    }
  }, [selectedSpotId, selectedObjectId, spots, lockSpots, showSpots, isAvatarMode]);

  // 5. Update Boundary Box and Metric Reference visibility
  useEffect(() => {
    if (roomBoundaryGroupRef.current) {
      roomBoundaryGroupRef.current.visible = showBoundaryGhost;
    }
  }, [showBoundaryGhost]);

  useEffect(() => {
    if (referenceAvatarGroupRef.current) {
      referenceAvatarGroupRef.current.visible = showReferenceAvatar && !isAvatarMode;
    }
  }, [showReferenceAvatar, isAvatarMode]);

  useEffect(() => {
    if (metricGridGroupRef.current) {
      metricGridGroupRef.current.visible = showMetricGrid;
    }
  }, [showMetricGrid]);

  useEffect(() => {
    if (spatialVerticalGridGroupRef.current) {
      spatialVerticalGridGroupRef.current.visible = showSpatialVerticalGrid;
    }
  }, [showSpatialVerticalGrid]);

  // Re-create boundary box and spatial vertical grid when room boundary dimensions or position change
  useEffect(() => {
    if (!sceneRef.current) return;
    if (roomBoundaryGroupRef.current) {
      sceneRef.current.remove(roomBoundaryGroupRef.current);
    }
    const newBoundaryBox = createRoomBoundaryBox(boundary);
    newBoundaryBox.visible = showBoundaryGhost;
    sceneRef.current.add(newBoundaryBox);
    roomBoundaryGroupRef.current = newBoundaryBox;

    if (spatialVerticalGridGroupRef.current) {
      sceneRef.current.remove(spatialVerticalGridGroupRef.current);
    }
    const newVerticalGrid = createSpatialVerticalGrid(boundary);
    newVerticalGrid.visible = showSpatialVerticalGrid;
    sceneRef.current.add(newVerticalGrid);
    spatialVerticalGridGroupRef.current = newVerticalGrid;
  }, [
    boundary.x,
    boundary.y,
    boundary.z,
    boundary.position?.[0],
    boundary.position?.[1],
    boundary.position?.[2],
    showBoundaryGhost,
    showSpatialVerticalGrid,
  ]);

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
      if (customAvatarObjectId) {
        // A scene object is designated as the avatar; hide the default humanoid avatar
        avatarGroupRef.current.visible = false;
      } else {
        const activeSpot = spots.find((s) => s.id === avatarCurrentSpotId);
        if (activeSpot) {
          avatarGroupRef.current.position.set(...activeSpot.position);
          avatarGroupRef.current.rotation.y = THREE.MathUtils.degToRad(activeSpot.rotation);
          avatarGroupRef.current.visible = true;
        }
      }
    } else {
      avatarGroupRef.current.visible = false;
    }
  }, [isAvatarMode, avatarCurrentSpotId, spots, customAvatarObjectId]);

  // Update Active Avatar Halo position and visibility
  useEffect(() => {
    if (!activeAvatarHaloRef.current) return;
    if (customAvatarObjectId && isAvatarMode) {
      const activeObj = placedObjects.find((o) => o.id === customAvatarObjectId);
      if (activeObj) {
        activeAvatarHaloRef.current.position.set(
          activeObj.position[0],
          0.025,
          activeObj.position[2]
        );
        activeAvatarHaloRef.current.visible = true;
        return;
      }
    }
    activeAvatarHaloRef.current.visible = false;
  }, [customAvatarObjectId, isAvatarMode, placedObjects]);

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

    const floor = floorMeshRef.current;
    const cam = cameraRef.current;
    const container = mountRef.current;

    const onMove = (moveEvt: MouseEvent) => {
      if (!isDraggingSpotRef.current) return;
      if (floor && cam && container) {
        const rect = container.getBoundingClientRect();
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
          ((moveEvt.clientX - rect.left) / rect.width) * 2 - 1,
          -((moveEvt.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(mouse, cam);
        const hits = raycaster.intersectObject(floor, false);
        if (hits.length > 0) {
          const pt = hits[0].point;
          onUpdateSpotPositionRef.current(spotId, [
            parseFloat(pt.x.toFixed(2)),
            initialPos[1],
            parseFloat(pt.z.toFixed(2)),
          ]);
          return;
        }
      }

      // Fallback relative drag
      const dx = (moveEvt.clientX - startX) * 0.008;
      const dz = (moveEvt.clientY - startY) * 0.008;
      onUpdateSpotPositionRef.current(spotId, [
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
    const safeScale = Math.max(0.005, Math.min(100.0, parseFloat(scaleFactor.toFixed(3))));
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

  // One-click "Encaixar no Metro" button: matches object height to real-world target metric
  // Formula: escala = alvo / altura_atual_da_bbox (ex: 2.8 / 0.93 = x3.01)
  const handleFitToMetric = (targetHeightOverride?: number) => {
    if (selectedObj) {
      const dims = rawDimensionsState[selectedObj.id] || rawDimensionsMapRef.current.get(selectedObj.id);
      const rawH = Math.max(0.001, dims?.height || (selectedObj.name.toLowerCase().includes('sofa') ? 0.85 : 0.6));
      const targetH = targetHeightOverride !== undefined ? targetHeightOverride : (dims?.targetHeight || 2.80);
      const calculatedScale = Math.max(0.005, calculatePresetScale(rawH, targetH));

      onUpdateObjectTransform(selectedObj.id, {
        position: [selectedObj.position[0], 0.0, selectedObj.position[2]],
        rotation: selectedObj.rotation,
        scale: [calculatedScale, calculatedScale, calculatedScale],
      });
    } else if (customScenarioGroupRef.current) {
      const sceneDims = rawDimensionsState['__scene_room__'] || rawDimensionsMapRef.current.get('__scene_room__');
      const rawH = Math.max(0.001, sceneDims?.height || boundary.y || 2.80);
      const targetH = targetHeightOverride !== undefined ? targetHeightOverride : 2.80;
      const calculatedScale = Math.max(0.005, calculatePresetScale(rawH, targetH));
      customScenarioGroupRef.current.scale.set(calculatedScale, calculatedScale, calculatedScale);
    }
  };

  const handleApplyScaleFromModal = (newScale: number, preset?: MetricPresetItem) => {
    if (selectedObj) {
      onUpdateObjectTransform(selectedObj.id, {
        position: [selectedObj.position[0], 0.0, selectedObj.position[2]],
        rotation: selectedObj.rotation,
        scale: [newScale, newScale, newScale],
      });
    } else if (customScenarioGroupRef.current) {
      customScenarioGroupRef.current.scale.set(newScale, newScale, newScale);
    }
  };

  const handleApplyBoundaryFromModal = (newBoundary: PlayableBoundary) => {
    if (onUpdateBoundary) {
      onUpdateBoundary(newBoundary);
    }
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
      0.05,
      Math.min(300.0, cameraAngleRef.current.distance * factor)
    );
  };

  const handleResetCamera = () => {
    cameraAngleRef.current = { theta: 0.02, phi: 0.22, distance: 5.6 };
    cameraTargetRef.current.set(0.3, 0.7, -0.6);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#101115] font-sans">
      {/* 3D WebGL Canvas with Direct Drag-and-Drop Item Placement Support */}
      <div
        ref={mountRef}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const rawData = e.dataTransfer.getData('application/json');
          if (!rawData) return;
          try {
            const item: InventoryItem = JSON.parse(rawData);
            if (!item || !item.id) return;
            const container = mountRef.current;
            if (container && cameraRef.current && floorMeshRef.current) {
              const rect = container.getBoundingClientRect();
              const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
              );
              const raycaster = new THREE.Raycaster();
              raycaster.setFromCamera(mouse, cameraRef.current);
              const hits = raycaster.intersectObject(floorMeshRef.current, false);
              const coords: [number, number, number] = hits.length > 0
                ? [parseFloat(hits[0].point.x.toFixed(2)), 0.02, parseFloat(hits[0].point.z.toFixed(2))]
                : [0, 0.02, 0];
              onDropItemOnScene?.(item, coords);
            }
          } catch (err) {
            console.error('Failed to parse dropped item', err);
          }
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

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

          {/* Quick Metric Reference Toggles in Toolbar */}
          <button
            type="button"
            onClick={() => setShowReferenceAvatar((prev) => !prev)}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              showReferenceAvatar
                ? 'text-[#38bdf8] bg-[#38bdf8]/15 border border-[#38bdf8]/30'
                : 'text-[#e8d5b5]/40 hover:text-[#38bdf8]'
            }`}
            title={showReferenceAvatar ? 'Ocultar Avatar Fantasma 1,70m' : 'Exibir Avatar Fantasma 1,70m'}
          >
            <User className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden xl:inline">Avatar 1,70m</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMetricGrid((prev) => !prev)}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              showMetricGrid
                ? 'text-[#ffd700] bg-[#d4af37]/15 border border-[#d4af37]/30'
                : 'text-[#e8d5b5]/40 hover:text-[#ffd700]'
            }`}
            title={showMetricGrid ? 'Ocultar Grade no Chão (1m)' : 'Exibir Grade no Chão (1m)'}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden xl:inline">Grade Chão</span>
          </button>

          {/* Toggle Grade Espaço na Vertical (Paredes de fundo e lateral) */}
          <button
            type="button"
            onClick={() => setShowSpatialVerticalGrid((prev) => !prev)}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              showSpatialVerticalGrid
                ? 'text-sky-400 bg-sky-500/15 border border-sky-400/30'
                : 'text-[#e8d5b5]/40 hover:text-sky-400'
            }`}
            title={showSpatialVerticalGrid ? 'Ocultar Grades no Espaço na Vertical' : 'Exibir Grades no Espaço na Vertical'}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden xl:inline">Grade Vertical</span>
          </button>

          {/* Reset Camera button */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 text-[#e8d5b5]/70 hover:text-[#ffd700] hover:bg-[#d4af37]/15"
            title="Recentrar Câmera (Reset de órbita e deslocamento)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden 2xl:inline">Reset Câm</span>
          </button>

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
          {/* Open Size Selector Modal in Toolbar */}
          <button
            type="button"
            onClick={() => setIsSizeSelectorModalOpen(true)}
            className="p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 text-[#ffd700] bg-[#d4af37]/15 border border-[#d4af37]/30 hover:bg-[#d4af37]/30 shadow-sm"
            title="Abrir Seletor de Tamanho & Presets de Escala 1:1"
          >
            <Ruler className="w-3.5 h-3.5 text-[#ffd700]" />
            <span className="text-[10px] hidden xl:inline font-bold">Presets Métrica</span>
          </button>

          {/* Quick Remove Overlapping Spots button */}
          {onRemoveOverlappingSpots && (
            <button
              type="button"
              onClick={onRemoveOverlappingSpots}
              className="p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 text-[#ffd700] bg-[#1a1b22] border border-[#d4af37]/40 hover:bg-[#d4af37] hover:text-black shadow-sm"
              title="Remover spots sobrepostos na cena"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] hidden xl:inline font-semibold">Limpar Sobrepostos</span>
            </button>
          )}
        </div>
      )}

      {/* Visual Metric System Reference Badge (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-2.5 bg-[#121317]/90 border border-[#d4af37]/40 rounded-xl px-3 py-1.5 shadow-lg backdrop-blur-md text-[11px] text-[#e8d5b5]">
        <button
          type="button"
          onClick={() => setIsSizeSelectorModalOpen(true)}
          className="flex items-center gap-1.5 text-[#ffd700] hover:text-white font-bold cursor-pointer transition-colors bg-[#d4af37]/20 hover:bg-[#d4af37]/35 px-2 py-0.5 rounded-lg border border-[#d4af37]/50 pointer-events-auto"
          title="Clique para abrir o Seletor de Tamanho & Presets Métrica 1:1"
        >
          <Ruler className="w-3.5 h-3.5 text-[#ffd700]" />
          <span>📐 Seletor de Tamanho</span>
        </button>
        <div className="flex items-center gap-2 text-[11px] font-mono pointer-events-none">
          <span className="text-emerald-400">Chão Y=0</span>
          <span className="text-[#d4af37]/40">·</span>
          <span className="text-sky-300">Avatar = 1,70 m</span>
          <span className="text-[#d4af37]/40">·</span>
          <span className="text-amber-300">Grid = 1m × 1m</span>
          <span className="text-[#d4af37]/40">·</span>
          <span className="text-[#e8d5b5]/80">Room: {boundary.x}×{boundary.z}×{boundary.y}m</span>
          <span className="text-[#d4af37]/40">·</span>
          <span className="text-[#ffd700] font-sans font-medium">🖱️ Botão Dir: Pan</span>
          <span className="text-[#d4af37]/40">·</span>
          <span className="text-[#ffd700] font-sans font-medium">⌨️ Setas: Mover Cenário (↑ Frente · ↓ Trás · ← Lados · PgUp/PgDn Altura)</span>
        </div>
      </div>

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
                          ? 'scale-110 shadow-[0_0_12px_rgba(212,175,55,0.4)] ring-2 ring-[#ffd700]'
                          : ''
                      }`}
                    >
                      <MapPin className="w-4 h-4 fill-[#d4af37] stroke-black" />
                    </div>
                    <span className="mt-1 text-[11px] font-medium text-[#d4af37] tracking-wider select-none bg-black/60 px-1 rounded">
                      {spot.name || 'SPOT sentar'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="mb-1 text-[11px] font-medium text-[#d4af37] tracking-wider select-none bg-black/60 px-1 rounded">
                      {spot.name || 'SPOT em pé'}
                    </span>
                    <div
                      className={`w-28 h-12 rounded-[50%] border border-[#d4af37] bg-[#d4af37]/5 transition-all ${
                        isSelected
                          ? 'border-[#ffd700] ring-2 ring-[#ffd700]/70 bg-[#d4af37]/20 shadow-[0_0_15px_rgba(255,215,0,0.3)]'
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

      {/* FLOATING GIZMO & ADJUSTER OVER SELECTED SPOT */}
      {showSpots && !lockSpots && selectedSpot && spotGizmoScreenPos && !isAvatarMode && (
        <div
          style={{
            left: `${spotGizmoScreenPos.x}px`,
            top: `${spotGizmoScreenPos.y}px`,
          }}
          className="absolute transform -translate-x-1/2 -translate-y-full z-20 flex flex-col items-center pointer-events-auto animate-fade-in"
        >
          {/* Main Floating Spot Controller Box */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121317]/95 border border-[#d4af37] rounded-xl p-2.5 shadow-[0_6px_30px_rgba(0,0,0,0.9)] backdrop-blur-md flex flex-col gap-2 min-w-[280px] text-[#e8d5b5]"
          >
            {/* Header: Spot Name and Delete */}
            <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="font-bold text-[#ffd700] truncate max-w-[150px]">
                  {selectedSpot.name || `Spot (${selectedSpot.type})`}
                </span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-[#d4af37]/40 text-[#d4af37]">
                  {selectedSpot.type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveSpot(selectedSpot.id)}
                className="p-1 rounded text-red-400 hover:text-white hover:bg-red-900/80 transition-colors cursor-pointer"
                title="Excluir spot"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Spatial Height Indicator (Perto da seta Y do Gizmo) */}
            <div className="flex items-center justify-between bg-emerald-950/70 border border-emerald-500/50 rounded-lg px-2.5 py-1 text-[11px] font-mono text-emerald-300">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">↕️</span>
                <span className="text-[10px] text-emerald-400 uppercase font-bold">Altura do Solo:</span>
                <span className="text-[#ffd700] font-black text-xs">+{selectedSpot.position[1].toFixed(2)} m</span>
              </div>
              <span className="text-[10px] text-emerald-400/80">Solo = 0.00m</span>
            </div>

            {/* Mode Selector Buttons (Mover, Rodar, Elevar) */}
            <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-lg border border-[#d4af37]/20">
              <button
                type="button"
                onClick={() => onChangeGizmoMode('mover')}
                className={`py-1 rounded text-center text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeGizmoMode === 'mover'
                    ? 'bg-[#d4af37] text-black font-bold shadow'
                    : 'text-[#e8d5b5]/80 hover:text-white hover:bg-[#d4af37]/15'
                }`}
                title="Mover spot no chão X/Z"
              >
                <Move className="w-3 h-3" />
                <span>Mover</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeGizmoMode('rodar')}
                className={`py-1 rounded text-center text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeGizmoMode === 'rodar'
                    ? 'bg-[#d4af37] text-black font-bold shadow'
                    : 'text-[#e8d5b5]/80 hover:text-white hover:bg-[#d4af37]/15'
                }`}
                title="Rotacionar spot (eixo Y)"
              >
                <RotateCw className="w-3 h-3" />
                <span>Rodar</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeGizmoMode('elevar')}
                className={`py-1 rounded text-center text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeGizmoMode === 'elevar'
                    ? 'bg-[#d4af37] text-black font-bold shadow'
                    : 'text-[#e8d5b5]/80 hover:text-white hover:bg-[#d4af37]/15'
                }`}
                title="Elevar spot (eixo Y)"
              >
                <ArrowUp className="w-3 h-3" />
                <span>Elevar</span>
              </button>
            </div>

            {/* Sub-Panel: Coordinates & Fine Adjuster */}
            {activeGizmoMode === 'mover' && (
              <div className="space-y-1.5 pt-0.5">
                <div className="text-[10px] text-[#d4af37] font-semibold flex justify-between">
                  <span>Posição no Chão:</span>
                  <span className="font-mono text-white text-[10px]">
                    X: {selectedSpot.position[0].toFixed(2)}m · Z: {selectedSpot.position[2].toFixed(2)}m
                  </span>
                </div>
                {/* Steppers for X and Z */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded border border-[#d4af37]/20">
                    <span className="text-[9px] font-mono text-[#d4af37] font-bold">X</span>
                    <button
                      type="button"
                      onClick={() => handleStepSpotPos(0, -0.1)}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs font-bold text-[#ffd700] cursor-pointer"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-mono text-[10px] text-[#ffd700]">
                      {selectedSpot.position[0].toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStepSpotPos(0, 0.1)}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs font-bold text-[#ffd700] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded border border-[#d4af37]/20">
                    <span className="text-[9px] font-mono text-[#d4af37] font-bold">Z</span>
                    <button
                      type="button"
                      onClick={() => handleStepSpotPos(2, -0.1)}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs font-bold text-[#ffd700] cursor-pointer"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-mono text-[10px] text-[#ffd700]">
                      {selectedSpot.position[2].toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStepSpotPos(2, 0.1)}
                      className="w-5 h-5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs font-bold text-[#ffd700] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-[9px] text-[#e8d5b5]/60 text-center">
                  Use o Gizmo 3D vermelho/azul ou arraste o spot diretamente no cenário!
                </p>
              </div>
            )}

            {activeGizmoMode === 'elevar' && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[#d4af37]">Altura do Spot (Y):</span>
                  <span className="font-mono text-[#ffd700] text-xs font-bold bg-black/40 px-1.5 py-0.5 rounded border border-[#d4af37]/30">
                    {selectedSpot.position[1].toFixed(2)}m
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepSpotPos(1, -0.05)}
                    className="w-6 h-6 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs font-bold text-[#ffd700] cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.05"
                    value={selectedSpot.position[1]}
                    onChange={(e) => handleUpdateSpotPos(1, parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#20222a] rounded-lg appearance-none cursor-pointer accent-[#ffd700]"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepSpotPos(1, 0.05)}
                    className="w-6 h-6 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black flex items-center justify-center text-xs font-bold text-[#ffd700] cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {activeGizmoMode === 'rodar' && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[#d4af37]">Direção do Avatar:</span>
                  <span className="font-mono text-[#ffd700] text-xs font-bold bg-black/40 px-1.5 py-0.5 rounded border border-[#d4af37]/30">
                    {Math.round(((selectedSpot.rotation % 360) + 360) % 360)}°
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepSpotRot(-15)}
                    className="px-1.5 py-0.5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black text-[10px] font-semibold text-[#ffd700] cursor-pointer"
                  >
                    -15°
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={Math.round(((selectedSpot.rotation % 360) + 360) % 360)}
                    onChange={(e) => handleUpdateSpotRot(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#20222a] rounded-lg appearance-none cursor-pointer accent-[#ffd700]"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepSpotRot(15)}
                    className="px-1.5 py-0.5 rounded bg-[#1e2026] hover:bg-[#d4af37] hover:text-black text-[10px] font-semibold text-[#ffd700] cursor-pointer"
                  >
                    +15°
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {[0, 45, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => handleUpdateSpotRot(deg)}
                      className="py-0.5 rounded bg-[#181a20] hover:bg-[#d4af37] hover:text-black text-[9px] font-mono text-[#e8d5b5]/80 cursor-pointer"
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions Row */}
            <div className="flex items-center justify-between pt-1 border-t border-[#d4af37]/20 text-[10px]">
              {onRemoveOverlappingSpots && (
                <button
                  type="button"
                  onClick={onRemoveOverlappingSpots}
                  className="px-2 py-1 rounded bg-[#1a1b22] hover:bg-[#d4af37] hover:text-black text-[#d4af37] font-semibold border border-[#d4af37]/30 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3 text-amber-400" />
                  <span>Limpar sobrepostos</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemoveSpot(selectedSpot.id)}
                className="ml-auto px-2 py-1 rounded bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white font-semibold border border-red-500/60 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
                <span>Excluir spot</span>
              </button>
            </div>
          </div>

          <div className="w-[1px] h-3 border-l border-dashed border-[#d4af37]/70 my-0.5" />
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
              <span className="font-bold text-[#ffd700] truncate max-w-[130px]">
                {selectedObj.name}
              </span>
              <div className="flex items-center gap-1.5">
                {onSetCustomAvatarObjectId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (customAvatarObjectId === selectedObj.id) {
                        onSetCustomAvatarObjectId(null);
                      } else {
                        onSetCustomAvatarObjectId(selectedObj.id);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      customAvatarObjectId === selectedObj.id
                        ? 'bg-[#d4af37] text-black font-bold ring-1 ring-[#ffd700]'
                        : 'text-[#d4af37]/80 hover:text-white hover:bg-[#d4af37]/20 border border-[#d4af37]/40'
                    }`}
                    title={
                      customAvatarObjectId === selectedObj.id
                        ? 'Remover como avatar ativo'
                        : 'Definir este item como avatar do visitante'
                    }
                  >
                    <User className="w-3 h-3" />
                    <span>{customAvatarObjectId === selectedObj.id ? 'Avatar Ativo' : 'Tornar Avatar'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveObject(selectedObj.id)}
                  className="p-1 rounded text-red-400 hover:text-white hover:bg-red-900/80 transition-colors cursor-pointer"
                  title="Excluir objeto (Lixeira)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Spatial Height Indicator (Perto da seta Y do Gizmo) */}
            <div className="flex items-center justify-between bg-emerald-950/70 border border-emerald-500/50 rounded-lg px-2.5 py-1 text-[11px] font-mono text-emerald-300">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">↕️</span>
                <span className="text-[10px] text-emerald-400 uppercase font-bold">Altura do Solo:</span>
                <span className="text-[#ffd700] font-black text-xs">+{selectedObj.position[1].toFixed(2)} m</span>
              </div>
              <span className="text-[10px] text-emerald-400/80">Solo = 0.00m</span>
            </div>

            {/* Object Type Selector: Movel | Objeto | Avatar */}
            {onUpdateObjectType && (
              <div className="flex items-center justify-between border-t border-[#d4af37]/20 pt-1.5 text-[10px]">
                <span className="text-[9px] uppercase font-bold text-[#d4af37]/70">Tipo do Item:</span>
                <div className="flex items-center gap-1">
                  {(['movel', 'objeto', 'avatar'] as const).map((t) => {
                    const isActive =
                      (t === 'avatar' && (selectedObj.type === 'avatar' || selectedObj.isAvatar)) ||
                      (t !== 'avatar' && selectedObj.type === t && !selectedObj.isAvatar);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          onUpdateObjectType(selectedObj.id, t);
                          if (t === 'avatar') {
                            onSetCustomAvatarObjectId?.(selectedObj.id);
                          }
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                          isActive
                            ? t === 'avatar'
                              ? 'bg-[#ffd700] text-black font-bold shadow-sm ring-1 ring-[#ffd700]'
                              : 'bg-[#d4af37] text-black font-bold'
                            : 'bg-black/40 text-[#e8d5b5]/70 hover:text-white border border-[#d4af37]/30'
                        }`}
                      >
                        {t === 'avatar' ? '👤 Avatar' : t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DYNAMIC INTERACTIVE SLIDER BAR: Drag to increase/decrease smoothly! */}
            {activeGizmoMode === 'escalar' && (() => {
              const objDims = rawDimensionsState[selectedObj.id] ||
                rawDimensionsMapRef.current.get(selectedObj.id) || {
                  width: 1.4,
                  height: selectedObj.name.toLowerCase().includes('sofa') ? 0.85 : 0.60,
                  depth: 1.2,
                  targetHeight: selectedObj.name.toLowerCase().includes('sofa') ? 0.85 : 0.60,
                  label: selectedObj.name,
                  isRoom: selectedObj.name.toLowerCase().includes('cenario') ||
                          selectedObj.name.toLowerCase().includes('dormitorio') ||
                          selectedObj.name.toLowerCase().includes('quarto') ||
                          selectedObj.name.toLowerCase().includes('sala') ||
                          selectedObj.name.toLowerCase().includes('room'),
                };

              const currentRealH = objDims.height * selectedObj.scale[0];
              const currentRealW = objDims.width * selectedObj.scale[0];
              const isRoom = objDims.isRoom;
              const isCeilingMatched = Math.abs(currentRealH - 2.80) <= 0.15;

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-[#d4af37]">Escala no Mundo:</span>
                    <span className="font-mono text-[#ffd700] text-xs font-bold bg-black/40 px-1.5 py-0.5 rounded border border-[#d4af37]/30">
                      {selectedObj.scale[0].toFixed(2)}x
                    </span>
                  </div>

                  {/* Visual Live Feedback during scaling */}
                  <div className="text-center">
                    {isRoom ? (
                      isCeilingMatched ? (
                        <div className="text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/60 px-2 py-1 rounded text-[11px] flex items-center justify-center gap-1.5 shadow-sm">
                          <span>✓ teto = {currentRealH.toFixed(2)} m</span>
                          <span className="text-[9px] text-emerald-300 font-normal">(Escala Real 2,80 m)</span>
                        </div>
                      ) : (
                        <div className="text-red-400 font-bold bg-red-950/80 border border-red-500/60 px-2 py-1 rounded text-[11px] flex items-center justify-center gap-1.5 shadow-sm">
                          <span>teto agora = {currentRealH.toFixed(2)} m</span>
                          <span className="text-[#ffd700]">→ teto = 2.8 m</span>
                        </div>
                      )
                    ) : (
                      <div className="text-[#ffd700] font-semibold bg-black/50 border border-[#d4af37]/40 px-2 py-1 rounded text-[11px] flex items-center justify-between">
                        <span>Altura Real: {currentRealH.toFixed(2)} m</span>
                        <span className="text-[10px] text-[#e8d5b5]/70">L: {currentRealW.toFixed(2)}m (Avatar: 1,70m)</span>
                      </div>
                    )}
                  </div>

                  {/* Range Slider for Scale (Limitless range) */}
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
                      min="0.01"
                      max={Math.max(12, Math.ceil(selectedObj.scale[0] * 2))}
                      step="0.01"
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

                  {/* One-Click "Encaixar no Metro" & "Seletor de Tamanho" Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFitToMetric(objDims.targetHeight)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:from-[#e5c158] hover:to-[#ffd700] text-black font-extrabold text-[10px] flex items-center justify-center gap-1 shadow-md cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98]"
                      title={`Ajusta a escala para bater exatamente no metro real (${objDims.targetHeight.toFixed(2)}m)`}
                    >
                      <Ruler className="w-3 h-3" />
                      <span>Encaixar no Metro ({objDims.targetHeight.toFixed(2)}m)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSizeSelectorModalOpen(true)}
                      className="py-1.5 px-2.5 rounded-lg bg-[#1e2028] hover:bg-[#d4af37] text-[#ffd700] hover:text-black font-bold text-[10px] border border-[#d4af37]/50 flex items-center justify-center gap-1 shadow cursor-pointer transition-all whitespace-nowrap"
                      title="Abrir Seletor Completo com Todas as Categorias (Rooms, Mobília, Carros, Prédios, Estádios)"
                    >
                      <span>📐 Presets</span>
                    </button>
                  </div>

                  {/* Quick metric presets covering requested categories */}
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {[
                      { label: '🏠 2.8m', h: 2.8, t: 'Teto / Sala 2,80m' },
                      { label: '🚗 1.5m', h: 1.5, t: 'Carro 1,50m' },
                      { label: '🏢 20m', h: 20.0, t: 'Prédio 20m' },
                      { label: '⚽ 25m', h: 25.0, t: 'Estádio futebol 25m' },
                      { label: '🏭 7.0m', h: 7.0, t: 'Armazém 7m' },
                      { label: '🛋️ 0.85m', h: 0.85, t: 'Sofá 0,85m' },
                      { label: '💡 0.45m', h: 0.45, t: 'Abajur 0,45m' },
                      { label: '👤 1.7m', h: 1.7, t: 'Avatar 1,70m' },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleFitToMetric(p.h)}
                        title={p.t}
                        className="py-0.5 px-1 rounded bg-[#181a20] hover:bg-[#d4af37] hover:text-black text-[9px] font-mono text-[#e8d5b5]/90 border border-[#d4af37]/20 truncate"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

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

      {/* FLOATING HUD IN AVATAR MODE: Shows active controlled avatar */}
      {selectedObj && objectGizmoScreenPos && isAvatarMode && (
        <div
          style={{
            left: `${objectGizmoScreenPos.x}px`,
            top: `${objectGizmoScreenPos.y}px`,
          }}
          className="absolute transform -translate-x-1/2 -translate-y-full z-20 flex flex-col items-center pointer-events-auto animate-fade-in"
        >
          <div className="bg-[#121317]/95 border-2 border-[#ffd700] rounded-xl px-3.5 py-1.5 shadow-[0_0_20px_rgba(255,215,0,0.45)] backdrop-blur-md flex items-center gap-2.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffd700] animate-ping" />
            <span className="text-xs font-bold text-[#ffd700]">
              {customAvatarObjectId === selectedObj.id
                ? `⭐ Controlando: ${selectedObj.name}`
                : `Item: ${selectedObj.name}`}
            </span>
            {customAvatarObjectId !== selectedObj.id && (
              <button
                type="button"
                onClick={() => onSetCustomAvatarObjectId?.(selectedObj.id)}
                className="px-2 py-0.5 rounded bg-[#ffd700] text-black text-[10px] font-extrabold uppercase cursor-pointer hover:bg-amber-300 transition-colors"
              >
                Controlar
              </button>
            )}
            <span className="text-[10px] text-[#e8d5b5]/80 hidden sm:inline">
              · Clique nos spots para mover
            </span>
          </div>
          <div className="w-[1px] h-3 border-l border-dashed border-[#ffd700] my-0.5" />
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

              {/* Column 3: Escala no Mundo Real (Metros & Encaixar no Metro) */}
              <div className="p-2 rounded-lg bg-black/40 border border-[#d4af37]/20 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#d4af37] tracking-wider block">
                      Escala (Multiplicador)
                    </span>
                    {selectedObj && (() => {
                      const dims = rawDimensionsState[selectedObj.id] ||
                        rawDimensionsMapRef.current.get(selectedObj.id) || {
                          width: 1.4,
                          height: selectedObj.name.toLowerCase().includes('sofa') ? 0.85 : 0.6,
                          depth: 1.2,
                          targetHeight: selectedObj.name.toLowerCase().includes('sofa') ? 0.85 : 0.6,
                          label: selectedObj.name,
                          isRoom: false,
                        };
                      const curH = dims.height * selectedObj.scale[0];
                      return (
                        <span className="text-[10px] font-mono font-bold text-[#ffd700]">
                          Alt: {curH.toFixed(2)}m
                        </span>
                      );
                    })()}
                  </div>

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
                        min={0.01}
                        max={100}
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

                {selectedObj && (() => {
                  const dims = rawDimensionsState[selectedObj.id] ||
                    rawDimensionsMapRef.current.get(selectedObj.id) || {
                      width: 1.4,
                      height: selectedObj.name.toLowerCase().includes('sofa') ? 0.85 : 0.6,
                      depth: 1.2,
                      targetHeight: selectedObj.name.toLowerCase().includes('sofa') ? 0.85 : 0.6,
                      label: selectedObj.name,
                      isRoom: selectedObj.name.toLowerCase().includes('cenario') ||
                              selectedObj.name.toLowerCase().includes('dormitorio') ||
                              selectedObj.name.toLowerCase().includes('quarto') ||
                              selectedObj.name.toLowerCase().includes('sala'),
                    };
                  const curH = dims.height * selectedObj.scale[0];
                  const curW = dims.width * selectedObj.scale[0];
                  const curD = dims.depth * selectedObj.scale[0];
                  const isCeilingOk = Math.abs(curH - 2.80) <= 0.15;

                  return (
                    <div className="space-y-1.5 pt-1">
                      {/* Metric Dimensions Real-World Readout */}
                      <div className="p-1 rounded bg-[#14151a] border border-[#d4af37]/30 text-[9px] font-mono flex items-center justify-between text-[#e8d5b5]">
                        <span className="text-[#ffd700] font-semibold">Real:</span>
                        <span>{curW.toFixed(2)}m (L) × {curH.toFixed(2)}m (A) × {curD.toFixed(2)}m (P)</span>
                      </div>

                      {/* Status feedback */}
                      {dims.isRoom ? (
                        <div
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold text-center ${
                            isCeilingOk
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                              : 'bg-red-950/80 text-red-300 border border-red-500/50'
                          }`}
                        >
                          {isCeilingOk ? `✓ Teto Room = ${curH.toFixed(2)}m (2,80m)` : `Teto agora = ${curH.toFixed(2)}m → ideal 2,80m`}
                        </div>
                      ) : (
                        <div className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-center bg-[#181a20] text-[#e8d5b5]/80 border border-[#d4af37]/20">
                          Comparado com Avatar: 1,70 m
                        </div>
                      )}

                      {/* "Encaixar no Metro" & "Seletor de Tamanho" Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFitToMetric(dims.targetHeight)}
                          className="flex-1 py-1 px-2 rounded bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-black font-bold text-[10px] flex items-center justify-center gap-1 hover:brightness-110 cursor-pointer shadow"
                        >
                          <Ruler className="w-3 h-3" />
                          <span>Encaixar ({dims.targetHeight.toFixed(2)}m)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsSizeSelectorModalOpen(true)}
                          className="py-1 px-2 rounded bg-[#1c1e26] hover:bg-[#d4af37] text-[#ffd700] hover:text-black font-bold text-[10px] border border-[#d4af37]/40 flex items-center justify-center gap-1 shadow cursor-pointer transition-all whitespace-nowrap"
                          title="Abrir Seletor Completo com Todas as Categorias"
                        >
                          <span>📐 Seletor Completo</span>
                        </button>
                      </div>

                      {/* Expanded Target presets (Rooms, Veículos, Macro, Mobília, Avatar) */}
                      <div className="grid grid-cols-4 gap-1 pt-0.5">
                        {[
                          { l: 'Teto 2.8', h: 2.8, t: 'Teto / Sala 2,80m' },
                          { l: 'Mansão 5m', h: 5.0, t: 'Mansão / Hall 5,00m' },
                          { l: 'Carro 1.5', h: 1.5, t: 'Carro 1,50m' },
                          { l: 'Prédio 20', h: 20.0, t: 'Prédio 20,00m' },
                          { l: 'Armazém 7', h: 7.0, t: 'Armazém 7,00m' },
                          { l: 'Estádio 25', h: 25.0, t: 'Estádio futebol 25m' },
                          { l: 'Sofá 0.85', h: 0.85, t: 'Sofá 0,85m' },
                          { l: 'Avatar 1.7', h: 1.7, t: 'Avatar adulto 1,70m' },
                        ].map((btn) => (
                          <button
                            key={btn.l}
                            type="button"
                            onClick={() => handleFitToMetric(btn.h)}
                            title={btn.t}
                            className="py-0.5 px-1 rounded bg-[#16181f] hover:bg-[#d4af37] hover:text-black text-[9px] font-mono text-[#e8d5b5]/90 border border-[#d4af37]/20 truncate"
                          >
                            {btn.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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

      {/* Metric Size Selector Modal (Interactive 1:1 Size & Category Preset Chooser) */}
      {isSizeSelectorModalOpen && (
        <MetricSizeSelectorModal
          isOpen={isSizeSelectorModalOpen}
          onClose={() => setIsSizeSelectorModalOpen(false)}
          targetName={
            selectedObj
              ? selectedObj.name
              : sceneAssetBlobUrl
              ? 'Cenário da Sala (Room)'
              : 'Sala / Limite Jogável'
          }
          rawHeight={
            selectedObj
              ? (rawDimensionsState[selectedObj.id]?.height ||
                 rawDimensionsMapRef.current.get(selectedObj.id)?.height ||
                 (selectedObj.name.toLowerCase().includes('sofa') ? 0.85 : 0.60))
              : (rawDimensionsState['__scene_room__']?.height || boundary.y || 2.80)
          }
          rawWidth={
            selectedObj
              ? (rawDimensionsState[selectedObj.id]?.width ||
                 rawDimensionsMapRef.current.get(selectedObj.id)?.width || 1.0)
              : (rawDimensionsState['__scene_room__']?.width || boundary.x || 6.0)
          }
          rawDepth={
            selectedObj
              ? (rawDimensionsState[selectedObj.id]?.depth ||
                 rawDimensionsMapRef.current.get(selectedObj.id)?.depth || 1.0)
              : (rawDimensionsState['__scene_room__']?.depth || boundary.z || 8.0)
          }
          currentScale={selectedObj ? selectedObj.scale[0] : 1.0}
          onApplyScale={handleApplyScaleFromModal}
          onApplyBoundary={handleApplyBoundaryFromModal}
          currentBoundary={boundary}
        />
      )}
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

// Helper to create sharp canvas text sprites for 3D metrics
function createMetricTextSprite(text: string, bgColor = '#121317', textColor = '#ffd700'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Background pill
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(4, 4, 248, 56, 12);
  } else {
    ctx.rect(4, 4, 248, 56);
  }
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.65, 0.16, 1);
  return sprite;
}

// 1. Metric Grid (1m x 1m cells) and Marked Coordinate Axes with 1m increments
function createMetricGridAndAxes(): { group: THREE.Group; labelsGroup: THREE.Group } {
  const group = new THREE.Group();
  const labelsGroup = new THREE.Group();
  labelsGroup.name = 'floorMeterLabelsGroup';

  // 1m x 1m Grid
  const gridHelper = new THREE.GridHelper(30, 30, 0xd4af37, 0x2e323b);
  gridHelper.position.y = 0.002; // Floor is strictly at Y = 0
  group.add(gridHelper);

  // Marked X-axis (Red, with tick markers every 1 meter)
  const xLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-14, 0.004, 0),
    new THREE.Vector3(14, 0.004, 0),
  ]);
  const xLineMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
  const xLine = new THREE.Line(xLineGeo, xLineMat);
  group.add(xLine);

  // Marked Z-axis (Blue, with tick markers every 1 meter)
  const zLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.004, -14),
    new THREE.Vector3(0, 0.004, 14),
  ]);
  const zLineMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
  const zLine = new THREE.Line(zLineGeo, zLineMat);
  group.add(zLine);

  // Tick marks and numeric labels at every 1m along X and Z
  const tickMat = new THREE.LineBasicMaterial({ color: 0xd4af37 });
  for (let m = -8; m <= 8; m++) {
    if (m === 0) continue;

    // Tick across X
    const xTickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(m, 0.005, -0.12),
      new THREE.Vector3(m, 0.005, 0.12),
    ]);
    group.add(new THREE.Line(xTickGeo, tickMat));

    // Tick across Z
    const zTickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.12, 0.005, m),
      new THREE.Vector3(0.12, 0.005, m),
    ]);
    group.add(new THREE.Line(zTickGeo, tickMat));

    // Numeric badge every 2 meters for readability (put in labelsGroup so user can hide)
    if (Math.abs(m) % 2 === 0) {
      const xBadge = createMetricTextSprite(`${m}m`, 'rgba(18,19,23,0.85)', '#ffd700');
      xBadge.position.set(m, 0.06, 0.28);
      labelsGroup.add(xBadge);

      const zBadge = createMetricTextSprite(`${m}m`, 'rgba(18,19,23,0.85)', '#93c5fd');
      zBadge.position.set(0.28, 0.06, m);
      labelsGroup.add(zBadge);
    }
  }

  // Origin indicator (0, 0)
  const originBadge = createMetricTextSprite('0,0 (Chão Y=0)', '#101115', '#4ade80');
  originBadge.position.set(0, 0.1, 0);
  labelsGroup.add(originBadge);

  group.add(labelsGroup);

  return { group, labelsGroup };
}

// 2. Room Limit Box: 6m x 8m x 2.8m (Height 2.8m, Ground at Y = 0)
function createRoomBoundaryBox(boundary: PlayableBoundary): THREE.Group {
  const group = new THREE.Group();
  const bx = boundary.x || 6.0;
  const by = boundary.y || 2.8; // Ceiling 2.80m
  const bz = boundary.z || 8.0;

  // Position offset (user can move boundary box anywhere in 3D scene)
  const px = boundary.position?.[0] || 0;
  const py = boundary.position?.[1] || 0;
  const pz = boundary.position?.[2] || 0;
  group.position.set(px, py, pz);

  const halfX = bx / 2;
  const halfZ = bz / 2;

  const frameMat = new THREE.LineBasicMaterial({
    color: 0xd4af37,
    transparent: true,
    opacity: 0.75,
  });

  // Ground perimeter loop (Y = 0.005)
  const floorLoopGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-halfX, 0.005, -halfZ),
    new THREE.Vector3(halfX, 0.005, -halfZ),
    new THREE.Vector3(halfX, 0.005, halfZ),
    new THREE.Vector3(-halfX, 0.005, halfZ),
    new THREE.Vector3(-halfX, 0.005, -halfZ),
  ]);
  group.add(new THREE.Line(floorLoopGeo, frameMat));

  // Ceiling perimeter loop (Y = by = 2.80m)
  const ceilLoopGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-halfX, by, -halfZ),
    new THREE.Vector3(halfX, by, -halfZ),
    new THREE.Vector3(halfX, by, halfZ),
    new THREE.Vector3(-halfX, by, halfZ),
    new THREE.Vector3(-halfX, by, -halfZ),
  ]);
  group.add(new THREE.Line(ceilLoopGeo, frameMat));

  // 4 Corner Vertical Pillars (Y: 0 -> by)
  const corners = [
    [-halfX, -halfZ],
    [halfX, -halfZ],
    [halfX, halfZ],
    [-halfX, halfZ],
  ];

  corners.forEach(([cx, cz]) => {
    const colGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cx, 0, cz),
      new THREE.Vector3(cx, by, cz),
    ]);
    group.add(new THREE.Line(colGeo, frameMat));

    // Corner ceiling cap
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xd4af37 })
    );
    cap.position.set(cx, by, cz);
    group.add(cap);
  });

  // Ceiling Height Label
  const ceilBadge = createMetricTextSprite(
    `Limite Room: ${bx.toFixed(1)}×${bz.toFixed(1)}×${by.toFixed(2)}m`,
    '#121317',
    '#ffd700'
  );
  ceilBadge.position.set(0, by + 0.12, -halfZ);
  group.add(ceilBadge);

  return group;
}

// 2b. Spatial Vertical Grid (Grades no espaço na vertical - paredes de fundo e lateral ou ponto fixado)
function createSpatialVerticalGrid(
  boundary: PlayableBoundary,
  originPoint?: [number, number, number] | null
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'spatialVerticalGrid';

  if (originPoint) {
    group.position.set(originPoint[0], originPoint[1], originPoint[2]);
  } else {
    const px = boundary.position?.[0] || 0;
    const py = boundary.position?.[1] || 0;
    const pz = boundary.position?.[2] || 0;
    group.position.set(px, py, pz);
  }

  const bx = boundary.x || 6.0;
  const by = boundary.y || 2.8;
  const bz = boundary.z || 8.0;
  const halfX = bx / 2;
  const halfZ = bz / 2;

  const subtleGridMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
  });

  const meterGridMat = new THREE.LineBasicMaterial({
    color: 0xd4af37,
    transparent: true,
    opacity: 0.55,
  });

  // 1. Back Wall Vertical Grid (at Z = -halfZ)
  for (let y = 0.5; y <= by + 0.05; y += 0.5) {
    const isMeter = Math.abs(Math.round(y) - y) < 0.05;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfX, y, -halfZ),
      new THREE.Vector3(halfX, y, -halfZ),
    ]);
    group.add(new THREE.Line(geo, isMeter ? meterGridMat : subtleGridMat));

    if (isMeter && y <= by) {
      const sprite = createMetricTextSprite(`+${y.toFixed(1)}m`, 'rgba(15,23,42,0.85)', '#38bdf8');
      sprite.position.set(-halfX + 0.35, y, -halfZ + 0.02);
      group.add(sprite);
    }
  }

  for (let x = -Math.floor(halfX); x <= Math.floor(halfX); x += 1) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.005, -halfZ),
      new THREE.Vector3(x, by, -halfZ),
    ]);
    group.add(new THREE.Line(geo, x === 0 ? meterGridMat : subtleGridMat));
  }

  // 2. Left Wall Vertical Grid (at X = -halfX)
  for (let y = 0.5; y <= by + 0.05; y += 0.5) {
    const isMeter = Math.abs(Math.round(y) - y) < 0.05;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfX, y, -halfZ),
      new THREE.Vector3(-halfX, y, halfZ),
    ]);
    group.add(new THREE.Line(geo, isMeter ? meterGridMat : subtleGridMat));
  }

  for (let z = -Math.floor(halfZ); z <= Math.floor(halfZ); z += 1) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfX, 0.005, z),
      new THREE.Vector3(-halfX, by, z),
    ]);
    group.add(new THREE.Line(geo, z === 0 ? meterGridMat : subtleGridMat));
  }

  return group;
}

// 3. Ghost Reference Avatar (1.70m) standing in the corner with Measuring Tape (Fita Métrica)
function createReferenceGhostAvatar(): THREE.Group {
  const group = new THREE.Group();
  (group as any).userData = { isReferenceAvatar: true };

  // Corner placement inside the 6x8m boundary: [-2.6, 0, -3.5]
  group.position.set(-2.6, 0, -3.5);

  // Frosted architectural glass shader/material
  const ghostMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.72,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.2,
    metalness: 0.8,
    transparent: true,
    opacity: 0.9,
  });

  // Anatomically proportioned 1.70m humanoid:
  // Feet: Y = 0 to 0.08
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.24), ghostMat);
  leftFoot.position.set(-0.12, 0.04, 0.02);
  group.add(leftFoot);

  const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.24), ghostMat);
  rightFoot.position.set(0.12, 0.04, 0.02);
  group.add(rightFoot);

  // Legs: Y = 0.08 to 0.86 (height = 0.78m)
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.78, 16), ghostMat);
  leftLeg.position.set(-0.12, 0.47, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.78, 16), ghostMat);
  rightLeg.position.set(0.12, 0.47, 0);
  group.add(rightLeg);

  // Pelvis / Waist: Y = 0.86 to 0.96
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.2), ghostMat);
  waist.position.set(0, 0.91, 0);
  group.add(waist);

  // Torso: Y = 0.96 to 1.48 (height = 0.52m)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.52, 16), ghostMat);
  torso.position.set(0, 1.22, 0);
  group.add(torso);

  // Arms: shoulder at 1.44m down to hand at 0.88m
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.56, 12), ghostMat);
  leftArm.position.set(-0.25, 1.16, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.56, 12), ghostMat);
  rightArm.position.set(0.25, 1.16, 0);
  group.add(rightArm);

  // Neck: Y = 1.48 to 1.52
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.06, 12), ghostMat);
  neck.position.set(0, 1.51, 0);
  group.add(neck);

  // Head: Y = 1.52 to 1.70 (center at 1.61, radius 0.09 -> top is EXACTLY at 1.70m!)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), ghostMat);
  head.position.set(0, 1.61, 0);
  group.add(head);

  // Golden halo / reference cap at 1.70m
  const crownRing = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.11, 24), accentMat);
  crownRing.position.set(0, 1.702, 0);
  crownRing.rotation.x = -Math.PI / 2;
  group.add(crownRing);

  // MEASURING TAPE POLE (Fita Métrica) standing immediately beside the avatar (at x = 0.38)
  const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.95, 16);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(0.38, 0.975, 0);
  group.add(pole);

  // Metric tick bars and labels
  const metricTicks = [
    { y: 0.50, label: '0,50m (Cama)' },
    { y: 0.85, label: '0,85m (Sofá/Mesa)' },
    { y: 1.00, label: '1,00m' },
    { y: 1.50, label: '1,50m' },
    { y: 1.70, label: '1,70m (Avatar)' },
  ];

  metricTicks.forEach(({ y, label }) => {
    // Horizontal tick arm pointing towards avatar
    const tickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.24, y, 0),
      new THREE.Vector3(0.48, y, 0),
    ]);
    const tickLine = new THREE.Line(tickGeo, new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 2 }));
    group.add(tickLine);

    // Label sprite
    const tickSprite = createMetricTextSprite(label, 'rgba(15,16,20,0.9)', y === 1.70 ? '#ffd700' : '#e2e8f0');
    tickSprite.position.set(0.74, y, 0);
    group.add(tickSprite);
  });

  // Top Avatar Billboard Badge
  const avatarBanner = createMetricTextSprite('👤 Avatar Padrão: 1,70 m', '#121317', '#38bdf8');
  avatarBanner.position.set(0, 1.88, 0);
  group.add(avatarBanner);

  return group;
}

// 4. Visitor avatar mesh (Human proportion: 1.70 m from feet to top of head)
function createSimpleAvatarMesh(): THREE.Group {
  const group = new THREE.Group();
  const clothingMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89d7c, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.7 });

  // Shoes: Y: 0 to 0.08
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), shoeMat);
  lShoe.position.set(-0.13, 0.04, 0.02);
  group.add(lShoe);
  const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), shoeMat);
  rShoe.position.set(0.13, 0.04, 0.02);
  group.add(rShoe);

  // Legs: Y: 0.08 to 0.86 (height 0.78)
  const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.78, 16), pantsMat);
  lLeg.position.set(-0.13, 0.47, 0);
  lLeg.castShadow = true;
  group.add(lLeg);
  const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.78, 16), pantsMat);
  rLeg.position.set(0.13, 0.47, 0);
  rLeg.castShadow = true;
  group.add(rLeg);

  // Torso / Hoodie: Y: 0.86 to 1.48 (height 0.62)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.17, 0.62, 16), clothingMat);
  torso.position.set(0, 1.17, 0);
  torso.castShadow = true;
  group.add(torso);

  // Arms: Y: 0.90 to 1.44
  const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.54, 12), clothingMat);
  lArm.position.set(-0.28, 1.17, 0);
  group.add(lArm);
  const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.54, 12), clothingMat);
  rArm.position.set(0.28, 1.17, 0);
  group.add(rArm);

  // Head: Y: 1.50 to 1.70 (center at 1.60, radius 0.10 -> top at 1.70m!)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.10, 16, 16), skinMat);
  head.position.set(0, 1.60, 0);
  head.castShadow = true;
  group.add(head);

  return group;
}

// 5. Metric Auto-Scaling Rules on Import & Encaixar no Metro
function calculateMetricScale(
  rawSize: THREE.Vector3,
  type?: string,
  name?: string
): { scale: number; targetHeight: number; label: string; isRoom: boolean } {
  const rawHeight = Math.max(0.001, rawSize.y);
  const rawWidth = Math.max(0.001, rawSize.x);
  const rawDepth = Math.max(0.001, rawSize.z);
  const lowerName = (name || '').toLowerCase();

  // 1. Veículos & Macro Estruturas
  if (lowerName.includes('estadio') || lowerName.includes('stadium') || lowerName.includes('futebol')) {
    const targetHeight = 25.00;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Estádio de Futebol (25,00 m)',
      isRoom: true,
    };
  }
  if (lowerName.includes('predio') || lowerName.includes('edificio') || lowerName.includes('building') || lowerName.includes('torre') || lowerName.includes('skyscraper')) {
    const targetHeight = 20.00;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Prédio / Edifício (20,00 m)',
      isRoom: true,
    };
  }
  if (lowerName.includes('armazem') || lowerName.includes('galpao') || lowerName.includes('warehouse') || lowerName.includes('deposito')) {
    const targetHeight = 7.00;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Armazém / Galpão (7,00 m)',
      isRoom: true,
    };
  }
  if (lowerName.includes('carro') || lowerName.includes('car') || lowerName.includes('automovel') || lowerName.includes('veiculo') || lowerName.includes('auto')) {
    const targetHeight = 1.50;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Carro (1,50 m)',
      isRoom: false,
    };
  }

  // 2. Casas & Rooms (Encaixe pelo Teto)
  if (lowerName.includes('sobrado')) {
    const targetHeight = 5.60;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Casa Sobrado 2 Pisos (5,60 m)',
      isRoom: true,
    };
  }
  if (lowerName.includes('mansao') || lowerName.includes('hall') || lowerName.includes('castelo') || lowerName.includes('palacio')) {
    const targetHeight = 5.00;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Mansão / Hall (5,00 m)',
      isRoom: true,
    };
  }
  if (lowerName.includes('corredor')) {
    const targetHeight = 2.50;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Corredor (2,50 m)',
      isRoom: true,
    };
  }
  if (
    type === 'Sala' ||
    lowerName.includes('cenario') ||
    lowerName.includes('sala') ||
    lowerName.includes('dormitorio') ||
    lowerName.includes('quarto') ||
    lowerName.includes('loft') ||
    lowerName.includes('room') ||
    lowerName.includes('house') ||
    lowerName.includes('casa') ||
    lowerName.includes('apartamento') ||
    (rawWidth > 2.8 && rawDepth > 2.8)
  ) {
    const targetHeight = 2.80; // teto ~2.80 m
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Teto Room / Casa (2,80 m)',
      isRoom: true,
    };
  }

  // 3. Avatar e Roupas / Acessórios
  if (
    type === 'Avatar' ||
    lowerName.includes('avatar') ||
    lowerName.includes('elfa') ||
    lowerName.includes('personagem') ||
    lowerName.includes('boneco') ||
    lowerName.includes('humano')
  ) {
    const targetHeight = 1.70; // avatar padrão = 1.70 m
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Avatar Humano (1,70 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('chapeu') || lowerName.includes('bone') || lowerName.includes('hat') || lowerName.includes('coroa')) {
    const targetHeight = 0.15;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Chapéu / Boné (0,15 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('oculos') || lowerName.includes('glasses')) {
    const targetHeight = 0.04;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Óculos (0,04 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('camisa') || lowerName.includes('jaqueta') || lowerName.includes('shirt') || lowerName.includes('blusa')) {
    const targetHeight = 0.70;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Camisa / Jaqueta (~0,70 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('calca') || lowerName.includes('pants')) {
    const targetHeight = 1.00;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Calça (~1,00 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('sapato') || lowerName.includes('tenis') || lowerName.includes('shoe')) {
    const targetHeight = 0.12;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Sapato (0,12 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('colar') || lowerName.includes('necklace')) {
    const targetHeight = 0.40;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Colar (0,40 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('anel') || lowerName.includes('ring')) {
    const targetHeight = 0.02;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Anel (0,02 m)',
      isRoom: false,
    };
  }

  // 4. Luz / Decoração
  if (lowerName.includes('abajur') || lowerName.includes('lamp')) {
    const isChao = lowerName.includes('chao') || lowerName.includes('floor');
    const targetHeight = isChao ? 1.50 : 0.45;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: isChao ? 'Abajur de Chão (1,50 m)' : 'Abajur de Mesa (0,45 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('pendente') || lowerName.includes('lustre') || lowerName.includes('chandelier')) {
    const targetHeight = 0.40;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Luminária Pendente (0,40 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('vela') || lowerName.includes('copo') || lowerName.includes('candle')) {
    const targetHeight = 0.12;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Vela / Copo (0,12 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('quadro') || lowerName.includes('pintura') || lowerName.includes('painting')) {
    const targetHeight = 0.70;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Quadro (0,70 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('tapete') || lowerName.includes('rug') || lowerName.includes('carpet')) {
    const targetHeight = 0.02;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Tapete (0,02 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('planta') || lowerName.includes('vaso') || lowerName.includes('plant')) {
    const targetHeight = 1.20;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Planta em Vaso (1,20 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('tv') || lowerName.includes('televisao') || lowerName.includes('monitor')) {
    const targetHeight = 0.70;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'TV 55" (0,70 m)',
      isRoom: false,
    };
  }

  // 5. Mobília
  if (lowerName.includes('puff') || lowerName.includes('pufe')) {
    const targetHeight = 0.35;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Puff (0,35 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('sofa') || lowerName.includes('couch') || lowerName.includes('poltrona')) {
    const targetHeight = 0.85; // sofá encosto ~0.85m, assento ~0.43m
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Sofá (~0,85 m / assento ~0.43 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('cama') || lowerName.includes('bed') || lowerName.includes('colchao') || lowerName.includes('beliche')) {
    const targetHeight = 0.60; // cama ~0.50-0.60 m
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Cama / Colchão (~0,60 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('guarda-roupa') || lowerName.includes('armario') || lowerName.includes('wardrobe')) {
    const targetHeight = 2.10;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Guarda-Roupa (2,10 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('estante') || lowerName.includes('prateleira') || lowerName.includes('bookshelf')) {
    const targetHeight = 1.80;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Estante (1,80 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('porta') || lowerName.includes('door')) {
    const targetHeight = 2.10;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Porta (2,10 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('janela') || lowerName.includes('window')) {
    const targetHeight = 1.00;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Janela Peitoril (1,00 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('bancada') || lowerName.includes('balcao') || lowerName.includes('counter')) {
    const targetHeight = 0.90;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Bancada / Balcão (0,90 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('mesa de centro') || lowerName.includes('coffee table')) {
    const targetHeight = 0.40;
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Mesa de Centro (0,40 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('mesa') || lowerName.includes('table') || lowerName.includes('desk')) {
    const targetHeight = 0.75; // mesa ~0.75 m
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Mesa (~0,75 m)',
      isRoom: false,
    };
  }
  if (lowerName.includes('cadeira') || lowerName.includes('chair') || lowerName.includes('banqueta') || lowerName.includes('stool')) {
    const targetHeight = 0.85; // cadeira ~0.85 m
    return {
      scale: calculatePresetScale(rawHeight, targetHeight),
      targetHeight,
      label: 'Cadeira (~0,85 m)',
      isRoom: false,
    };
  }

  // 6. Móvel / Objeto Padrão
  const targetHeight = 0.85;
  return {
    scale: calculatePresetScale(rawHeight, targetHeight),
    targetHeight,
    label: 'Móvel Padrão (~0,85 m)',
    isRoom: false,
  };
}
