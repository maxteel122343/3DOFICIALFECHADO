// Creator Mode Types
export type GizmoEditMode = 'elevar' | 'mover' | 'rodar' | 'escalar';

export type SpotType = 'pe' | 'sentar' | 'deitar';

export interface SpotItem {
  id: string;
  name: string;
  type: SpotType;
  position: [number, number, number];
  rotation: number;
}

export interface PlacedObject {
  id: string;
  assetId: string;
  name: string;
  type: 'cenario' | 'movel' | 'objeto' | 'avatar';
  isAvatar?: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color?: string;
  modelType?: 'sofa' | 'table' | 'chair' | 'plant' | 'house' | 'custom_glb' | 'avatar';
  fileBlobUrl?: string;
  rawDimensions?: [number, number, number];
}

export interface InventoryItem {
  id: string;
  fileName: string;
  displayName: string;
  thumbUrl: string;
  type: 'Sala' | 'Avatar' | 'Item';
  createdAt: string;
  isScenario?: boolean;
  fileBlobUrl?: string;
  modelType?: 'sofa' | 'table' | 'chair' | 'plant' | 'house' | 'custom_glb';
  rawDimensions?: [number, number, number];
}

export interface PlayableBoundary {
  x: number; // width in meters (e.g. 5.0)
  y: number; // height in meters (e.g. 2.8)
  z: number; // depth in meters (e.g. 6.5)
  position?: [number, number, number]; // [posX, posY, posZ] offset in meters
  isConfirmed: boolean;
}

export interface RoomEditorState {
  id: string;
  name: string;
  sceneAssetId: string | null;
  sceneAssetBlobUrl?: string;
  placedObjects: PlacedObject[];
  spots: SpotItem[];
  boundary: PlayableBoundary;
  isPublished: boolean;
  publishedAt?: string;
}

export interface CreatorUser {
  id: string;
  email: string;
  displayName: string;
  isGuest: boolean;
}

// Legacy / Social Types for backward compatibility
export type GizmoMode = 'scale' | 'sizeY' | 'angle';

export interface AvatarTransform {
  scale: number;
  sizeY: number;
  angle: number;
}

export interface AvatarPose {
  id: string;
  name: string;
  label?: string;
  fileName?: string;
  thumbnailUrl?: string;
  description?: string;
  badgeEmoji?: string;
  emoji?: string;
  glbKey?: string;
  heightOffset?: number;
  rotationOffset?: number;
  silhouette?: string;
}

export interface Spot {
  id: number;
  name?: string;
  label?: string;
  position: [number, number, number];
  rotation: number;
  occupiedBy?: string;
  occupiedByName?: string;
  occupiedAvatar?: string;
  avatarColor?: string;
  isPlayer?: boolean;
}

export interface RoomData {
  id: string;
  name: string;
  previewUrl?: string;
  occupancy?: string;
  occupation?: string;
  currentUsers?: number;
  maxUsers?: number;
  theme?: string;
  description: string;
  badge?: string;
  thumb?: string;
  isFeatured?: boolean;
  ambientColor?: string;
  isCenterHighlighted?: boolean;
  editorRoomId?: string;
  isFromEditor?: boolean;
  editorRoom?: RoomEditorState;
  isPlaytest?: boolean;
}

export interface ChatMessage {
  id: string;
  user: string;
  avatarUrl: string;
  text: string;
  time: string;
  spotId: number;
  isPlayer?: boolean;
}

export interface SpeechBubbleItem {
  id: string;
  text: string;
  spotId: number;
  userName: string;
  createdAt: number;
}

export type ProductType = 'sala' | 'avatar' | 'acessorio' | 'item';

export interface UploadedProduct {
  id: string;
  fileName: string;
  displayName: string;
  thumbUrl: string;
  productType: ProductType;
  uploadedAt: string;
  author: string;
  equipped?: boolean;
  itemCategory?: 'head' | 'chest' | 'eyes';
}

export interface ShopItem {
  id: string;
  name: string;
  thumb: string;
  category: 'head' | 'chest' | 'eyes';
  equipped: boolean;
  description?: string;
  owned?: boolean;
}

export type CustomizationCategory = 'chapeus' | 'casacos' | 'sapatos' | 'publicados' | 'todos';

export interface CustomizationItem {
  id: string;
  code: string; // e.g. #H001, #C001, #S001
  name: string;
  category: 'chapeus' | 'casacos' | 'sapatos' | 'publicados' | 'outros';
  thumb: string;
  owned: boolean;
  equipped: boolean;
  price?: number;
  rarity?: 'COMUM' | 'RARO' | 'ÉLITE';
  description?: string;
  isPublishedByCreator?: boolean;
  author?: string;
  fileBlobUrl?: string;
}

export interface StoreAvatar {
  id: string;
  name: string;
  rarity: 'COMUM' | 'RARO' | 'ÉLITE';
  price: number;
  thumb: string;
  tags: string[];
  owned: boolean;
  applied: boolean;
  description?: string;
  author?: string;
  isUserPublished?: boolean;
  fileBlobUrl?: string;
}

export interface AvatarPoseConfig {
  id: string;
  name: string;
  applied: boolean;
  description?: string;
}
