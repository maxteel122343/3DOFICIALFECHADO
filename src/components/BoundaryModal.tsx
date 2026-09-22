import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Lightbulb, X, Sliders } from 'lucide-react';
import { PlayableBoundary } from '../types';

interface BoundaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  boundary: PlayableBoundary;
  onSaveBoundary: (boundary: PlayableBoundary) => void;
  roomName: string;
}

export const BoundaryModal: React.FC<BoundaryModalProps> = ({
  isOpen,
  onClose,
  boundary,
  onSaveBoundary,
  roomName,
}) => {
  const [x, setX] = useState<number>(boundary.x || 5.0);
  const [y, setY] = useState<number>(boundary.y || 2.8);
  const [z, setZ] = useState<number>(boundary.z || 6.5);

  if (!isOpen) return null;

  const handleReset = () => {
    setX(5.0);
    setY(2.8);
    setZ(6.5);
  };

  const handleConfirm = () => {
    onSaveBoundary({
      x,
      y,
      z,
      isConfirmed: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl bg-[#121317] border border-[#d4af37]/60 rounded-xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.9)] text-[#e8d5b5] flex flex-col justify-between max-h-[92vh]">
        {/* TOP BAR */}
        <header className="flex items-center justify-between pb-4 border-b border-[#d4af37]/25">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#d4af37]" />
            <h1 className="text-sm md:text-base font-bold tracking-wide text-[#e8d5b5] uppercase">
              MODO CRIADOR — DEFINIR LIMITE JOGÁVEL
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded border border-[#d4af37]/40 text-xs font-semibold text-[#d4af37] bg-black/40">
              {roomName.split('·')[0].trim() || 'Room A'}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="px-3.5 py-1 rounded border border-[#d4af37] bg-[#d4af37] hover:bg-[#e2bd44] text-black text-xs font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>Confirmar limite</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#d4af37]/60 hover:text-[#d4af37] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* MAIN BODY: Sliders + 3D Isometric Wireframe Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-5 items-center">
          {/* Left Panel: Sliders */}
          <div className="border border-[#d4af37]/30 rounded-xl p-4 bg-black/40 flex flex-col justify-between h-full space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider mb-3">
                Dimensões do Volume (m)
              </h2>

              {/* Slider X */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#e8d5b5] mb-1">
                  <span>Largura (X)</span>
                  <span className="font-mono text-[#d4af37] font-semibold">{x.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="12.0"
                  step="0.1"
                  value={x}
                  onChange={(e) => setX(parseFloat(e.target.value))}
                  className="w-full accent-[#d4af37] cursor-pointer"
                />
              </div>

              {/* Slider Y */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#e8d5b5] mb-1">
                  <span>Altura (Y)</span>
                  <span className="font-mono text-[#d4af37] font-semibold">{y.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="6.0"
                  step="0.1"
                  value={y}
                  onChange={(e) => setY(parseFloat(e.target.value))}
                  className="w-full accent-[#d4af37] cursor-pointer"
                />
              </div>

              {/* Slider Z */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#e8d5b5] mb-1">
                  <span>Profundidade (Z)</span>
                  <span className="font-mono text-[#d4af37] font-semibold">{z.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="12.0"
                  step="0.1"
                  value={z}
                  onChange={(e) => setZ(parseFloat(e.target.value))}
                  className="w-full accent-[#d4af37] cursor-pointer"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-1.5 rounded border border-[#d4af37]/40 hover:border-[#d4af37] text-xs font-semibold text-[#d4af37] hover:bg-[#d4af37]/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetar caixa</span>
            </button>
          </div>

          {/* Right: Isometric Wireframe Graphic */}
          <div className="md:col-span-2 relative aspect-[16/10] bg-[#16181f] border border-[#d4af37]/30 rounded-xl overflow-hidden flex items-center justify-center p-6 shadow-inner">
            <svg
              viewBox="0 0 400 250"
              className="w-full h-full max-w-sm drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]"
            >
              {/* Floor boundary plane */}
              <polygon
                points="200,80 330,130 200,190 70,130"
                fill="rgba(212,175,55,0.08)"
                stroke="#d4af37"
                strokeWidth="1.5"
              />

              {/* Top boundary plane */}
              <polygon
                points="200,30 330,80 200,140 70,80"
                fill="rgba(212,175,55,0.03)"
                stroke="#d4af37"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {/* Vertical Corner Edges */}
              <line x1="70" y1="130" x2="70" y2="80" stroke="#d4af37" strokeWidth="1.5" />
              <line x1="330" y1="130" x2="330" y2="80" stroke="#d4af37" strokeWidth="1.5" />
              <line x1="200" y1="190" x2="200" y2="140" stroke="#d4af37" strokeWidth="2" />
              <line x1="200" y1="80" x2="200" y2="30" stroke="#d4af37" strokeWidth="1.5" strokeDasharray="3 3" />

              {/* Dimension labels */}
              <text x="110" y="170" fill="#d4af37" fontSize="10" fontFamily="sans-serif">
                X: {x.toFixed(1)}m
              </text>
              <text x="270" y="170" fill="#d4af37" fontSize="10" fontFamily="sans-serif">
                Z: {z.toFixed(1)}m
              </text>
              <text x="210" y="165" fill="#ffd700" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                Y: {y.toFixed(1)}m
              </text>

              {/* Corner points */}
              <circle cx="200" cy="190" r="3.5" fill="#ffd700" />
              <circle cx="70" cy="130" r="3" fill="#d4af37" />
              <circle cx="330" cy="130" r="3" fill="#d4af37" />
              <circle cx="200" cy="80" r="3" fill="#d4af37" />
            </svg>

            <span className="absolute bottom-3 right-4 text-[10px] font-mono text-[#d4af37]/70">
              Volume: {(x * y * z).toFixed(1)}m³
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="pt-3 border-t border-[#d4af37]/25 flex items-center justify-between text-xs text-[#d4af37]/90">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Arraste os limites da caixa. Visitantes só interagem dentro deste volume.</span>
          </div>
          <span className="text-[11px] text-[#d4af37]/60">— fora · não jogável</span>
        </footer>
      </div>
    </div>
  );
};
