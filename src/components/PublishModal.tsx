import React from 'react';
import { CheckCircle2, X, Box, MapPin } from 'lucide-react';
import { RoomEditorState } from '../types';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomEditorState;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  room,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-[#121317] border border-[#d4af37]/60 rounded-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.9)] text-[#e8d5b5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-sm font-semibold tracking-wider text-[#e8d5b5]">
              Room Publicada na Vitrine
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#d4af37]/60 hover:text-[#d4af37] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 16:9 Vitrine Card Preview */}
        <div className="my-5">
          <div className="relative aspect-video w-full rounded-lg border border-[#d4af37]/50 overflow-hidden bg-[#18191f] p-4 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between z-10">
              <span className="px-2 py-0.5 rounded bg-black/80 border border-[#d4af37]/40 text-[10px] font-semibold tracking-wider text-[#d4af37]">
                Vitrine 3D · Ativa
              </span>
              <span className="text-[11px] text-[#d4af37]/70 font-mono">
                0/8 Visitantes
              </span>
            </div>

            {/* Visual Center */}
            <div className="text-center z-10">
              <h3 className="text-base font-semibold text-[#e8d5b5] tracking-wide mb-1">
                {room.name}
              </h3>
              <p className="text-xs text-[#d4af37]/70">
                Limite: {room.boundary.x}m × {room.boundary.y}m × {room.boundary.z}m · {room.spots.length} spots ativos
              </p>
            </div>

            {/* Bottom info */}
            <div className="flex items-center justify-between z-10 border-t border-[#d4af37]/20 pt-2 text-[11px]">
              <div className="flex items-center gap-3 text-[#d4af37]/80">
                <span className="flex items-center gap-1">
                  <Box className="w-3 h-3 text-[#d4af37]" /> Cenário OK
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#d4af37]" /> {room.spots.length} Spots
                </span>
              </div>
              <span className="text-[#d4af37] font-medium">Modo Criador</span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded border border-[#d4af37]/80 hover:border-[#ffd700] bg-transparent hover:bg-[#d4af37]/15 text-[#e8d5b5] hover:text-[#ffd700] text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
          >
            Continuar Editando
          </button>
        </div>
      </div>
    </div>
  );
};
