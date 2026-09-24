import React, { useState, useEffect } from 'react';
import { CreatorHeader } from './components/CreatorHeader';
import { CreatorSidebar } from './components/CreatorSidebar';
import { CreatorEditorCanvas3D } from './components/CreatorEditorCanvas3D';
import { UploadGLBModal } from './components/UploadGLBModal';
import { BoundaryModal } from './components/BoundaryModal';
import { AuthModal } from './components/AuthModal';
import { PublishModal } from './components/PublishModal';
import { PublishItemModal } from './components/PublishItemModal';
import { LobbyView } from './components/LobbyView';
import { RoomView } from './components/RoomView';
import { UserCustomizationView } from './components/UserCustomizationView';
import { INITIAL_INVENTORY, INITIAL_ROOMS } from './data/creatorData';
import { INITIAL_ROOMS as INITIAL_LOBBY_ROOMS } from './data/initialData';
import {
  INITIAL_CUSTOMIZATION_ITEMS,
  INITIAL_STORE_AVATARS,
  INITIAL_POSES as INITIAL_CUSTOMIZATION_POSES,
} from './data/initialCustomizationData';
import {
  RoomEditorState,
  PlacedObject,
  InventoryItem,
  GizmoEditMode,
  SpotItem,
  SpotType,
  PlayableBoundary,
  CreatorUser,
  RoomData,
  CustomizationItem,
  StoreAvatar,
  AvatarPoseConfig,
  StoreObjectType,
} from './types';
import { supabase } from './lib/supabase';
import { persistStoreItem, persistShowcaseRoom } from './lib/database';
import { getGlbFile } from './lib/storageIndexedDB';
import { Lightbulb, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation State between Editor, Rooms Lobby, Social Room, and User Customization/Loja
  const [currentScreen, setCurrentScreen] = useState<'editor' | 'lobby' | 'room' | 'customization'>('lobby');
  const [customizationInitialTab, setCustomizationInitialTab] = useState<'loja' | 'inventario' | 'poses'>('inventario');
  const [lobbyRoomIndex, setLobbyRoomIndex] = useState<number>(1);
  const [selectedLobbyRoom, setSelectedLobbyRoom] = useState<RoomData | null>(null);

  // Customization & Shop State (Matching User Images 2 & 3)
  const [customizationItems, setCustomizationItems] = useState<CustomizationItem[]>(() => {
    const saved = localStorage.getItem('3d_social_creator_customization_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_CUSTOMIZATION_ITEMS;
      }
    }
    return INITIAL_CUSTOMIZATION_ITEMS;
  });

  const [storeAvatars, setStoreAvatars] = useState<StoreAvatar[]>(() => {
    const saved = localStorage.getItem('3d_social_creator_store_avatars');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_STORE_AVATARS;
      }
    }
    return INITIAL_STORE_AVATARS;
  });

  const [activeAvatarId, setActiveAvatarId] = useState<string>(() => {
    const saved = localStorage.getItem('3d_social_creator_active_avatar_id');
    if (saved) return saved;
    return 'av-1';
  });

  const activeUserAvatar =
    storeAvatars.find((a) => a.id === activeAvatarId || a.applied) || storeAvatars[0];

  const [avatarPoses, setAvatarPoses] = useState<AvatarPoseConfig[]>(INITIAL_CUSTOMIZATION_POSES);

  // Rooms State (Room A | Room B | + Nova room)
  const [rooms, setRooms] = useState<RoomEditorState[]>(() => {
    const saved = localStorage.getItem('3d_social_creator_rooms');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_ROOMS;
      }
    }
    return INITIAL_ROOMS;
  });

  const [activeRoomId, setActiveRoomId] = useState<string>('room-a');

  // Inventory State (GLB files uploaded)
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('3d_social_creator_inventory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_INVENTORY;
      }
    }
    return INITIAL_INVENTORY;
  });

  // User Auth State
  const [user, setUser] = useState<CreatorUser | null>(() => {
    const saved = localStorage.getItem('3d_social_creator_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {
          id: 'user-default',
          email: 'exman9001@gmail.com',
          displayName: 'Luzenne',
          isGuest: false,
        };
      }
    }
    return {
      id: 'user-default',
      email: 'exman9001@gmail.com',
      displayName: 'Luzenne',
      isGuest: false,
    };
  });

  // Required Top Controls:
  // 1. Toggle MODO AVATAR: ligado = clicar nos spots como visitante (teleporta). desligado = edição completa com Gizmo.
  const [isAvatarMode, setIsAvatarMode] = useState<boolean>(false);

  // 2. Ícone OLHO: liga/desliga o ghost do LIMITE jogável. Padrão OFF.
  const [showBoundaryGhost, setShowBoundaryGhost] = useState<boolean>(false);

  // Selection & 3D Editing State
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>('spot-2');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [customAvatarObjectId, setCustomAvatarObjectId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [activeGizmoMode, setActiveGizmoMode] = useState<GizmoEditMode>('mover');
  const [insertionCursorPoint, setInsertionCursorPoint] = useState<[number, number, number] | null>(null);
  const [avatarCurrentSpotId, setAvatarCurrentSpotId] = useState<string | null>('spot-2');
  const [is16x9MockupMode, setIs16x9MockupMode] = useState<boolean>(true);
  const [showSpots, setShowSpots] = useState<boolean>(true);
  const [lockSpots, setLockSpots] = useState<boolean>(false);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBoundaryModalOpen, setIsBoundaryModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishItemModalOpen, setIsPublishItemModalOpen] = useState(false);
  const [publishingItem, setPublishingItem] = useState<InventoryItem | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Restore GLB Blob URLs from IndexedDB on page load/refresh (ensuring full persistence)
  useEffect(() => {
    const restoreBlobs = async () => {
      let hasUpdated = false;
      const updatedInventory = await Promise.all(
        inventory.map(async (item) => {
          if (!item.fileBlobUrl || item.fileBlobUrl.startsWith('blob:')) {
            const blob = await getGlbFile(item.id);
            if (blob) {
              hasUpdated = true;
              return { ...item, fileBlobUrl: URL.createObjectURL(blob) };
            }
          }
          return item;
        })
      );

      if (hasUpdated) {
        setInventory(updatedInventory);
        setRooms((prev) =>
          prev.map((room) => {
            const matchingScenario = updatedInventory.find(
              (i) => i.id === room.sceneAssetId
            );
            if (matchingScenario && matchingScenario.fileBlobUrl) {
              return {
                ...room,
                sceneAssetBlobUrl: matchingScenario.fileBlobUrl,
                placedObjects: room.placedObjects.map((obj) =>
                  obj.assetId === matchingScenario.id
                    ? { ...obj, fileBlobUrl: matchingScenario.fileBlobUrl }
                    : obj
                ),
              };
            }
            return room;
          })
        );
      }
    };

    restoreBlobs();
  }, []);

  // Active room helper
  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

  // Save state
  useEffect(() => {
    localStorage.setItem('3d_social_creator_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Auto-sync: If a room has sceneAssetBlobUrl but no corresponding 'cenario' in placedObjects,
  // register it as an editable placedObject so that the user can select and adjust it with the Gizmo!
  useEffect(() => {
    setRooms((prev) =>
      prev.map((r) => {
        if (
          r.sceneAssetBlobUrl &&
          !r.placedObjects.some(
            (o) => o.type === 'cenario' || (o.fileBlobUrl && o.fileBlobUrl === r.sceneAssetBlobUrl)
          )
        ) {
          const cenarioObj: PlacedObject = {
            id: `obj-cenario-${r.id}`,
            assetId: r.sceneAssetId || 'cenario',
            name:
              inventory.find(
                (i) => i.fileBlobUrl === r.sceneAssetBlobUrl || i.id === r.sceneAssetId
              )?.displayName || 'Cenário 3D da Sala',
            type: 'cenario',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            modelType: 'custom_glb',
            fileBlobUrl: r.sceneAssetBlobUrl,
          };
          return {
            ...r,
            placedObjects: [cenarioObj, ...r.placedObjects],
          };
        }
        return r;
      })
    );
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('3d_social_creator_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('3d_social_creator_customization_items', JSON.stringify(customizationItems));
  }, [customizationItems]);

  useEffect(() => {
    localStorage.setItem('3d_social_creator_store_avatars', JSON.stringify(storeAvatars));
  }, [storeAvatars]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('3d_social_creator_user', JSON.stringify(user));
    }
  }, [user]);

  // Check Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || 'criador@supabase.io',
          displayName: data.session.user.email?.split('@')[0] || 'Luzenne',
          isGuest: false,
        });
      }
    });
  }, []);

  const showToast = (message: string) => {
    setStatusToast(message);
    setTimeout(() => {
      setStatusToast(null);
    }, 3200);
  };

  // Customization & Shop Handlers (matching user request)
  const handleToggleEquipItem = (itemId: string) => {
    setCustomizationItems((prev) => {
      const target = prev.find((i) => i.id === itemId);
      if (!target) return prev;
      const willEquip = !target.equipped;

      return prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, equipped: willEquip };
        }
        // If equipping, unequip others in the same category
        if (willEquip && item.category === target.category) {
          return { ...item, equipped: false };
        }
        return item;
      });
    });
    showToast('Aparência atualizada no pedestal!');
  };

  const handleRemoveItemFromInventory = (itemId: string) => {
    setCustomizationItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, owned: false, equipped: false } : item
      )
    );
    showToast('Item removido do inventário de comprados.');
  };

  const handleApplyPose = (poseId: string) => {
    setAvatarPoses((prev) =>
      prev.map((p) => ({
        ...p,
        applied: p.id === poseId,
      }))
    );
  };

  const handleRemovePose = (poseId: string) => {
    setAvatarPoses((prev) =>
      prev.map((p) =>
        p.id === poseId ? { ...p, applied: false } : p
      )
    );
  };

  const handleSelectActiveAvatar = (avatarId: string) => {
    setActiveAvatarId(avatarId);
    localStorage.setItem('3d_social_creator_active_avatar_id', avatarId);
    setStoreAvatars((prev) =>
      prev.map((a) => ({
        ...a,
        applied: a.id === avatarId,
      }))
    );
  };

  const handleAcquireStoreAvatar = (avatarId: string) => {
    setActiveAvatarId(avatarId);
    localStorage.setItem('3d_social_creator_active_avatar_id', avatarId);
    setStoreAvatars((prev) =>
      prev.map((a) => {
        if (a.id === avatarId) {
          return { ...a, owned: true, applied: true };
        }
        return { ...a, applied: false };
      })
    );
  };

  const handleAcquireCustomItem = (item: CustomizationItem) => {
    setCustomizationItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) => (i.id === item.id ? { ...i, owned: true } : i));
      }
      return [...prev, { ...item, owned: true, equipped: false }];
    });
  };

  const handlePublishCustomItem = (itemData: Partial<CustomizationItem>) => {
    const newItem: CustomizationItem = {
      id: itemData.id || `pub-${Date.now()}`,
      code: itemData.code || `#P00${customizationItems.length + 1}`,
      name: itemData.name || 'Novo Item',
      category: itemData.category || 'chapeus',
      thumb: itemData.thumb || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&q=80',
      owned: true,
      equipped: false,
      price: itemData.price || 0,
      rarity: itemData.rarity || 'RARO',
      isPublishedByCreator: true,
      author: user?.displayName || 'Luzenne',
      description: itemData.description,
    };

    setCustomizationItems((prev) => [newItem, ...prev]);
    showToast(`"${newItem.name}" publicado com sucesso! Agora disponível para qualquer usuário na Loja.`);
  };

  const handlePublishInventoryItemToStore = (invItem: InventoryItem) => {
    setPublishingItem(invItem);
    setIsPublishItemModalOpen(true);
  };

  const handleConfirmPublishItem = async (payload: {
    item: InventoryItem;
    name: string;
    objectType: StoreObjectType;
    price: number;
    hashtags: string[];
    thumbnailUrl: string;
    rarity: 'COMUM' | 'RARO' | 'ÉLITE';
    description: string;
    publishMode: 'simples' | 'avancado';
  }) => {
    // 1. Persist to Supabase and guarantee localStorage persistence
    await persistStoreItem(
      {
        name: payload.name,
        objectType: payload.objectType,
        price: payload.price,
        hashtags: payload.hashtags,
        thumbnailUrl: payload.thumbnailUrl,
        rarity: payload.rarity,
        description: payload.description,
        publishMode: payload.publishMode,
        fileBlobUrl: payload.item.fileBlobUrl,
        author: user?.displayName || 'Luzenne',
      },
      user
    );

    // 2. React state integration for avatars or store customization items
    if (payload.objectType === 'avatar') {
      const newAvatar: StoreAvatar = {
        id: `av-pub-${payload.item.id}-${Date.now()}`,
        name: payload.name,
        price: payload.price,
        rarity: payload.rarity,
        tags: payload.hashtags,
        thumb: payload.thumbnailUrl || payload.item.thumbUrl,
        author: user?.displayName || 'Luzenne',
        isUserPublished: true,
        owned: true,
        applied: false,
        fileBlobUrl: payload.item.fileBlobUrl,
        description: payload.description,
      };
      setStoreAvatars((prev) => [newAvatar, ...prev.filter((a) => a.name !== payload.name)]);
    } else if (payload.objectType === 'sala') {
      const roomMatch = rooms.find(
        (r) => r.sceneAssetId === payload.item.id || r.sceneAssetBlobUrl === payload.item.fileBlobUrl
      );
      if (roomMatch) {
        await persistShowcaseRoom(
          { ...roomMatch, name: payload.name },
          user,
          { price: payload.price, hashtags: payload.hashtags, publishMode: payload.publishMode }
        );
      }
    } else {
      const newCustomItem: CustomizationItem = {
        id: `item-pub-${payload.item.id}-${Date.now()}`,
        code: `#P${Math.floor(100 + Math.random() * 900)}`,
        name: payload.name,
        category: payload.objectType === 'moveis' ? 'outros' : 'publicados',
        thumb: payload.thumbnailUrl || payload.item.thumbUrl,
        owned: true,
        equipped: false,
        price: payload.price,
        rarity: payload.rarity,
        isPublishedByCreator: true,
        author: user?.displayName || 'Luzenne',
        fileBlobUrl: payload.item.fileBlobUrl,
        description: payload.description,
      };
      setCustomizationItems((prev) => [newCustomItem, ...prev.filter((i) => i.id !== newCustomItem.id)]);
    }

    // 3. Update inventory item display name
    setInventory((prev) =>
      prev.map((i) =>
        i.id === payload.item.id
          ? { ...i, displayName: payload.name, thumbUrl: payload.thumbnailUrl || i.thumbUrl }
          : i
      )
    );

    showToast(`"${payload.name}" publicado na Loja e Vitrine com sucesso!`);
  };

  const handleRenameInventoryItem = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, displayName: trimmed } : item))
    );
    setRooms((prev) =>
      prev.map((room) => ({
        ...room,
        name: room.sceneAssetId === id ? trimmed : room.name,
        placedObjects: room.placedObjects.map((obj) =>
          obj.assetId === id ? { ...obj, name: trimmed } : obj
        ),
      }))
    );
    showToast(`Nome alterado para "${trimmed}"`);
  };

  const handleRenamePlacedObject = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setRooms((prev) =>
      prev.map((room) => ({
        ...room,
        placedObjects: room.placedObjects.map((obj) =>
          obj.id === id ? { ...obj, name: trimmed } : obj
        ),
      }))
    );
    showToast(`Objeto renomeado para "${trimmed}"`);
  };

  // Add new Room tab
  const handleAddNewRoom = () => {
    const nextLetter = String.fromCharCode(65 + rooms.length);
    const newRoom: RoomEditorState = {
      id: `room-${Date.now()}`,
      name: `Room ${nextLetter} · Novo Salão`,
      sceneAssetId: 'cenario-padrao',
      placedObjects: [],
      spots: [
        {
          id: `spot-${Date.now()}-1`,
          name: 'Pé Entrada',
          type: 'pe',
          position: [0, 0.02, 1.0],
          rotation: 0,
        },
      ],
      boundary: {
        x: 6.0,
        y: 2.8,
        z: 8.0,
        isConfirmed: false,
      },
      isPublished: false,
    };

    setRooms((prev) => [...prev, newRoom]);
    setActiveRoomId(newRoom.id);
    setSelectedSpotId(newRoom.spots[0].id);
    setSelectedObjectId(null);
    showToast(`Nova Room ${nextLetter} criada com sucesso!`);
  };

  // Upload handler (supports real GLB blob URLs and direct placement with Gizmo)
  const handleUploadSuccess = (
    item: InventoryItem,
    autoInsertPoint?: [number, number, number] | null
  ) => {
    setInventory((prev) => [item, ...prev]);

    // 1. If user uploads a 'Sala' (architectural 3D scenario)
    if (item.type === 'Sala') {
      const targetPoint = autoInsertPoint || (insertionCursorPoint ? [insertionCursorPoint[0], 0.0, insertionCursorPoint[2]] : [0, 0, 0]);
      const newObjId = `obj-cenario-${Date.now()}`;
      const newPlacedObject: PlacedObject = {
        id: newObjId,
        assetId: item.id,
        name: item.displayName,
        type: 'cenario',
        position: [targetPoint[0], 0.0, targetPoint[2]] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        modelType: 'custom_glb',
        fileBlobUrl: item.fileBlobUrl,
      };

      setRooms((prev) =>
        prev.map((r) => {
          if (r.id !== activeRoomId) return r;
          const cleanPlaced = r.placedObjects.filter((o) => o.type !== 'cenario');
          return {
            ...r,
            sceneAssetId: item.id,
            sceneAssetBlobUrl: item.fileBlobUrl,
            placedObjects: [newPlacedObject, ...cleanPlaced],
          };
        })
      );
      setSelectedObjectId(newObjId);
      setSelectedSpotId(null);
      setInsertionCursorPoint(null);
      setIsAvatarMode(false); // Mode edit on so gizmo is visible
      showToast(`Cenário 3D "${item.displayName}" inserido! Ajuste com o Gizmo (Mover, Rodar, Escalar, Elevar).`);
      return;
    }

    // 2. If user uploads an 'Avatar' or 'Item'
    if (autoInsertPoint && (item.type === 'Item' || item.type === 'Avatar')) {
      const targetPoint = autoInsertPoint;
      const isAvatarType = item.type === 'Avatar';
      const newObjId = `obj-${isAvatarType ? 'avatar' : 'item'}-${Date.now()}`;
      const newPlacedObject: PlacedObject = {
        id: newObjId,
        assetId: item.id,
        name: item.displayName,
        type: isAvatarType ? 'avatar' : 'movel',
        isAvatar: isAvatarType,
        position: [targetPoint[0], 0.0, targetPoint[2]] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        modelType: (item.modelType || (isAvatarType ? 'avatar' : 'custom_glb')) as any,
        fileBlobUrl: item.fileBlobUrl,
      };

      setRooms((prev) =>
        prev.map((r) =>
          r.id === activeRoomId
            ? { ...r, placedObjects: [...r.placedObjects, newPlacedObject] }
            : r
        )
      );
      setSelectedObjectId(newObjId);
      setSelectedSpotId(null);
      setInsertionCursorPoint(null);
      setIsAvatarMode(false); // Mode edit on so gizmo is visible
      if (isAvatarType) {
        setCustomAvatarObjectId(newObjId);
      }
      showToast(`"${item.displayName}" inserido na cena 3D! Ajuste com o Gizmo.`);
    } else {
      showToast(`"${item.displayName}" salvo no inventário! Clique em "Inserir na Cena" quando desejar colocá-lo.`);
    }
  };

  // Insert GLB or asset into the scene (supporting Sala, Avatar, and Item with Gizmo)
  const handleInsertAssetToScene = (asset: InventoryItem) => {
    const spawnPoint: [number, number, number] = insertionCursorPoint
      ? [insertionCursorPoint[0], 0.0, insertionCursorPoint[2]]
      : [0, 0.0, 0];

    // If it's a scene file (Sala), load as scenario and enable full Gizmo
    if (asset.type === 'Sala') {
      const newObjId = `obj-cenario-${Date.now()}`;
      const newPlacedObject: PlacedObject = {
        id: newObjId,
        assetId: asset.id,
        name: asset.displayName,
        type: 'cenario',
        position: spawnPoint,
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        modelType: 'custom_glb',
        fileBlobUrl: asset.fileBlobUrl,
      };

      setRooms((prev) =>
        prev.map((r) => {
          if (r.id !== activeRoomId) return r;
          const cleanPlaced = r.placedObjects.filter((o) => o.type !== 'cenario');
          return {
            ...r,
            sceneAssetId: asset.id,
            sceneAssetBlobUrl: asset.fileBlobUrl,
            placedObjects: [newPlacedObject, ...cleanPlaced],
          };
        })
      );
      setSelectedObjectId(newObjId);
      setSelectedSpotId(null);
      setInsertionCursorPoint(null);
      setIsAvatarMode(false);
      showToast(`Cenário 3D "${asset.displayName}" inserido na room! Ajuste com o Gizmo.`);
      return;
    }

    const isAvatarType = asset.type === 'Avatar';
    const newObjId = `obj-${isAvatarType ? 'avatar' : 'item'}-${Date.now()}`;
    const newPlacedObject: PlacedObject = {
      id: newObjId,
      assetId: asset.id,
      name: asset.displayName,
      type: isAvatarType ? 'avatar' : 'movel',
      isAvatar: isAvatarType,
      position: spawnPoint,
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      modelType: (asset.modelType || (isAvatarType ? 'avatar' : 'custom_glb')) as any,
      fileBlobUrl: asset.fileBlobUrl,
    };

    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? { ...r, placedObjects: [...r.placedObjects, newPlacedObject] }
          : r
      )
    );

    setSelectedObjectId(newObjId);
    setSelectedSpotId(null);
    setInsertionCursorPoint(null);
    setIsAvatarMode(false);
    if (isAvatarType) {
      setCustomAvatarObjectId(newObjId);
    }
    showToast(`"${asset.displayName}" inserido na cena! Ajuste com o Gizmo.`);
  };

  // Update object transform via Gizmo (with strict numeric sanitization)
  const handleUpdateObjectTransform = (
    id: string,
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? {
              ...r,
              placedObjects: r.placedObjects.map((obj) => {
                if (obj.id !== id) return obj;
                const safePos: [number, number, number] = [
                  Number.isFinite(transform.position[0]) ? transform.position[0] : obj.position[0],
                  Number.isFinite(transform.position[1]) ? transform.position[1] : obj.position[1],
                  Number.isFinite(transform.position[2]) ? transform.position[2] : obj.position[2],
                ];
                const safeRot: [number, number, number] = [
                  Number.isFinite(transform.rotation[0]) ? transform.rotation[0] : obj.rotation[0],
                  Number.isFinite(transform.rotation[1]) ? transform.rotation[1] : obj.rotation[1],
                  Number.isFinite(transform.rotation[2]) ? transform.rotation[2] : obj.rotation[2],
                ];
                const safeScale: [number, number, number] = [
                  Number.isFinite(transform.scale[0]) && transform.scale[0] >= 0.05 ? transform.scale[0] : obj.scale[0],
                  Number.isFinite(transform.scale[1]) && transform.scale[1] >= 0.05 ? transform.scale[1] : obj.scale[1],
                  Number.isFinite(transform.scale[2]) && transform.scale[2] >= 0.05 ? transform.scale[2] : obj.scale[2],
                ];
                return {
                  ...obj,
                  position: safePos,
                  rotation: safeRot,
                  scale: safeScale,
                };
              }),
            }
          : r
      )
    );
  };

  // Remove object from scene (keeps file in inventory)
  const handleRemoveObject = (id: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? {
              ...r,
              placedObjects: r.placedObjects.filter((obj) => obj.id !== id),
            }
          : r
      )
    );
    setSelectedObjectId(null);
    showToast('Objeto removido da cena. O arquivo continua no inventário.');
  };

  // Spot management
  const handleAddSpot = (type: SpotType, name: string) => {
    const newSpot: SpotItem = {
      id: `spot-${Date.now()}`,
      name,
      type,
      position: [
        parseFloat(((Math.random() - 0.5) * 2.2).toFixed(2)),
        type === 'sentar' ? 0.52 : 0.02,
        parseFloat(((Math.random() - 0.5) * 1.6 + 0.4).toFixed(2)),
      ],
      rotation: 0,
    };

    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId ? { ...r, spots: [...r.spots, newSpot] } : r
      )
    );
    setSelectedSpotId(newSpot.id);
    setSelectedObjectId(null);
    showToast(`Spot "${name}" (${type}) adicionado!`);
  };

  const handleRemoveSpot = (spotId: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? { ...r, spots: r.spots.filter((s) => s.id !== spotId) }
          : r
      )
    );
    if (selectedSpotId === spotId) setSelectedSpotId(null);
    showToast('Spot removido da cena.');
  };

  const handleClearAllSpots = () => {
    setRooms((prev) =>
      prev.map((r) => (r.id === activeRoomId ? { ...r, spots: [] } : r))
    );
    setSelectedSpotId(null);
    showToast('Todos os spots foram removidos da cena.');
  };

  const handleRemoveOverlappingSpots = () => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== activeRoomId) return r;
        const keptSpots: SpotItem[] = [];
        const threshold = 0.45; // meters distance to consider overlapping
        for (const spot of r.spots) {
          const isOverlapping = keptSpots.some((k) => {
            const dx = k.position[0] - spot.position[0];
            const dz = k.position[2] - spot.position[2];
            return Math.sqrt(dx * dx + dz * dz) < threshold;
          });
          if (!isOverlapping) {
            keptSpots.push(spot);
          }
        }
        const removedCount = r.spots.length - keptSpots.length;
        if (removedCount > 0) {
          showToast(`${removedCount} spot(s) sobreposto(s) removido(s)!`);
        } else {
          showToast('Nenhum spot sobreposto encontrado.');
        }
        return { ...r, spots: keptSpots };
      })
    );
  };

  const handleUpdateSpotPosition = (id: string, position: [number, number, number]) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? {
              ...r,
              spots: r.spots.map((s) => (s.id === id ? { ...s, position } : s)),
            }
          : r
      )
    );
  };

  const handleUpdateSpotRotation = (id: string, rotation: number) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? {
              ...r,
              spots: r.spots.map((s) => (s.id === id ? { ...s, rotation } : s)),
            }
          : r
      )
    );
  };

  const handleAvatarTeleport = (spotId: string) => {
    setAvatarCurrentSpotId(spotId);
    const spot = activeRoom.spots.find((s) => s.id === spotId);
    if (!spot) return;

    if (customAvatarObjectId) {
      // Reposition the custom avatar object onto the clicked spot
      const spotAngleRad = (spot.rotation * Math.PI) / 180;
      setRooms((prev) =>
        prev.map((r) =>
          r.id === activeRoomId
            ? {
                ...r,
                placedObjects: r.placedObjects.map((obj) =>
                  obj.id === customAvatarObjectId
                    ? {
                        ...obj,
                        position: [spot.position[0], spot.position[1], spot.position[2]],
                        rotation: [obj.rotation[0], spotAngleRad, obj.rotation[2]],
                      }
                    : obj
                ),
              }
            : r
        )
      );
      showToast(`Item Avatar controlado movido para o spot "${spot.name || 'Spot'}"!`);
    } else {
      showToast(`Avatar teleportado para o spot "${spot.name || 'Spot'}"!`);
    }
  };

  // Drag and drop asset from inventory directly into 3D scene floor
  const handleDropItemOnScene = (item: InventoryItem, coords: [number, number, number]) => {
    if (item.type === 'Sala') {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === activeRoomId
            ? {
                ...r,
                sceneAssetBlobUrl: item.fileBlobUrl || undefined,
                sceneAssetId: item.id,
              }
            : r
        )
      );
      showToast(`Cenário 3D "${item.displayName}" carregado na cena!`);
      return;
    }

    const newObjId = `obj-${Date.now()}`;
    const newPlacedObject = {
      id: newObjId,
      assetId: item.id,
      name: item.displayName,
      type: 'movel' as const,
      position: coords,
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      modelType: (item.modelType || 'custom_glb') as any,
      fileBlobUrl: item.fileBlobUrl,
    };

    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? { ...r, placedObjects: [...r.placedObjects, newPlacedObject] }
          : r
      )
    );

    setSelectedObjectId(newObjId);
    setSelectedSpotId(null);
    showToast(`"${item.displayName}" inserido diretamente na posição [${coords[0]}, ${coords[2]}]!`);
  };

  // Boundary save
  const handleSaveBoundary = (boundary: PlayableBoundary) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === activeRoomId ? { ...r, boundary } : r))
    );
    showToast(`Limite jogável salvo: ${boundary.x}m × ${boundary.y}m × ${boundary.z}m!`);
  };

  // Publish room
  const handlePublishRoom = () => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId ? { ...r, isPublished: true, publishedAt: 'Agora' } : r
      )
    );
    setIsPublishModalOpen(true);
    showToast(`"${activeRoom.name}" publicada com sucesso! Ela agora aparece na Vitrine.`);
  };

  // Change placed object type (Móvel | Objeto | Avatar)
  const handleUpdateObjectType = (
    id: string,
    type: 'cenario' | 'movel' | 'objeto' | 'avatar'
  ) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? {
              ...r,
              placedObjects: r.placedObjects.map((obj) =>
                obj.id === id
                  ? {
                      ...obj,
                      type,
                      isAvatar: type === 'avatar',
                    }
                  : obj
              ),
            }
          : r
      )
    );

    if (type === 'avatar') {
      setCustomAvatarObjectId(id);
      showToast(`Objeto definido como Avatar! Ative o Modo Avatar para controlá-lo nos spots.`);
    } else {
      if (customAvatarObjectId === id) {
        setCustomAvatarObjectId(null);
      }
      showToast(`Tipo de objeto alterado para "${type}".`);
    }
  };

  // Dynamic lobby showcase rooms (combining default rooms + published editor rooms)
  const lobbyRooms: RoomData[] = React.useMemo(() => {
    const publishedEditorRooms: RoomData[] = rooms
      .filter((r) => r.isPublished)
      .map((r) => ({
        id: `editor-${r.id}`,
        name: r.name,
        badge: '👑',
        occupation: '0/8',
        currentUsers: 0,
        maxUsers: 8,
        thumb:
          r.sceneAssetId === 'inv-scene-1'
            ? 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
            : r.sceneAssetId === 'inv-scene-2'
            ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
            : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
        description: `Room criada no Modo Criador · Limite ${r.boundary.x}m × ${r.boundary.y}m × ${r.boundary.z}m com ${r.spots.length} spots ativos.`,
        isFromEditor: true,
        editorRoomId: r.id,
        editorRoom: r,
        ambientColor: '#ffd700',
      }));

    return [...INITIAL_LOBBY_ROOMS, ...publishedEditorRooms];
  }, [rooms]);

  // Handle Playtest room without publishing or appearing in vitrine
  const handlePlaytestActiveRoom = () => {
    setIsPublishModalOpen(false);
    const playtestRoomData: RoomData = {
      id: `playtest-${activeRoom.id}`,
      name: `[TESTE] ${activeRoom.name}`,
      badge: '🧪',
      occupation: '1/8 (Você)',
      currentUsers: 1,
      maxUsers: 8,
      thumb:
        activeRoom.sceneAssetId === 'inv-scene-1'
          ? 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
          : activeRoom.sceneAssetId === 'inv-scene-2'
          ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      description: `Modo teste interativo da room. Interaja com os spots e avatar sem publicar na vitrine.`,
      isFromEditor: true,
      editorRoomId: activeRoom.id,
      editorRoom: activeRoom,
      isPlaytest: true,
      ambientColor: '#ffd700',
    };
    setSelectedLobbyRoom(playtestRoomData);
    setCurrentScreen('room');
    showToast(`Iniciando Modo Teste Interativo de "${activeRoom.name}"!`);
  };

  // Go to showcase after publishing
  const handleGoToVitrine = () => {
    setIsPublishModalOpen(false);
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId ? { ...r, isPublished: true, publishedAt: 'Agora' } : r
      )
    );
    const targetRoomId = `editor-${activeRoom.id}`;
    const foundIndex = lobbyRooms.findIndex((r) => r.id === targetRoomId);
    if (foundIndex >= 0) {
      setLobbyRoomIndex(foundIndex);
    } else {
      setLobbyRoomIndex(lobbyRooms.length);
    }
    setCurrentScreen('lobby');
    showToast(`Exibindo "${activeRoom.name}" na Vitrine de Rooms!`);
  };

  return (
    <>
      {/* Screen 1: Lobby View (Portals & Social Hall) */}
      {currentScreen === 'lobby' && (
        <LobbyView
          rooms={lobbyRooms}
          selectedRoomIndex={lobbyRoomIndex}
          onSelectRoomIndex={setLobbyRoomIndex}
          onEnterRoom={(room) => {
            setSelectedLobbyRoom(room);
            setCurrentScreen('room');
          }}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onOpenShop={() => {
            setCustomizationInitialTab('loja');
            setCurrentScreen('customization');
          }}
          onOpenCustomization={() => {
            setCustomizationInitialTab('inventario');
            setCurrentScreen('customization');
          }}
          onOpenFriends={() => {
            showToast('Lista de amigos conectada.');
          }}
          onOpenEditor={() => setCurrentScreen('editor')}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* Screen 2: User Customization & Loja View (Matching Images 2 & 3) */}
      {currentScreen === 'customization' && (
        <UserCustomizationView
          onBackToLobby={() => setCurrentScreen('lobby')}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          initialTab={customizationInitialTab}
          userInventory={inventory}
          customizationItems={customizationItems}
          storeAvatars={storeAvatars}
          poses={avatarPoses}
          onToggleEquipItem={handleToggleEquipItem}
          onRemoveItemFromInventory={handleRemoveItemFromInventory}
          onApplyPose={handleApplyPose}
          onRemovePose={handleRemovePose}
          onAcquireStoreAvatar={handleAcquireStoreAvatar}
          onAcquireCustomItem={handleAcquireCustomItem}
          onPublishCustomItem={handlePublishCustomItem}
          onSelectActiveAvatar={handleSelectActiveAvatar}
        />
      )}

      {/* Screen 3: Social Room View (Avatar Lounge with Poses, Chat & Gizmo) */}
      {currentScreen === 'room' && selectedLobbyRoom && (
        <RoomView
          room={selectedLobbyRoom}
          activeUserAvatar={activeUserAvatar}
          user={user}
          onExitToLobby={() => {
            if (selectedLobbyRoom.isPlaytest) {
              setCurrentScreen('editor');
            } else {
              setCurrentScreen('lobby');
            }
          }}
          equippedAccessories={[]}
        />
      )}

      {/* Screen 4: Creator Editor 3D Mode */}
      {currentScreen === 'editor' && (
        <div className="w-screen h-screen bg-[#0a0b0d] text-[#e0cfb3] font-sans flex items-center justify-center p-0 md:p-3 overflow-hidden select-none">
      {/* 16:9 Mockup Frame with Fine Gold Border matching the new visual identity */}
      <div
        className={`relative w-full h-full bg-[#101115] border border-[#d4af37]/30 rounded-none md:rounded-xl overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.85)] flex flex-col ${
          is16x9MockupMode ? 'max-w-[1440px] aspect-video max-h-[96vh]' : 'max-w-none'
        }`}
      >
        {/* TOP BAR / HEADER with required controls */}
        <CreatorHeader
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelectRoom={(id) => {
            setActiveRoomId(id);
            setSelectedSpotId(null);
            setSelectedObjectId(null);
          }}
          onAddNewRoom={handleAddNewRoom}
          onOpenBoundaryModal={() => setIsBoundaryModalOpen(true)}
          onPublishRoom={handlePublishRoom}
          onPlaytestRoom={handlePlaytestActiveRoom}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          user={user}
          isAvatarMode={isAvatarMode}
          onToggleAvatarMode={() => setIsAvatarMode(!isAvatarMode)}
          showBoundaryGhost={showBoundaryGhost}
          onToggleBoundaryGhost={() => setShowBoundaryGhost(!showBoundaryGhost)}
          showSpots={showSpots}
          onToggleShowSpots={() => setShowSpots(!showSpots)}
          lockSpots={lockSpots}
          onToggleLockSpots={() => setLockSpots(!lockSpots)}
          onExitEditor={() => setCurrentScreen('lobby')}
        />

        {/* MAIN STUDIO WORKSPACE: Left Sidebar (Spots / Inventário) + 3D Center Editor Canvas */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar matching user screenshot with Spots, Objetos (com lixeira) e Itens */}
          <CreatorSidebar
            inventory={inventory}
            spots={activeRoom.spots}
            placedObjects={activeRoom.placedObjects}
            selectedObjectId={selectedObjectId}
            onSelectObjectId={(id) => {
              setSelectedObjectId(id);
              if (id) setSelectedSpotId(null);
            }}
            onRemoveObject={handleRemoveObject}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onInsertAssetToScene={handleInsertAssetToScene}
            onAddSpot={handleAddSpot}
            onRemoveSpot={handleRemoveSpot}
            onClearAllSpots={handleClearAllSpots}
            onRemoveOverlappingSpots={handleRemoveOverlappingSpots}
            onSelectSpot={(spot) => {
              setSelectedSpotId(spot.id);
              setSelectedObjectId(null);
              if (isAvatarMode) {
                handleAvatarTeleport(spot.id);
              }
            }}
            activeSpotId={selectedSpotId}
            insertionCursorPoint={insertionCursorPoint}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            customAvatarObjectId={customAvatarObjectId}
            onSetCustomAvatarObjectId={setCustomAvatarObjectId}
            onUpdateObjectType={handleUpdateObjectType}
            sceneAssetBlobUrl={activeRoom.sceneAssetBlobUrl}
            sceneAssetName={
              activeRoom.sceneAssetBlobUrl
                ? inventory.find(
                    (i) =>
                      i.fileBlobUrl === activeRoom.sceneAssetBlobUrl ||
                      i.id === activeRoom.sceneAssetId
                  )?.displayName || 'Cenário 3D da Sala'
                : undefined
            }
            onRemoveScenario={() => {
              setRooms((prev) =>
                prev.map((r) =>
                  r.id === activeRoomId
                    ? { ...r, sceneAssetBlobUrl: undefined, sceneAssetId: null }
                    : r
                )
              );
              showToast('Cenário 3D removido da sala.');
            }}
            onPublishInventoryItem={handlePublishInventoryItemToStore}
            onRenameInventoryItem={handleRenameInventoryItem}
            onRenamePlacedObject={handleRenamePlacedObject}
          />

          {/* 3D Scene Viewport */}
          <main className="flex-1 relative h-full overflow-hidden bg-[#101115]">
            <CreatorEditorCanvas3D
              sceneAssetBlobUrl={activeRoom.sceneAssetBlobUrl}
              sceneAssetId={activeRoom.sceneAssetId}
              placedObjects={activeRoom.placedObjects}
              spots={activeRoom.spots}
              boundary={activeRoom.boundary}
              selectedSpotId={selectedSpotId}
              selectedObjectId={selectedObjectId}
              onSelectSpot={(id) => {
                setSelectedSpotId(id);
                if (id) setSelectedObjectId(null);
              }}
              onSelectObject={(id) => {
                setSelectedObjectId(id);
                if (id) setSelectedSpotId(null);
              }}
              onUpdateSpotPosition={handleUpdateSpotPosition}
              onUpdateSpotRotation={handleUpdateSpotRotation}
              onRemoveSpot={handleRemoveSpot}
              onClearAllSpots={handleClearAllSpots}
              onRemoveOverlappingSpots={handleRemoveOverlappingSpots}
              onUpdateObjectTransform={handleUpdateObjectTransform}
              onRemoveObject={handleRemoveObject}
              onUpdateBoundary={handleSaveBoundary}
              onSceneClickInsertionPoint={(point) => {
                setInsertionCursorPoint(point);
              }}
              insertionCursorPoint={insertionCursorPoint}
              isAvatarMode={isAvatarMode}
              showBoundaryGhost={showBoundaryGhost}
              showSpots={showSpots}
              lockSpots={lockSpots}
              onToggleShowSpots={() => setShowSpots(!showSpots)}
              onToggleLockSpots={() => setLockSpots(!lockSpots)}
              activeGizmoMode={activeGizmoMode}
              onChangeGizmoMode={setActiveGizmoMode}
              avatarCurrentSpotId={avatarCurrentSpotId}
              onAvatarTeleport={handleAvatarTeleport}
              customAvatarObjectId={customAvatarObjectId}
              onSetCustomAvatarObjectId={setCustomAvatarObjectId}
              onUpdateObjectType={handleUpdateObjectType}
              onDropItemOnScene={handleDropItemOnScene}
            />

            {/* Top-Right Aspect Ratio Toggle */}
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIs16x9MockupMode(!is16x9MockupMode)}
                className="px-2 py-1 rounded bg-[#121317]/90 hover:bg-[#d4af37] hover:text-black border border-[#d4af37]/50 text-[10px] font-semibold text-[#d4af37] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 shadow-md"
                title={is16x9MockupMode ? 'Alternar para tela cheia fluida' : 'Ajustar para Mockup 16:9'}
              >
                {is16x9MockupMode ? (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">16:9</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Fluido</span>
                  </>
                )}
              </button>
            </div>
          </main>
        </div>

        {/* BOTTOM BAR matching Reference Image */}
        <footer className="w-full bg-[#121317]/95 border-t border-[#d4af37]/30 px-6 py-2.5 flex items-center justify-between text-xs text-[#d4af37]/90 z-30">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
            <p className="font-normal tracking-wide">
              Toggle Avatar = testar clique. Olho = mostrar/ocultar limite.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[11px] text-[#e8d5b5]/70">
            <span>Clique no sofá = avatar vai para este spot.</span>
          </div>
        </footer>
      </div>
    </div>
  )}

  {/* Global Toast Notification (Accessible on all screens) */}
  {statusToast && (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#121317] border border-[#ffd700] px-5 py-2.5 rounded-xl text-xs font-bold text-[#ffd700] shadow-[0_4px_30px_rgba(0,0,0,0.9)] animate-fade-in flex items-center gap-2 pointer-events-none">
      <Sparkles className="w-4 h-4 text-[#ffd700]" />
      <span>{statusToast}</span>
    </div>
  )}

  {/* GLOBAL MODALS (Always mounted and accessible across all screens: Lobby, Loja, Room, Editor) */}
  <AuthModal
    isOpen={isAuthModalOpen}
    onClose={() => setIsAuthModalOpen(false)}
    currentUser={user}
    onAuthSuccess={(u) => {
      setUser(u);
      showToast(`Conectado como ${u.displayName}`);
    }}
  />

  <UploadGLBModal
    isOpen={isUploadModalOpen}
    onClose={() => setIsUploadModalOpen(false)}
    onUploadSuccess={handleUploadSuccess}
    userDisplayName={user?.displayName || 'Luzenne'}
    onPublishToStore={handlePublishInventoryItemToStore}
  />

  <BoundaryModal
    isOpen={isBoundaryModalOpen}
    onClose={() => setIsBoundaryModalOpen(false)}
    boundary={activeRoom.boundary}
    onSaveBoundary={handleSaveBoundary}
    roomName={activeRoom.name}
  />

  <PublishModal
    isOpen={isPublishModalOpen}
    onClose={() => setIsPublishModalOpen(false)}
    room={activeRoom}
    user={user}
    onGoToVitrine={handleGoToVitrine}
    onPlaytest={handlePlaytestActiveRoom}
  />

  <PublishItemModal
    isOpen={isPublishItemModalOpen}
    onClose={() => setIsPublishItemModalOpen(false)}
    item={publishingItem}
    user={user}
    onConfirmPublish={handleConfirmPublishItem}
    onGoToStore={() => {
      setIsPublishItemModalOpen(false);
      setCustomizationInitialTab('loja');
      setCurrentScreen('customization');
    }}
  />
</>
);
};

export default App;
