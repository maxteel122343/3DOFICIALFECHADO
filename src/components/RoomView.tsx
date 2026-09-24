import React, { useState, useEffect } from 'react';
import { Box, ChevronDown, LogOut, ArrowDown } from 'lucide-react';
import {
  RoomData,
  AvatarPose,
  AvatarTransform,
  GizmoMode,
  Spot,
  ChatMessage,
  SpeechBubbleItem,
  StoreAvatar,
  CreatorUser,
} from '../types';
import { INITIAL_POSES, INITIAL_SPOTS, INITIAL_CHAT } from '../data/initialData';
import { LoungeCanvas3D } from './LoungeCanvas3D';
import { GizmoWidget } from './GizmoWidget';
import { PoseGrid } from './PoseGrid';
import { GlassChat } from './GlassChat';
import { SpeechBubbleOverlay } from './SpeechBubbleOverlay';

interface RoomViewProps {
  room: RoomData;
  onExitToLobby: () => void;
  equippedAccessories: string[];
  activeUserAvatar?: StoreAvatar | null;
  user?: CreatorUser | null;
}

export const RoomView: React.FC<RoomViewProps> = ({
  room,
  onExitToLobby,
  equippedAccessories,
  activeUserAvatar,
  user,
}) => {
  // Gizmo & Transform State
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('scale');
  const [transform, setTransform] = useState<AvatarTransform>({
    scale: 1.0,
    sizeY: 1.0,
    angle: 0,
  });

  // Poses State (pose = GLB file swap)
  const [poses] = useState<AvatarPose[]>(INITIAL_POSES);
  const [selectedPose, setSelectedPose] = useState<AvatarPose>(INITIAL_POSES[1]); // "Rindo" initially active as in Reference 1

  // Spots State (puff ouro spots)
  const [spots] = useState<Spot[]>(() => {
    if (room.editorRoom?.spots && room.editorRoom.spots.length > 0) {
      return room.editorRoom.spots.map((s, idx) => ({
        id: idx + 1,
        name: s.name,
        label: s.name,
        position: [s.position[0], s.position[1], s.position[2]],
        rotation: s.rotation,
      }));
    }
    return INITIAL_SPOTS;
  });
  const [currentSpotId, setCurrentSpotId] = useState<number>(() => {
    if (room.editorRoom?.spots && room.editorRoom.spots.length > 0) {
      return 1;
    }
    return 2;
  }); // Center puff is Player

  // Toggle for discreet blinking down-arrows above spots
  const [showSpotArrows, setShowSpotArrows] = useState<boolean>(true);

  // Camera dropdown state
  const [cameraMode, setCameraMode] = useState<'orbit' | 'frontal' | 'closeup' | 'topdown'>('orbit');
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // Chat & Speech Bubbles State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubbleItem[]>([
    {
      id: 'initial-bubble',
      text: 'oi',
      spotId: 1, // Maya says "oi" matching Reference 1
      userName: 'Maya',
      createdAt: Date.now(),
    },
  ]);
  const [screenHeadPositions, setScreenHeadPositions] = useState<
    Record<number, { x: number; y: number }>
  >({});

  // Cycle Gizmo Mode: Escala (amarelo) -> Tamanho Y (ciano) -> Ângulo (roxo) -> Escala...
  const handleCycleGizmoMode = () => {
    setGizmoMode((prev) => {
      if (prev === 'scale') return 'sizeY';
      if (prev === 'sizeY') return 'angle';
      return 'scale';
    });
  };

  // Send message from chat
  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      user: 'Você (Luzenne)',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      text,
      time: 'agora',
      spotId: currentSpotId,
      isPlayer: true,
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Spawn 3D speech bubble above player's head
    const newBubble: SpeechBubbleItem = {
      id: `bubble-${Date.now()}`,
      text,
      spotId: currentSpotId,
      userName: 'Você',
      createdAt: Date.now(),
    };
    setSpeechBubbles((prev) => [...prev, newBubble]);
  };

  // Clean up speech bubbles after 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setSpeechBubbles((prev) => prev.filter((b) => now - b.createdAt < 7000));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div id="room-view-container" className="relative w-screen h-screen overflow-hidden bg-[#141416] select-none">
      {/* 3D WebGL Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <LoungeCanvas3D
          currentPose={selectedPose}
          transform={transform}
          spots={spots}
          currentSpotId={currentSpotId}
          onSelectSpot={setCurrentSpotId}
          cameraMode={cameraMode}
          equippedAccessories={equippedAccessories}
          onUpdateAvatarHeadScreenPos={setScreenHeadPositions}
          editorRoom={room.editorRoom}
          showSpotArrows={showSpotArrows}
          activeUserAvatar={activeUserAvatar}
        />
      </div>

      {/* Speech Bubbles and Floating Avatar Name Tag with Photo Anchored over 3D Avatars */}
      <SpeechBubbleOverlay
        bubbles={speechBubbles}
        screenPositions={screenHeadPositions}
        spots={spots}
        currentSpotId={currentSpotId}
        activeUserAvatar={activeUserAvatar}
        user={user}
      />

      {/* TOP BAR matching Reference 1:
          Cube Icon | Lounge 3/8 | Orbit camera dropdown | Exit */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Room Name & Cube Icon */}
          <div className="flex items-center gap-2.5 text-white drop-shadow-md">
            <div className="w-8 h-8 rounded-lg bg-[#ffd700]/15 border border-[#ffd700]/40 flex items-center justify-center text-[#ffd700]">
              <Box className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight flex items-baseline gap-2 text-white">
              <span>{room.name || 'Lounge'}</span>
              <span className="text-sm font-normal text-zinc-400">
                {room.occupation || '3/8'}
              </span>
            </h1>
          </div>

          {/* Playtest Mode Badge */}
          {room.isPlaytest && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <span>🧪 MODO TESTE INTERATIVO</span>
              <span className="text-[10px] text-emerald-200/80 font-normal hidden sm:inline">
                (Não publicado na vitrine)
              </span>
            </div>
          )}

          {/* Toggle for Blinking Down-Arrow above Spot Circles */}
          <button
            type="button"
            onClick={() => setShowSpotArrows((prev) => !prev)}
            title={showSpotArrows ? 'Ocultar setas piscando dos spots' : 'Exibir setas piscando dos spots'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border ${
              showSpotArrows
                ? 'bg-[#ffd700]/20 border-[#ffd700]/60 text-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,0.25)]'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            <ArrowDown className={`w-3.5 h-3.5 ${showSpotArrows ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">Setas nos Spots:</span>
            <span>{showSpotArrows ? 'ON' : 'OFF'}</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-[1px] bg-white/20" />

          {/* Orbit camera dropdown */}
          <div className="relative">
            <button
              id="camera-mode-dropdown-btn"
              type="button"
              onClick={() => setShowCameraMenu(!showCameraMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="capitalize">{cameraMode} camera</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {showCameraMenu && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-[#16171d]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl py-1 z-40">
                {(['orbit', 'frontal', 'closeup', 'topdown'] as const).map((mode) => (
                  <button
                    key={mode}
                    id={`cam-option-${mode}`}
                    type="button"
                    onClick={() => {
                      setCameraMode(mode);
                      setShowCameraMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      cameraMode === mode
                        ? 'text-[#ffd700] bg-white/5 font-semibold'
                        : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="capitalize">{mode}</span>
                    {cameraMode === mode && <span className="text-[10px]">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spot Switcher Pills */}
          <div className="hidden lg:flex items-center gap-1.5 bg-black/30 border border-white/10 px-2 py-1 rounded-lg backdrop-blur-md text-[11px] text-zinc-300">
            <span className="text-zinc-500 mr-1">Spot:</span>
            {spots.map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => setCurrentSpotId(spot.id)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  currentSpotId === spot.id
                    ? 'bg-[#ffd700] text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Puff {spot.id}
              </button>
            ))}
          </div>
        </div>

        {/* Exit Button to return to Hall/Lobby or Editor */}
        <div className="pointer-events-auto">
          <button
            id="exit-room-btn"
            type="button"
            onClick={onExitToLobby}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-colors cursor-pointer text-xs font-semibold ${
              room.isPlaytest
                ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/50 text-emerald-300 hover:text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-black/40 hover:bg-red-500/20 border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-red-300'
            }`}
            title={room.isPlaytest ? 'Voltar para o Modo Criador' : 'Sair da sala e voltar ao Hall de Portais'}
          >
            <LogOut className={`w-4 h-4 ${room.isPlaytest ? 'rotate-180' : ''}`} />
            <span>{room.isPlaytest ? 'Voltar ao Editor' : 'Voltar à Vitrine'}</span>
          </button>
        </div>
      </header>

      {/* TOP-LEFT HUD matching Reference 1:
          1) 3D Gizmo with center click cycling mode and color
          2) 3x3 Pose Grid with miniature previews and GLB switch */}
      <div className="absolute top-20 left-6 z-30 flex flex-col gap-4 pointer-events-auto">
        <GizmoWidget
          mode={gizmoMode}
          onCycleMode={handleCycleGizmoMode}
          transform={transform}
          onChangeTransform={setTransform}
        />

        <PoseGrid
          poses={poses}
          selectedPoseId={selectedPose.id}
          onSelectPose={setSelectedPose}
          activeUserAvatar={activeUserAvatar}
        />
      </div>

      {/* RIGHT HUD matching Reference 1:
          Dark Glass Chat Panel with messages and input */}
      <div className="absolute top-20 right-6 z-30 pointer-events-auto">
        <GlassChat
          roomName={room.name || 'Lounge'}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};
