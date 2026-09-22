import React, { useState, useEffect } from 'react';
import { CreatorHeader } from './components/CreatorHeader';
import { CreatorSidebar } from './components/CreatorSidebar';
import { CreatorEditorCanvas3D } from './components/CreatorEditorCanvas3D';
import { UploadGLBModal } from './components/UploadGLBModal';
import { BoundaryModal } from './components/BoundaryModal';
import { AuthModal } from './components/AuthModal';
import { PublishModal } from './components/PublishModal';
import { INITIAL_INVENTORY, INITIAL_ROOMS } from './data/creatorData';
import {
  RoomEditorState,
  InventoryItem,
  GizmoEditMode,
  SpotItem,
  SpotType,
  PlayableBoundary,
  CreatorUser,
} from './types';
import { supabase } from './lib/supabase';
import { Lightbulb, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

export const App: React.FC = () => {
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
  // 1. Toggle MODO AVATAR: ligado = clicar nos spots como visitante (teleporta). desligado = edição.
  const [isAvatarMode, setIsAvatarMode] = useState<boolean>(true);

  // 2. Ícone OLHO: liga/desliga o ghost do LIMITE jogável. Padrão OFF.
  const [showBoundaryGhost, setShowBoundaryGhost] = useState<boolean>(false);

  // Selection & 3D Editing State
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>('spot-2');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
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
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Active room helper
  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

  // Save state
  useEffect(() => {
    localStorage.setItem('3d_social_creator_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('3d_social_creator_inventory', JSON.stringify(inventory));
  }, [inventory]);

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
        x: 5.4,
        y: 2.8,
        z: 6.2,
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

  // Upload handler (supports real GLB blob URLs and direct placement)
  const handleUploadSuccess = (
    item: InventoryItem,
    autoInsertPoint?: [number, number, number] | null
  ) => {
    setInventory((prev) => [item, ...prev]);

    // If it's a Sala (cenário), load directly as the room's 3D environment!
    if (item.type === 'Sala') {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === activeRoomId
            ? {
                ...r,
                sceneAssetId: item.id,
                sceneAssetBlobUrl: item.fileBlobUrl,
              }
            : r
        )
      );
      showToast(`Cenário 3D "${item.displayName}" carregado na room!`);
      return;
    }

    // If an insertion point was marked or requested for Item
    const targetPoint = autoInsertPoint || insertionCursorPoint;
    if (targetPoint && item.type === 'Item') {
      const newObjId = `obj-${Date.now()}`;
      const newPlacedObject = {
        id: newObjId,
        assetId: item.id,
        name: item.displayName,
        type: 'movel' as const,
        position: [targetPoint[0], 0.45, targetPoint[2]] as [number, number, number],
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
      setInsertionCursorPoint(null);
      showToast(`"${item.displayName}" inserido exatamente no ponto [${targetPoint[0]}, ${targetPoint[2]}]!`);
    } else {
      showToast(`Arquivo "${item.displayName}" adicionado ao inventário!`);
    }
  };

  // Insert GLB or asset into the scene
  const handleInsertAssetToScene = (asset: InventoryItem) => {
    // If it's a scene file, load as room scenario
    if (asset.type === 'Sala') {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === activeRoomId
            ? {
                ...r,
                sceneAssetId: asset.id,
                sceneAssetBlobUrl: asset.fileBlobUrl,
              }
            : r
        )
      );
      showToast(`Cenário 3D "${asset.displayName}" carregado na room!`);
      return;
    }

    const spawnPoint: [number, number, number] = insertionCursorPoint
      ? [...insertionCursorPoint]
      : [0, 0.4, 0];

    const newObjId = `obj-${Date.now()}`;
    const newPlacedObject = {
      id: newObjId,
      assetId: asset.id,
      name: asset.displayName,
      type: 'movel' as const,
      position: spawnPoint,
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      modelType: (asset.modelType || 'custom_glb') as any,
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
    showToast(`Avatar teleportado para o spot "${spot?.name || 'Spot'}"!`);
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
  };

  return (
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
            onSelectSpot={(spot) => {
              setSelectedSpotId(spot.id);
              setSelectedObjectId(null);
              if (isAvatarMode) {
                handleAvatarTeleport(spot.id);
              }
            }}
            activeSpotId={selectedSpotId}
            insertionCursorPoint={insertionCursorPoint}
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
              onUpdateObjectTransform={handleUpdateObjectTransform}
              onRemoveObject={handleRemoveObject}
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

        {/* Global Toast Notification */}
        {statusToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#121317] border border-[#d4af37] px-4 py-2 rounded-xl text-xs font-semibold text-[#ffd700] shadow-[0_4px_25px_rgba(0,0,0,0.85)] animate-fade-in flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#ffd700]" />
            <span>{statusToast}</span>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* Upload GLB Modal (creates real blob URLs and loads 3D scene) */}
      <UploadGLBModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        userDisplayName={user?.displayName || 'Luzenne'}
      />

      {/* Definir Limite Modal */}
      <BoundaryModal
        isOpen={isBoundaryModalOpen}
        onClose={() => setIsBoundaryModalOpen(false)}
        boundary={activeRoom.boundary}
        onSaveBoundary={handleSaveBoundary}
        roomName={activeRoom.name}
      />

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onAuthSuccess={(u) => {
          setUser(u);
          showToast(`Conectado como ${u.displayName}`);
        }}
      />

      {/* Publish Vitrine Success Modal */}
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        room={activeRoom}
      />
    </div>
  );
};

export default App;
