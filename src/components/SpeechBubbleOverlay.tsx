import React from 'react';
import { SpeechBubbleItem } from '../types';

interface SpeechBubbleOverlayProps {
  bubbles: SpeechBubbleItem[];
  screenPositions: Record<number, { x: number; y: number }>;
}

export const SpeechBubbleOverlay: React.FC<SpeechBubbleOverlayProps> = ({
  bubbles,
  screenPositions,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {bubbles.map((bubble) => {
        const pos = screenPositions[bubble.spotId];
        if (!pos) return null;

        return (
          <div
            key={bubble.id}
            className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 ease-out"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y - 12}px`,
            }}
          >
            {/* Speech Bubble Container matching Reference 1 */}
            <div className="relative bg-white text-zinc-950 font-bold px-5 py-2.5 rounded-[22px] shadow-[0_8px_25px_rgba(0,0,0,0.45)] text-lg md:text-xl tracking-tight animate-bounce-short">
              <span>{bubble.text}</span>

              {/* Pointy Speech Bubble Tail pointing down to avatar */}
              <div
                className="absolute left-1/2 -bottom-2 w-4 h-4 bg-white transform -translate-x-1/2 rotate-45"
                style={{
                  clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
