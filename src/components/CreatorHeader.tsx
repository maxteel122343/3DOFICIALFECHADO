import React from 'react';
import {
  Box,
  Upload,
  Plus,
  Eye,
  EyeOff,
  User,
  Sliders,
  CheckCircle2,
  MapPin,
  Lock,
  Unlock,
  LogOut,
} from 'lucide-react';
import { RoomEditorState, CreatorUser } from '../types';

interface CreatorHeaderProps {
  rooms: RoomEditorState[];
  activeRoomId: string;
  onSelectRoom: (id: string) => void;
  onAddNewRoom: () => void;
  onOpenBoundaryModal: () => void;
  onPublishRoom: () => void;
  onOpenAuthModal: () => void;
  user: CreatorUser | null;
  isAvatarMode: boolean;
  onToggleAvatarMode: () => void;
  showBoundaryGhost: boolean;
  onToggleBoundaryGhost: () => void;
  showSpots: boolean;
  onToggleShowSpots: () => void;
  lockSpots: boolean;
  onToggleLockSpots: () => void;
  onExitEditor?: () => void;
}

export const CreatorHeader: React.FC<CreatorHeaderProps> = ({
  rooms,
  activeRoomId,
  onSelectRoom,
  onAddNewRoom,
  onOpenBoundaryModal,
  onPublishRoom,
  onOpenAuthModal,
  user,
  isAvatarMode,
  onToggleAvatarMode,
  showBoundaryGhost,
  onToggleBoundaryGhost,
  showSpots,
  onToggleShowSpots,
  lockSpots,
  onToggleLockSpots,
  onExitEditor,
}) => {
  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

  return (
    <header className="w-full bg-[#121317]/95 border-b border-[#d4af37]/30 px-4 py-2.5 flex items-center justify-between text-[#e8d5b5] z-30 select-none font-sans shadow-md">
      {/* Left side: Brand + Room tabs + Active room indicator */}
      <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar">
        {/* Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Box className="w-4 h-4 text-[#d4af37] stroke-[1.5]" />
          <h1 className="text-xs md:text-sm font-semibold tracking-wide text-[#e8d5b5] whitespace-nowrap">
            MODO CRIADOR — EDITAR ROOM
          </h1>
        </div>

        <div className="h-4 w-[1px] bg-[#d4af37]/25 hidden sm:block flex-shrink-0" />

        {/* Room Tabs: Room A | Room B | + Nova room */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {rooms.map((room, idx) => {
            const isActive = room.id === activeRoomId;
            const letter = String.fromCharCode(65 + idx);
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelectRoom(room.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer border ${
                  isActive
                    ? 'border-[#d4af37] bg-[#d4af37] text-black shadow-sm'
                    : 'border-[#d4af37]/30 bg-black/40 text-[#e8d5b5]/80 hover:border-[#d4af37] hover:text-[#d4af37]'
                }`}
              >
                Room {letter}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onAddNewRoom}
            className="px-2 py-1 text-xs font-semibold rounded border border-[#d4af37]/30 hover:border-[#d4af37] bg-black/40 text-[#d4af37] hover:bg-[#d4af37]/15 transition-all cursor-pointer flex items-center gap-1"
            title="Criar nova room"
          >
            <Plus className="w-3 h-3" />
            <span>Nova room</span>
          </button>
        </div>

        {/* Active room name indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#d4af37]/90 pl-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
          <span className="font-medium text-[#e8d5b5] truncate max-w-[150px]">
            {activeRoom.name}
          </span>
        </div>
      </div>

      {/* Right side: Toggle Avatar | Olho | Definir Limite | Luzenne | Publicar */}
      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
        {/* Toggle MODO AVATAR */}
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-[#d4af37]/80 hidden sm:inline" />
          <span className="text-[11px] font-medium text-[#d4af37] hidden md:inline">
            Toggle Avatar
          </span>
          <button
            type="button"
            onClick={onToggleAvatarMode}
            className={`relative inline-flex h-4.5 w-9 items-center rounded-full transition-colors cursor-pointer p-0.5 border ${
              isAvatarMode
                ? 'bg-[#d4af37]/40 border-[#d4af37]'
                : 'bg-[#20222a] border-[#424552]'
            }`}
            title={isAvatarMode ? 'Avatar ON (teleporta ao clicar nos spots)' : 'Avatar OFF (modo edição)'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#ffd700] transition-transform ${
                isAvatarMode ? 'translate-x-4.5' : 'translate-x-0 bg-[#8a8e9e]'
              }`}
            />
          </button>
          <span className="text-[11px] font-semibold text-[#e8d5b5]">
            {isAvatarMode ? '[Avatar ON]' : '[Avatar OFF]'}
          </span>
        </div>

        {/* Ícone OLHO: liga/desliga ghost do Limite jogável */}
        <button
          type="button"
          onClick={onToggleBoundaryGhost}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
            showBoundaryGhost
              ? 'border-[#d4af37] text-[#ffd700] bg-[#d4af37]/10'
              : 'border-transparent text-[#d4af37]/60 hover:text-[#d4af37]'
          }`}
          title="Mostrar/Ocultar ghost do limite jogável"
        >
          {showBoundaryGhost ? (
            <>
              <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>ON</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-[#d4af37]/70" />
              <span>OFF</span>
            </>
          )}
        </button>

        {/* Toggle SPOTS VISÍVEIS / INVISÍVEIS (para focar 100% nos objetos 3D) */}
        <button
          type="button"
          onClick={onToggleShowSpots}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
            showSpots
              ? 'border-[#d4af37]/60 text-[#ffd700] bg-[#d4af37]/10'
              : 'border-red-500/40 text-red-400 bg-red-950/20'
          }`}
          title={showSpots ? 'Ocultar spots da cena para focar só nos objetos 3D' : 'Mostrar spots na cena 3D'}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Spots:</span>
          <span>{showSpots ? 'Visíveis' : 'Ocultos'}</span>
        </button>

        {/* Toggle TRAVAR CONTROLE DE SPOTS (desativa controle para cliques selecionarem apenas objetos 3D) */}
        <button
          type="button"
          onClick={onToggleLockSpots}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
            lockSpots
              ? 'border-[#ffd700] text-[#ffd700] bg-[#d4af37]/20 shadow-[0_0_8px_rgba(212,175,55,0.3)]'
              : 'border-[#d4af37]/30 text-[#d4af37]/70 hover:text-[#d4af37]'
          }`}
          title={lockSpots ? 'Controle de spots desativado: cliques afetam apenas objetos 3D' : 'Spots interativos (clique para selecionar/mover)'}
        >
          {lockSpots ? <Lock className="w-3.5 h-3.5 text-[#ffd700]" /> : <Unlock className="w-3.5 h-3.5" />}
          <span className="hidden lg:inline">{lockSpots ? 'Spots Travados' : 'Spots Livres'}</span>
        </button>

        {/* Botão DEFINIR LIMITE matching user screenshot */}
        <button
          type="button"
          onClick={onOpenBoundaryModal}
          className="px-2.5 py-1 rounded border border-[#d4af37]/50 hover:border-[#d4af37] bg-black/40 text-xs font-medium text-[#e8d5b5] hover:text-[#ffd700] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Sliders className="w-3 h-3 text-[#d4af37]" />
          <span>Definir Limite</span>
        </button>

        {/* User Profile Badge (Supabase auth trigger) */}
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="px-2.5 py-1 rounded border border-[#d4af37]/30 hover:border-[#d4af37] bg-black/40 text-xs font-medium text-[#e8d5b5] transition-all flex items-center gap-1.5 cursor-pointer"
          title="Gerenciar Conta / Supabase"
        >
          <span className="text-xs">👤</span>
          <span className="hidden sm:inline">{user?.displayName || 'Luzenne'}</span>
        </button>

        {/* PUBLICAR NA VITRINE matching user screenshot */}
        <button
          type="button"
          onClick={onPublishRoom}
          className="px-3 py-1 rounded border border-[#d4af37] hover:border-[#ffd700] bg-[#d4af37]/10 hover:bg-[#d4af37]/25 text-xs font-semibold text-[#ffd700] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
          <span className="uppercase tracking-wider text-[11px]">Publicar na vitrine</span>
        </button>

        {/* SAIR DO MODO EDITOR (Retorna para a tela de Rooms / Lobby) */}
        {onExitEditor && (
          <button
            type="button"
            onClick={onExitEditor}
            className="px-3 py-1 rounded border border-amber-500/70 hover:border-amber-400 bg-amber-950/60 hover:bg-amber-900/80 text-xs font-semibold text-amber-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Sair do modo editor e voltar para a tela de rooms"
          >
            <LogOut className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Sair do Editor</span>
            <span className="sm:hidden">Sair</span>
          </button>
        )}
      </div>
    </header>
  );
};
