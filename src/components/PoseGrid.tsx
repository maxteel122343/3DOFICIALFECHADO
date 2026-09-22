import React from 'react';
import { AvatarPose } from '../types';

interface PoseGridProps {
  poses: AvatarPose[];
  selectedPoseId: string;
  onSelectPose: (pose: AvatarPose) => void;
}

export const PoseGrid: React.FC<PoseGridProps> = ({
  poses,
  selectedPoseId,
  onSelectPose,
}) => {
  const selectedPose = poses.find((p) => p.id === selectedPoseId) || poses[1];

  return (
    <div className="flex flex-col items-start gap-2 select-none">
      {/* 3x3 Grid of Poses */}
      <div
        id="pose-grid"
        className="grid grid-cols-3 gap-2 p-1.5 bg-[#141518]/60 backdrop-blur-sm rounded-2xl border border-white/5 shadow-xl"
      >
        {poses.slice(0, 9).map((pose, index) => {
          const isSelected = pose.id === selectedPoseId;

          return (
            <button
              key={pose.id}
              id={`pose-btn-${pose.id}`}
              type="button"
              onClick={() => onSelectPose(pose)}
              title={`${pose.name} (${pose.glbKey}) - Clique para trocar GLB`}
              className={`relative w-12 h-12 rounded-xl transition-all duration-200 overflow-hidden flex items-center justify-center cursor-pointer ${
                isSelected
                  ? 'bg-[#22242a] ring-2 ring-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,0.35)] scale-105'
                  : 'bg-[#18191d]/80 hover:bg-[#202227] border border-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Silhouette / Avatar Preview */}
              {isSelected ? (
                // Selected avatar preview with color and detail matching Reference 1
                <div className="w-full h-full flex items-center justify-center p-1 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="text-xl filter drop-shadow-md select-none transform hover:scale-110 transition-transform">
                    {pose.emoji || '✨'}
                  </div>
                  {/* Mini emoji badge at corner matching Reference 1 (tile 2) */}
                  <span className="absolute bottom-0.5 left-1 text-[11px] leading-none">
                    {pose.emoji}
                  </span>
                </div>
              ) : (
                // Dark monochrome silhouette for non-active poses matching Reference 1
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 hover:text-zinc-300">
                  <svg
                    className="w-6 h-6 opacity-60 fill-current"
                    viewBox="0 0 24 24"
                  >
                    {/* Stylized seated/standing silhouette icon based on pose */}
                    {index % 3 === 0 && (
                      <path d="M12 2a2 2 0 100 4 2 2 0 000-4zm-3 7c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h1v5c0 .55.45 1 1 1s1-.45 1-1v-5h2v5c0 .55.45 1 1 1s1-.45 1-1v-5h1c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1H9z" />
                    )}
                    {index % 3 === 1 && (
                      <path d="M12 2a2 2 0 100 4 2 2 0 000-4zm-4 6c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h1v4h6v-4h1c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1H8zm2 10l-2 2h8l-2-2h-4z" />
                    )}
                    {index % 3 === 2 && (
                      <path d="M12 2a2 2 0 100 4 2 2 0 000-4zm-3.5 6a1 1 0 00-.9 1.45l2.4 4.8V19a1 1 0 102 0v-4.75l2.4-4.8A1 1 0 0015.5 8h-7z" />
                    )}
                  </svg>
                  <span className="text-[7px] font-mono text-zinc-500 uppercase mt-0.5">
                    {(pose.glbKey || pose.fileName || '').replace('avatar_pose_', '').replace('.glb', '')}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Pose Label below the grid, matching Reference 1:
          "Rindo" in warm gold font */}
      <div className="px-1 text-sm font-semibold tracking-wide text-[#ffd700] drop-shadow-sm flex items-center gap-1.5">
        <span>{selectedPose.label}</span>
        <span className="text-xs text-zinc-500 font-normal">({selectedPose.glbKey})</span>
      </div>
    </div>
  );
};
