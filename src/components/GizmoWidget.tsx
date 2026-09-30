import React, { useRef } from 'react';
import { GizmoMode, AvatarTransform } from '../types';

interface GizmoWidgetProps {
  mode: GizmoMode;
  onCycleMode: () => void;
  transform: AvatarTransform;
  onChangeTransform: (newTransform: AvatarTransform) => void;
  onSetMode?: (mode: GizmoMode) => void;
}

export const GizmoWidget: React.FC<GizmoWidgetProps> = ({
  mode,
  onCycleMode,
  transform,
  onChangeTransform,
  onSetMode,
}) => {
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // Map legacy names if passed
  const effectiveMode =
    mode === 'scale' ? 'escalar' : mode === 'angle' ? 'rodar' : mode === 'sizeY' ? 'elevar' : mode;

  // Normalized Mode configs matching Creator Mode
  // mover = Esmeralda/Ciano, escalar = Amarelo Dourado, rodar = Roxo, elevar = Azul Celeste
  const modeConfigs: Record<
    string,
    {
      label: string;
      colorName: string;
      hex: string;
      ringColor: string;
      glowColor: string;
      centerColor: string;
      secondaryColor: string;
      desc: string;
      displayVal: string;
    }
  > = {
    mover: {
      label: 'Mover',
      colorName: 'esmeralda',
      hex: '#10b981',
      ringColor: 'rgba(16, 185, 129, 0.75)',
      glowColor: 'rgba(16, 185, 129, 0.45)',
      centerColor: '#a7f3d0',
      secondaryColor: '#059669',
      desc: 'Mover · clique no centro p/ trocar',
      displayVal: `X:${(transform.positionOffset?.[0] || 0).toFixed(1)} Z:${(transform.positionOffset?.[2] || 0).toFixed(1)}`,
    },
    escalar: {
      label: 'Escala',
      colorName: 'amarelo',
      hex: '#eab308',
      ringColor: 'rgba(234, 179, 8, 0.75)',
      glowColor: 'rgba(234, 179, 8, 0.45)',
      centerColor: '#fef08a',
      secondaryColor: '#f59e0b',
      desc: 'Escala · clique no centro p/ trocar',
      displayVal: `${Math.round(transform.scale * 100)}%`,
    },
    rodar: {
      label: 'Rotação',
      colorName: 'roxo',
      hex: '#a855f7',
      ringColor: 'rgba(168, 85, 247, 0.75)',
      glowColor: 'rgba(168, 85, 247, 0.45)',
      centerColor: '#e9d5ff',
      secondaryColor: '#9333ea',
      desc: 'Rotação · clique no centro p/ trocar',
      displayVal: `${Math.round(transform.angle)}°`,
    },
    elevar: {
      label: 'Elevar (Y)',
      colorName: 'ciano',
      hex: '#06b6d4',
      ringColor: 'rgba(6, 182, 212, 0.75)',
      glowColor: 'rgba(6, 182, 212, 0.45)',
      centerColor: '#a5f3fc',
      secondaryColor: '#0891b2',
      desc: 'Elevar (Y) · clique no centro p/ trocar',
      displayVal: `${Math.round(transform.sizeY * 100)}%`,
    },
  };

  const currentConfig = modeConfigs[effectiveMode] || modeConfigs['mover'];

  // Drag on gizmo to adjust parameters
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - dragStartPosRef.current.x;
      const deltaY = dragStartPosRef.current.y - moveEvent.clientY;
      const movement = deltaX + deltaY;

      if (effectiveMode === 'mover') {
        const curOffset = transform.positionOffset || [0, 0, 0];
        const newX = parseFloat((curOffset[0] + deltaX * 0.01).toFixed(2));
        const newZ = parseFloat((curOffset[2] - deltaY * 0.01).toFixed(2));
        onChangeTransform({
          ...transform,
          positionOffset: [newX, curOffset[1], newZ],
        });
      } else if (effectiveMode === 'escalar') {
        const nextScale = Math.min(2.5, Math.max(0.4, transform.scale + movement * 0.004));
        onChangeTransform({ ...transform, scale: parseFloat(nextScale.toFixed(2)) });
      } else if (effectiveMode === 'rodar') {
        const nextAngle = (transform.angle + movement * 0.8 + 360) % 360;
        onChangeTransform({ ...transform, angle: Math.round(nextAngle) });
      } else if (effectiveMode === 'elevar') {
        const nextSizeY = Math.min(2.0, Math.max(0.5, transform.sizeY + movement * 0.004));
        onChangeTransform({ ...transform, sizeY: parseFloat(nextSizeY.toFixed(2)) });
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
      {/* Quick Mode Switcher Pills above Gizmo */}
      <div className="flex items-center gap-1 bg-[#121317]/90 p-1 rounded-xl border border-white/10 shadow-lg text-[10px] backdrop-blur-md">
        {(['mover', 'escalar', 'rodar'] as const).map((m) => {
          const isActive = effectiveMode === m;
          const conf = modeConfigs[m];
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSetMode ? onSetMode(m) : onCycleMode()}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                isActive
                  ? 'text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              style={{
                backgroundColor: isActive ? conf.hex : undefined,
              }}
            >
              {conf.label}
            </button>
          );
        })}
      </div>

      {/* Gizmo Box */}
      <div
        id="gizmo-container"
        className="relative w-36 h-36 bg-[#16171a]/90 backdrop-blur-md rounded-2xl border border-white/10 p-2 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group overflow-hidden"
        onMouseDown={handleMouseDown}
        title="Arraste para ajustar valor ou clique no centro do Gizmo para alternar: Mover -> Escalar -> Rotação"
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
            <radialGradient id={`glow-${effectiveMode}`} cx="50%" cy="50%" r="50%">
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
            stroke={effectiveMode === 'mover' ? '#10b981' : currentConfig.ringColor}
            strokeWidth={effectiveMode === 'mover' ? '3' : '2'}
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
            stroke={effectiveMode === 'escalar' ? '#eab308' : 'rgba(255,255,255,0.45)'}
            strokeWidth={effectiveMode === 'escalar' ? '3' : '1.8'}
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
            stroke={effectiveMode === 'rodar' ? '#c084fc' : currentConfig.ringColor}
            strokeWidth={effectiveMode === 'rodar' ? '3' : '2'}
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
            "se o usuario clica no centro gizmo muda p escala se clica de novo muda p mover se clica de novo muda p rotação" */}
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
          title="Clique no centro do Gizmo para alternar: Mover -> Escalar -> Rotação"
        >
          {/* Inner shiny core */}
          <div
            className="w-3.5 h-3.5 rounded-full transition-colors duration-300"
            style={{ backgroundColor: currentConfig.centerColor }}
          />
        </button>

        {/* Interactive mini slider indicators */}
        <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-between text-[9px] text-zinc-400 pointer-events-none font-mono">
          <span className="text-zinc-500 uppercase">{currentConfig.label}</span>
          <span className="text-white font-semibold" style={{ color: currentConfig.hex }}>
            {currentConfig.displayVal}
          </span>
        </div>
      </div>

      {/* Caption text below gizmo */}
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
