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
  Gamepad2,
  Layers,
  Download,
  Save,
} from 'lucide-react';
import { RoomEditorState, CreatorUser } from '../types';

interface CreatorHeaderProps {
  rooms: RoomEditorState[];
  activeRoomId: string;
  onSelectRoom: (id: string) => void;
  onAddNewRoom: () => void;
  onOpenBoundaryModal: () => void;
  onPublishRoom: () => void;
  onOpenPublicationsModal?: () => void;
  onOpenProjectModal?: () => void;
  onPlaytestRoom?: () => void;
  onOpenAuthModal: () => void;
  user: CreatorUser | null;
  onLogout?: () => void;
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
  onOpenPublicationsModal,
  onOpenProjectModal,
  onPlaytestRoom,
  onOpenAuthModal,
  user,
  onLogout,
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
    <header className="w-full bg-[#121317]/95 border-b border-[#d4af37]/40 px-3 md:px-4 py-2.5 flex items-center justify-between text-[#e8d5b5] z-30 select-none font-sans shadow-md gap-2">
      {/* Left side: Sair do Editor (Priority) + Brand + Room tabs */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Sair do Editor Button (Always visible on the left bar so user NEVER gets pushed off screen!) */}
        {onExitEditor && (
          <button
            type="button"
            onClick={onExitEditor}
            className="px-3 py-1.5 rounded-lg border-2 border-amber-400 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 flex-shrink-0"
            title="Sair do modo editor e voltar para a tela de rooms / Lobby"
          >
            <LogOut className="w-4 h-4 text-black stroke-[3]" />
            <span className="font-extrabold uppercase tracking-wide">Sair do Editor</span>
          </button>
        )}

        {/* Brand */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Box className="w-4 h-4 text-[#ffd700] stroke-[2]" />
          <h1 className="text-xs md:text-sm font-bold tracking-wide text-white whitespace-nowrap">
            MODO CRIADOR
          </h1>
        </div>

        <div className="h-4 w-[1px] bg-[#d4af37]/40 hidden md:block flex-shrink-0" />

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
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                  isActive
                    ? 'border-[#ffd700] bg-[#ffd700] text-black shadow-sm'
                    : 'border-[#d4af37]/40 bg-black/60 text-[#e8d5b5] hover:border-[#ffd700] hover:text-[#ffd700]'
                }`}
              >
                Room {letter}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onAddNewRoom}
            className="px-2 py-1 text-xs font-bold rounded-lg border border-[#d4af37]/40 hover:border-[#ffd700] bg-black/50 text-[#ffd700] hover:bg-[#d4af37]/20 transition-all cursor-pointer flex items-center gap-1"
            title="Criar nova room"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Nova room</span>
          </button>
        </div>

        {/* Active room name indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-amber-300 font-bold pl-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate max-w-[130px]">
            {activeRoom.name}
          </span>
        </div>
      </div>

      {/* Right side: Controls with horizontal scroll safety */}
      <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar py-0.5">
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="px-2.5 py-1 rounded border border-[#d4af37]/30 hover:border-[#d4af37] bg-black/40 text-xs font-medium text-[#e8d5b5] transition-all flex items-center gap-1.5 cursor-pointer"
            title="Gerenciar Conta / Supabase"
          >
            <span className="text-xs">👤</span>
            <span className="hidden sm:inline">{user?.displayName || 'Luzenne'}</span>
          </button>

          {user && !user.isGuest && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1 rounded border border-red-500/40 hover:border-red-400 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white transition-all cursor-pointer"
              title="Sair da Conta (Logout)"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botão TESTAR ROOM INTERATIVA (modo teste sem publicar na vitrine) */}
        {onPlaytestRoom && (
          <button
            type="button"
            onClick={onPlaytestRoom}
            className="px-3 py-1 rounded border border-emerald-500/70 hover:border-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/70 text-xs font-semibold text-emerald-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            title="Testar a room interativamente em tempo real sem publicar na vitrine"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Testar Room</span>
            <span className="sm:hidden">Testar</span>
          </button>
        )}

        {/* SALVAR & RESTAURAR PROJETO (.json / .3dproj) */}
        {onOpenProjectModal && (
          <button
            type="button"
            onClick={onOpenProjectModal}
            className="px-2.5 py-1 rounded border border-[#ffd700]/70 hover:border-[#ffd700] bg-gradient-to-r from-[#d4af37]/20 to-[#ffd700]/20 hover:from-[#d4af37]/35 hover:to-[#ffd700]/35 text-xs font-bold text-[#ffd700] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Salvar o projeto em arquivo (.json) ou restaurar exatamente de onde parou"
          >
            <Save className="w-3.5 h-3.5 text-[#ffd700]" />
            <span className="hidden sm:inline">Salvar / Restaurar</span>
            <span className="sm:hidden">Projeto</span>
          </button>
        )}

        {/* MINHAS PUBLICAÇÕES */}
        {onOpenPublicationsModal && (
          <button
            type="button"
            onClick={onOpenPublicationsModal}
            className="px-2.5 py-1 rounded-lg border border-[#ffd700]/70 hover:border-[#ffd700] bg-black/60 hover:bg-[#d4af37]/20 text-xs font-bold text-amber-200 hover:text-[#ffd700] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm flex-shrink-0"
            title="Ver e gerenciar salas e itens publicados na vitrine ou editar novamente"
          >
            <Layers className="w-3.5 h-3.5 text-[#ffd700]" />
            <span className="hidden sm:inline">Minhas Publicações</span>
            <span className="sm:hidden">Publicações</span>
          </button>
        )}

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
