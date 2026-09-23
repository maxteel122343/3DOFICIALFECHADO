import React, { useState } from 'react';
import { CheckCircle2, X, Box, MapPin, Sparkles, Tag, Coins } from 'lucide-react';
import { RoomEditorState, CreatorUser } from '../types';
import { persistShowcaseRoom } from '../lib/database';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomEditorState;
  user?: CreatorUser | null;
  onGoToVitrine?: () => void;
  onPlaytest?: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  room,
  user,
  onGoToVitrine,
  onPlaytest,
}) => {
  const [publishMode, setPublishMode] = useState<'simples' | 'avancado'>('simples');
  const [roomTitle, setRoomTitle] = useState(room.name || 'Minha Sala 3D');
  const [roomHashtags, setRoomHashtags] = useState('#sala, #vitrine3d, #luzenne');
  const [roomPrice, setRoomPrice] = useState(0);
  const [hasSaved, setHasSaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveAndPublish = async () => {
    const tags = roomHashtags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await persistShowcaseRoom(
      {
        ...room,
        name: roomTitle,
      },
      user || null,
      {
        publishMode,
        price: publishMode === 'simples' ? 0 : Number(roomPrice) || 0,
        hashtags: tags.length > 0 ? tags : ['#sala', '#vitrine3d'],
      }
    );

    setHasSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#121317] border border-[#d4af37]/60 rounded-2xl p-6 shadow-[0_16px_50px_rgba(0,0,0,0.95)] text-[#e8d5b5] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#ffd700]" />
            <h2 className="text-sm font-extrabold tracking-wider text-[#e8d5b5] uppercase">
              Publicar Sala na Vitrine
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#d4af37]/60 hover:text-[#ffd700] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-black/60 rounded-xl border border-[#d4af37]/30">
          <button
            type="button"
            onClick={() => setPublishMode('simples')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              publishMode === 'simples'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>⚡ Modo Simples</span>
            <span className="text-[10px] opacity-75">(1 Clique)</span>
          </button>

          <button
            type="button"
            onClick={() => setPublishMode('avancado')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              publishMode === 'avancado'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>⚙️ Modo Avançado</span>
            <span className="text-[10px] opacity-75">(Customizar)</span>
          </button>
        </div>

        {/* 16:9 Vitrine Card Preview */}
        <div className="my-4">
          <div className="relative aspect-video w-full rounded-xl border border-[#d4af37]/50 overflow-hidden bg-[#18191f] p-4 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between z-10">
              <span className="px-2.5 py-0.5 rounded-full bg-black/80 border border-[#d4af37]/50 text-[10px] font-bold tracking-wider text-[#ffd700]">
                Vitrine 3D · {publishMode === 'simples' ? 'Modo Simples' : 'Modo Avançado'}
              </span>
              <span className="text-[11px] text-[#ffd700]/80 font-mono">
                {roomPrice > 0 ? `🪙 ${roomPrice} moedas` : 'Acesso Grátis'}
              </span>
            </div>

            {/* Visual Center */}
            <div className="text-center z-10">
              <h3 className="text-base font-bold text-[#e8d5b5] tracking-wide mb-1">
                {roomTitle}
              </h3>
              <p className="text-xs text-[#d4af37]/80">
                Limite: {room.boundary.x}m × {room.boundary.y}m × {room.boundary.z}m · {room.spots.length} spots ativos
              </p>
            </div>

            {/* Bottom info */}
            <div className="flex items-center justify-between z-10 border-t border-[#d4af37]/20 pt-2 text-[11px]">
              <div className="flex items-center gap-3 text-[#d4af37]/90">
                <span className="flex items-center gap-1">
                  <Box className="w-3 h-3 text-[#ffd700]" /> {room.placedObjects.length} Móveis/Objetos
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#ffd700]" /> {room.spots.length} Spots
                </span>
              </div>
              <span className="text-[#ffd700] font-bold">
                {hasSaved ? '✓ Persistido' : 'Pronto'}
              </span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />
          </div>
        </div>

        {/* Form Inputs based on Mode */}
        {publishMode === 'avancado' && (
          <div className="space-y-3 mb-4 animate-fade-in text-xs">
            <div>
              <label className="block font-semibold text-[#e8d5b5] mb-1">
                Nome da Sala
              </label>
              <input
                type="text"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                className="w-full bg-[#1b1c24] border border-[#d4af37]/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#ffd700]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#e8d5b5] mb-1">
                Hashtags (separadas por vírgula)
              </label>
              <input
                type="text"
                value={roomHashtags}
                onChange={(e) => setRoomHashtags(e.target.value)}
                placeholder="#sala, #vitrine3d, #lounge"
                className="w-full bg-[#1b1c24] border border-[#d4af37]/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#ffd700]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[#e8d5b5]">
                  Preço de Entrada (Moedas 🪙)
                </label>
                <button
                  type="button"
                  onClick={() => setRoomPrice(0)}
                  className="text-[10px] text-[#ffd700] hover:underline cursor-pointer"
                >
                  Entrada Grátis
                </button>
              </div>
              <input
                type="number"
                min="0"
                step="50"
                value={roomPrice}
                onChange={(e) => setRoomPrice(Number(e.target.value))}
                className="w-full bg-[#1b1c24] border border-[#d4af37]/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#ffd700]"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-[#d4af37]/20">
          <button
            type="button"
            onClick={async () => {
              await handleSaveAndPublish();
              if (onGoToVitrine) {
                onClose();
                onGoToVitrine();
              }
            }}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#ffd700] hover:from-[#e5bd38] hover:to-[#ffe033] text-black text-xs font-black tracking-wider uppercase hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {publishMode === 'simples' ? 'Publicar na Vitrine' : 'Salvar & Ver na Vitrine'}
            </span>
          </button>

          {onPlaytest && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onPlaytest();
              }}
              className="flex-1 py-2.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/20 hover:bg-[#d4af37]/35 text-[#ffd700] text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer text-center"
            >
              Testar Agora
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#d4af37]/40 hover:border-[#ffd700] bg-transparent hover:bg-[#d4af37]/10 text-[#e8d5b5] hover:text-[#ffd700] text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer text-center"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
