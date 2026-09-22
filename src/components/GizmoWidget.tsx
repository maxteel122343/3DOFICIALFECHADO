import React, { useRef } from 'react';
import { GizmoMode, AvatarTransform } from '../types';

interface GizmoWidgetProps {
  mode: GizmoMode;
  onCycleMode: () => void;
  transform: AvatarTransform;
  onChangeTransform: (newTransform: AvatarTransform) => void;
}

export const GizmoWidget: React.FC<GizmoWidgetProps> = ({
  mode,
  onCycleMode,
  transform,
  onChangeTransform,
}) => {
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // Mode configs
  // amarelo = Escala, ciano = Tamanho (eixo Y), roxo = Ângulo
  const modeConfigs = {
    scale: {
      label: 'Escala',
      colorName: 'amarelo',
      hex: '#eab308',
      ringColor: 'rgba(234, 179, 8, 0.75)',
      glowColor: 'rgba(234, 179, 8, 0.45)',
      centerColor: '#fef08a',
      secondaryColor: '#f59e0b',
      desc: 'Escala · clique para trocar',
      currentVal: transform.scale,
      displayVal: `${Math.round(transform.scale * 100)}%`,
    },
    sizeY: {
      label: 'Tamanho (eixo Y)',
      colorName: 'ciano',
      hex: '#06b6d4',
      ringColor: 'rgba(6, 182, 212, 0.75)',
      glowColor: 'rgba(6, 182, 212, 0.45)',
      centerColor: '#a5f3fc',
      secondaryColor: '#0891b2',
      desc: 'Tamanho (Y) · clique para trocar',
      currentVal: transform.sizeY,
      displayVal: `${Math.round(transform.sizeY * 100)}%`,
    },
    angle: {
      label: 'Ângulo',
      colorName: 'roxo',
      hex: '#a855f7',
      ringColor: 'rgba(168, 85, 247, 0.75)',
      glowColor: 'rgba(168, 85, 247, 0.45)',
      centerColor: '#e9d5ff',
      secondaryColor: '#9333ea',
      desc: 'Ângulo · clique para trocar',
      currentVal: transform.angle,
      displayVal: `${Math.round(transform.angle)}°`,
    },
  };

  const currentConfig = modeConfigs[mode];

  // Drag on ring to adjust
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - dragStartPosRef.current.x;
      const deltaY = dragStartPosRef.current.y - moveEvent.clientY;
      const movement = deltaX + deltaY;

      if (mode === 'scale') {
        const nextScale = Math.min(1.4, Math.max(0.7, transform.scale + movement * 0.003));
        onChangeTransform({ ...transform, scale: parseFloat(nextScale.toFixed(2)) });
      } else if (mode === 'sizeY') {
        const nextSizeY = Math.min(1.4, Math.max(0.75, transform.sizeY + movement * 0.003));
        onChangeTransform({ ...transform, sizeY: parseFloat(nextSizeY.toFixed(2)) });
      } else if (mode === 'angle') {
        const nextAngle = (transform.angle + movement * 0.8 + 360) % 360;
        onChangeTransform({ ...transform, angle: Math.round(nextAngle) });
      }

      dragStartPosRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex flex-col items-start gap-1 select-none">
      {/* Gizmo Box - styled identical to Reference 1 */}
      <div
        id="gizmo-container"
        className="relative w-36 h-36 bg-[#16171a]/85 backdrop-blur-md rounded-2xl border border-white/10 p-2 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group overflow-hidden"
        onMouseDown={handleMouseDown}
        title="Arraste para ajustar o valor ou clique no centro para ciclar o modo"
      >
        {/* Ambient background glow matching active mode color */}
        <div
          className="absolute inset-0 transition-colors duration-500 pointer-events-none opacity-30 blur-xl"
          style={{ backgroundColor: currentConfig.glowColor }}
        />

        {/* 3D Gyroscope/Gimbal visualization */}
        <svg
          className="w-28 h-28 pointer-events-none animate-spin-very-slow transition-all duration-300 group-hover:scale-105"
          viewBox="0 0 100 100"
        >
          <defs>
            <radialGradient id={`glow-${mode}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={currentConfig.centerColor} stopOpacity="1" />
              <stop offset="50%" stopColor={currentConfig.hex} stopOpacity="0.8" />
              <stop offset="100%" stopColor={currentConfig.secondaryColor} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer Orbital Ring 1 (X Axis) */}
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="24"
            fill="none"
            stroke={currentConfig.ringColor}
            strokeWidth="2.5"
            strokeDasharray="6 3"
            transform="rotate(-25 50 50)"
            className="transition-colors duration-300"
          />

          {/* Orbital Ring 2 (Y Axis) */}
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="24"
            fill="none"
            stroke={mode === 'sizeY' ? '#22d3ee' : 'rgba(255,255,255,0.45)'}
            strokeWidth={mode === 'sizeY' ? '3' : '1.8'}
            transform="rotate(45 50 50)"
            className="transition-all duration-300"
          />

          {/* Orbital Ring 3 (Z Axis / Equatorial) */}
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="38"
            fill="none"
            stroke={mode === 'angle' ? '#c084fc' : currentConfig.ringColor}
            strokeWidth={mode === 'angle' ? '3' : '2'}
            strokeOpacity="0.75"
            className="transition-all duration-300"
          />

          {/* Inner Gyroscope rings */}
          <circle
            cx="50"
            cy="50"
            r="22"
            fill="none"
            stroke={currentConfig.hex}
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
        </svg>

        {/* CLICKABLE CENTER SPHERE
            "Clique no CENTRO do gizmo cicla o modo e a COR:
             - amarelo = Escala
             - ciano = Tamanho (eixo Y)
             - roxo = Ângulo" */}
        <button
          id="gizmo-center-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCycleMode();
          }}
          className="absolute z-20 w-8 h-8 rounded-full flex items-center justify-center transition-transform transform hover:scale-125 active:scale-95 shadow-lg cursor-pointer"
          style={{
            backgroundColor: currentConfig.hex,
            boxShadow: `0 0 16px 4px ${currentConfig.glowColor}, inset 0 0 4px #ffffff`,
          }}
          title="Clique para alternar: Escala (amarelo) -> Tamanho Y (ciano) -> Ângulo (roxo)"
        >
          {/* Inner shiny core */}
          <div
            className="w-3.5 h-3.5 rounded-full transition-colors duration-300"
            style={{ backgroundColor: currentConfig.centerColor }}
          />
        </button>

        {/* Interactive mini slider indicators */}
        <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-between text-[9px] text-zinc-400 pointer-events-none font-mono">
          <span className="text-zinc-500 uppercase">{currentConfig.label.split(' ')[0]}</span>
          <span className="text-white font-semibold" style={{ color: currentConfig.hex }}>
            {currentConfig.displayVal}
          </span>
        </div>
      </div>

      {/* Caption text below gizmo as seen in Reference 1:
          "Escala · clique para trocar" */}
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-zinc-400 font-medium select-none">
        <span
          className="w-2 h-2 rounded-full transition-colors duration-300"
          style={{ backgroundColor: currentConfig.hex }}
        />
        <button
          id="gizmo-label-btn"
          type="button"
          onClick={onCycleMode}
          className="hover:text-white transition-colors cursor-pointer text-left"
        >
          {currentConfig.desc}
        </button>
      </div>
    </div>
  );
};
