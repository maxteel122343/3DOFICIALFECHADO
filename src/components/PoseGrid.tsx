import React, { useState } from 'react';
import { AvatarPose, StoreAvatar } from '../types';
import { Check, Sparkles, ChevronDown, ChevronUp, Layers, Grid } from 'lucide-react';

interface PoseGridProps {
  poses: AvatarPose[];
  selectedPoseId: string;
  onSelectPose: (pose: AvatarPose) => void;
  activeUserAvatar?: StoreAvatar | null;
}

export const PoseGrid: React.FC<PoseGridProps> = ({
  poses,
  selectedPoseId,
  onSelectPose,
  activeUserAvatar,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');

  const selectedPose = poses.find((p) => p.id === selectedPoseId) || poses[0] || {
    id: 'pose_stand',
    name: 'Noite de Gala',
    label: 'Noite de Gala',
  };

  const defaultAvatarThumb =
    activeUserAvatar?.thumb ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  return (
    <div className="flex flex-col items-start gap-2 select-none w-72 md:w-80">
      {/* Header bar matching the luxury aesthetic */}
      <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#121318]/90 border border-white/10 backdrop-blur-md shadow-xl text-zinc-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#ffd700]" />
          <span className="text-xs font-serif font-bold text-white tracking-wide">
            Poses do Avatar
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">({poses.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View Mode Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'cards' ? 'compact' : 'cards')}
            title={viewMode === 'cards' ? 'Alternar para modo compacto' : 'Alternar para modo vitrine'}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {viewMode === 'cards' ? (
              <Grid className="w-3.5 h-3.5" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-[#ffd700]" />
            )}
          </button>

          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expandir painel de poses' : 'Recolher painel de poses'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-[#ffd700]" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="w-full p-2.5 bg-[#101115]/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl animate-fade-in max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          {/* Mode 1: Cards View (Identical to Store Card in Image 1, without store info) */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-2 gap-2.5">
              {poses.map((pose) => {
                const isSelected = pose.id === selectedPoseId;
                const poseThumb = pose.thumbnailUrl || defaultAvatarThumb;

                return (
                  <div
                    key={pose.id}
                    id={`pose-card-${pose.id}`}
                    onClick={() => onSelectPose(pose)}
                    className={`relative rounded-xl border p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden group ${
                      isSelected
                        ? 'bg-[#181920] border-[#ffd700] ring-1 ring-[#ffd700]/50 shadow-[0_0_16px_rgba(255,215,0,0.3)] scale-[1.02]'
                        : 'bg-[#121318]/90 border-white/5 hover:border-white/20 hover:bg-[#16171e]'
                    }`}
                  >
                    {/* Top Right Checkmark (Identical to Image 1) */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-[#ffd700] flex items-center justify-center text-black shadow-md animate-scale-in">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    {/* 3D Avatar Image (Identical to Store Card) */}
                    <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-black/50 mb-2">
                      <img
                        src={poseThumb}
                        alt={pose.name}
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    </div>

                    {/* Pose Name (Identical to Image 1: Noite de Gala, Elegância Silenciosa, etc.) */}
                    <div className="mb-2 text-center">
                      <h4 className="text-xs font-serif font-bold text-zinc-100 truncate group-hover:text-white">
                        {pose.name || pose.label}
                      </h4>
                    </div>

                    {/* Action Button (Aplicar / Ativa - without price or cart) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPose(pose);
                      }}
                      className={`w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-[#ffd700] text-black font-bold shadow-[0_0_10px_rgba(255,215,0,0.3)]'
                          : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Aplicado</span>
                        </>
                      ) : (
                        <span>Aplicar</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mode 2: Compact Grid (3 Columns) with avatar thumb and checkmark */
            <div className="grid grid-cols-3 gap-2">
              {poses.map((pose) => {
                const isSelected = pose.id === selectedPoseId;
                const poseThumb = pose.thumbnailUrl || defaultAvatarThumb;

                return (
                  <button
                    key={pose.id}
                    id={`pose-btn-compact-${pose.id}`}
                    type="button"
                    onClick={() => onSelectPose(pose)}
                    title={pose.name}
                    className={`relative w-full aspect-square rounded-xl transition-all duration-200 overflow-hidden flex flex-col items-center justify-center cursor-pointer border ${
                      isSelected
                        ? 'bg-[#181920] border-[#ffd700] ring-1 ring-[#ffd700]/50 shadow-[0_0_12px_rgba(255,215,0,0.3)] scale-105'
                        : 'bg-[#121318]/90 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={poseThumb}
                      alt={pose.name}
                      className="w-full h-full object-cover object-top"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#ffd700] text-black flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}

                    <span className="absolute bottom-1 inset-x-0 text-[10px] font-medium text-white truncate text-center px-1 drop-shadow-md">
                      {pose.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Active Pose Indicator Pill below */}
      <div className="px-2 py-1 rounded-lg bg-black/40 border border-white/5 text-xs text-[#ffd700] flex items-center gap-1.5 font-medium">
        <Check className="w-3.5 h-3.5 text-[#ffd700]" />
        <span>Pose ativa:</span>
        <span className="font-bold text-white">{selectedPose.name || selectedPose.label}</span>
      </div>
    </div>
  );
};
