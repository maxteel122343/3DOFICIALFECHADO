import React, { useState } from 'react';
import {
  MapPin,
  FolderArchive,
  Plus,
  Upload,
  Armchair,
  Accessibility,
  Bed,
  Check,
  Sparkles,
  Box,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  GripHorizontal,
} from 'lucide-react';
import { InventoryItem, PlacedObject, SpotItem, SpotType } from '../types';

interface CreatorSidebarProps {
  inventory: InventoryItem[];
  spots: SpotItem[];
  placedObjects?: PlacedObject[];
  selectedObjectId?: string | null;
  onSelectObjectId?: (id: string | null) => void;
  onRemoveObject?: (id: string) => void;
  onOpenUploadModal: () => void;
  onInsertAssetToScene: (asset: InventoryItem) => void;
  onAddSpot: (type: SpotType, name: string) => void;
  onRemoveSpot: (spotId: string) => void;
  onClearAllSpots?: () => void;
  onRemoveOverlappingSpots?: () => void;
  onSelectSpot: (spot: SpotItem) => void;
  activeSpotId: string | null;
  insertionCursorPoint: [number, number, number] | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  customAvatarObjectId?: string | null;
  onSetCustomAvatarObjectId?: (id: string | null) => void;
}

export const CreatorSidebar: React.FC<CreatorSidebarProps> = ({
  inventory,
  spots,
  placedObjects = [],
  selectedObjectId = null,
  onSelectObjectId,
  onRemoveObject,
  onOpenUploadModal,
  onInsertAssetToScene,
  onAddSpot,
  onRemoveSpot,
  onClearAllSpots,
  onRemoveOverlappingSpots,
  onSelectSpot,
  activeSpotId,
  insertionCursorPoint,
  isCollapsed = false,
  onToggleCollapse,
  customAvatarObjectId = null,
  onSetCustomAvatarObjectId,
}) => {
  const [activeTab, setActiveTab] = useState<'spots' | 'objects' | 'inventory'>('spots');
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [newSpotType, setNewSpotType] = useState<SpotType>('sentar');
  const [newSpotName, setNewSpotName] = useState('');

  const handleCreateSpot = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName =
      newSpotName.trim() ||
      (newSpotType === 'sentar'
        ? `Sofa ${spots.filter((s) => s.type === 'sentar').length + 1}`
        : newSpotType === 'pe'
        ? `Pé ${spots.filter((s) => s.type === 'pe').length + 1}`
        : `Deitar ${spots.filter((s) => s.type === 'deitar').length + 1}`);

    onAddSpot(newSpotType, finalName);
    setNewSpotName('');
    setIsAddingSpot(false);
  };

  // If sidebar is collapsed, render minimal vertical strip
  if (isCollapsed) {
    return (
      <aside className="relative w-12 bg-[#121317]/95 border-r border-[#d4af37]/30 flex flex-col items-center py-3 text-[#e8d5b5] select-none z-20 font-sans shadow-lg gap-4">
        {/* Expand Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-lg bg-[#d4af37]/20 border border-[#d4af37] text-[#ffd700] hover:bg-[#d4af37] hover:text-black flex items-center justify-center transition-all cursor-pointer shadow-md"
          title="Expandir Barra Lateral"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Mini Tab Selectors that also expand sidebar */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#d4af37]/20 w-full px-1.5 items-center">
          <button
            type="button"
            onClick={() => {
              setActiveTab('spots');
              onToggleCollapse?.();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors cursor-pointer"
            title={`Spots (${spots.length})`}
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('objects');
              onToggleCollapse?.();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors cursor-pointer"
            title={`Objetos na sala (${placedObjects.length})`}
          >
            <Box className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              onToggleCollapse?.();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors cursor-pointer"
            title={`Inventário de Itens (${inventory.length})`}
          >
            <FolderArchive className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="relative w-64 md:w-72 bg-[#121317]/95 border-r border-[#d4af37]/30 flex flex-col h-full text-[#e8d5b5] select-none z-20 font-sans shadow-lg">
      {/* Minimize Button on edge (indicated by user arrow in Image 1) */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3.5 top-14 z-30 w-7 h-7 rounded-full bg-[#121317] border border-[#d4af37] text-[#ffd700] flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-all shadow-md cursor-pointer"
          title="Minimizar barra lateral (Expandir visualização 3D)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Top Tab Bar: [📍 SPOTS] | [🪑 OBJETOS (n)] | [📦 INVENTÁRIO (n)] */}
      <div className="grid grid-cols-3 border-b border-[#d4af37]/30 bg-[#0e0f13]">
        <button
          type="button"
          onClick={() => setActiveTab('spots')}
          className={`py-3 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer border-b-2 ${
            activeTab === 'spots'
              ? 'border-[#d4af37] text-[#ffd700] bg-[#14151a]'
              : 'border-transparent text-[#d4af37]/60 hover:text-[#d4af37]'
          }`}
          title="Spots de avatar"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Spots</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('objects')}
          className={`py-3 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer border-b-2 ${
            activeTab === 'objects'
              ? 'border-[#d4af37] text-[#ffd700] bg-[#14151a]'
              : 'border-transparent text-[#d4af37]/60 hover:text-[#d4af37]'
          }`}
          title="Objetos e móveis na sala"
        >
          <Box className="w-3.5 h-3.5" />
          <span>Objetos ({placedObjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`py-3 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer border-b-2 ${
            activeTab === 'inventory'
              ? 'border-[#d4af37] text-[#ffd700] bg-[#14151a]'
              : 'border-transparent text-[#d4af37]/60 hover:text-[#d4af37]'
          }`}
          title="Arquivos e inventário 3D"
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Itens ({inventory.length})</span>
        </button>
      </div>

      {/* Tab 1: SPOTS DA ROOM */}
      {activeTab === 'spots' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden p-3.5">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            <div className="flex items-center justify-between pb-1 text-xs text-[#d4af37]/80">
              <span className="font-semibold text-[#ffd700]">Spots da room ({spots.length})</span>
              {spots.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {onRemoveOverlappingSpots && (
                    <button
                      type="button"
                      onClick={onRemoveOverlappingSpots}
                      className="px-2 py-0.5 rounded bg-[#1c1f28] hover:bg-[#d4af37] hover:text-black border border-[#d4af37]/40 text-[10px] font-semibold text-[#ffd700] transition-colors cursor-pointer"
                      title="Elimina spots que estão exatamente no mesmo local ou muito próximos"
                    >
                      Remover sobrepostos
                    </button>
                  )}
                  {onClearAllSpots && (
                    <button
                      type="button"
                      onClick={onClearAllSpots}
                      className="px-1.5 py-0.5 rounded bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-[10px] text-red-300 transition-colors cursor-pointer"
                      title="Remover todos os spots da cena"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              )}
            </div>

            {spots.map((spot) => {
              const isSelected = activeSpotId === spot.id;
              return (
                <div
                  key={spot.id}
                  onClick={() => onSelectSpot(spot)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#ffd700] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                      : 'border-[#d4af37]/25 hover:border-[#d4af37]/60 bg-black/40 text-[#e8d5b5]/85'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full border border-[#d4af37]/60 flex items-center justify-center flex-shrink-0 text-[#d4af37] bg-[#121317]">
                      {spot.type === 'sentar' ? (
                        <Armchair className="w-3.5 h-3.5" />
                      ) : spot.type === 'deitar' ? (
                        <Bed className="w-3.5 h-3.5" />
                      ) : (
                        <Accessibility className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate">{spot.name}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border border-[#d4af37]/30 text-[#d4af37]/80">
                      {spot.type === 'sentar' ? 'SENTAR' : spot.type === 'deitar' ? 'DEITAR' : 'PE'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSpot(spot.id);
                      }}
                      className="p-1 rounded text-red-400 hover:text-red-200 hover:bg-red-950/80 transition-colors cursor-pointer"
                      title={`Excluir spot ${spot.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#ffd700]" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick Add Form or Trigger Button */}
            {isAddingSpot ? (
              <form
                onSubmit={handleCreateSpot}
                className="mt-3 p-3 rounded-lg border border-[#d4af37]/50 bg-black/60 space-y-2.5 animate-fade-in"
              >
                <div className="flex items-center justify-between text-xs text-[#d4af37]">
                  <span className="font-semibold">Novo Spot</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingSpot(false)}
                    className="text-[#d4af37]/60 hover:text-[#d4af37]"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(['pe', 'sentar', 'deitar'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewSpotType(t)}
                      className={`py-1 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                        newSpotType === t
                          ? 'bg-[#d4af37] text-black border-[#d4af37]'
                          : 'border-[#d4af37]/40 text-[#e8d5b5]/80 hover:border-[#d4af37]'
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Nome do spot (opcional)"
                  value={newSpotName}
                  onChange={(e) => setNewSpotName(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#d4af37]/40 rounded px-2.5 py-1.5 text-xs text-[#e8d5b5] placeholder:text-[#e8d5b5]/30 outline-none"
                />

                <button
                  type="submit"
                  className="w-full py-1.5 rounded bg-[#d4af37] text-black text-xs font-semibold tracking-wide hover:bg-[#e2bd44] cursor-pointer"
                >
                  Salvar Spot
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingSpot(true)}
                className="w-full mt-3 py-2 rounded-lg border border-[#d4af37]/40 hover:border-[#d4af37] bg-[#d4af37]/5 hover:bg-[#d4af37]/15 text-[#d4af37] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar spot</span>
              </button>
            )}
          </div>

          {/* Footer note matching screenshot */}
          <div className="pt-3 border-t border-[#d4af37]/20 text-[10px] text-[#d4af37]/70 leading-tight">
            Clique no spot na room = avatar teleporta para esta posição.
          </div>
        </div>
      )}

      {/* Tab 2: OBJETOS NA SALA */}
      {activeTab === 'objects' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden p-3.5">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            <div className="flex items-center justify-between pb-1 text-xs text-[#d4af37]/80">
              <span className="font-semibold text-[#d4af37]">Objetos na cena</span>
              <span className="text-[11px] font-mono">{placedObjects.length} itens</span>
            </div>

            {placedObjects.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-[#d4af37]/30 bg-black/40 text-center text-xs text-[#e8d5b5]/60 mt-4">
                <Box className="w-8 h-8 text-[#d4af37]/40 mx-auto mb-2" />
                <p>Nenhum objeto na sala.</p>
                <p className="text-[10px] text-[#d4af37]/60 mt-1">
                  Vá na aba "Itens" ou envie um arquivo GLB para inserir móveis.
                </p>
              </div>
            ) : (
              placedObjects.map((obj) => {
                const isSelected = selectedObjectId === obj.id;
                const isCustomAvatar = customAvatarObjectId === obj.id;
                return (
                  <div
                    key={obj.id}
                    onClick={() => onSelectObjectId?.(obj.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#ffd700] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                        : 'border-[#d4af37]/25 hover:border-[#d4af37]/60 bg-black/40 text-[#e8d5b5]/85'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded border border-[#d4af37]/50 flex items-center justify-center flex-shrink-0 text-[#d4af37] bg-[#121317]">
                        {obj.modelType === 'sofa' || obj.name.toLowerCase().includes('sofa') ? (
                          <Armchair className="w-4 h-4" />
                        ) : obj.name.toLowerCase().includes('cama') || obj.name.toLowerCase().includes('bed') ? (
                          <Bed className="w-4 h-4" />
                        ) : (
                          <Box className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate block">
                            {obj.name}
                          </span>
                          {isCustomAvatar && (
                            <span className="text-[9px] font-bold bg-[#d4af37] text-black px-1.5 py-0.2 rounded shadow-sm">
                              Avatar
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-[#d4af37]/75">
                          X: {obj.position[0].toFixed(2)}m · Z: {obj.position[2].toFixed(2)}m
                        </span>
                      </div>
                    </div>

                    {/* Actions: Set as Avatar & Trash Icon */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCustomAvatar) {
                            onSetCustomAvatarObjectId?.(null);
                          } else {
                            onSetCustomAvatarObjectId?.(obj.id);
                          }
                        }}
                        className={`p-1.5 rounded transition-colors cursor-pointer text-xs ${
                          isCustomAvatar
                            ? 'bg-[#d4af37] text-black ring-1 ring-[#ffd700]'
                            : 'text-[#d4af37]/70 hover:text-[#ffd700] hover:bg-[#d4af37]/20 border border-transparent hover:border-[#d4af37]/40'
                        }`}
                        title={
                          isCustomAvatar
                            ? 'Remover como avatar ativo'
                            : 'Definir este item como avatar do visitante (controlado pelos spots)'
                        }
                      >
                        <User className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveObject?.(obj.id);
                        }}
                        className="p-1.5 rounded text-red-400 hover:text-red-200 hover:bg-red-950/80 border border-transparent hover:border-red-500/60 transition-colors cursor-pointer"
                        title={`Excluir ${obj.name} da sala`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-[#d4af37]/20 text-[10px] text-[#d4af37]/70 leading-tight">
            Clique no objeto para abrir o gizmo de ajuste fino, no ícone de avatar para torná-lo o avatar controlado na cena, ou na lixeira para removê-lo.
          </div>
        </div>
      )}

      {/* Tab 3: INVENTÁRIO DE ARQUIVOS GLB */}
      {activeTab === 'inventory' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden p-3.5">
          {/* Top upload button */}
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="w-full py-2.5 px-3 rounded-lg border border-[#d4af37] hover:border-[#ffd700] bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-xs font-semibold text-[#ffd700] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm mb-3"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Enviar arquivo (GLB)</span>
          </button>

          {/* Drag & Drop Guidance Banner */}
          <div className="p-2 mb-2 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 text-[10px] text-[#ffd700] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-[#ffd700]" />
            <span>Dica: Arraste qualquer item diretamente para o chão da maquete 3D!</span>
          </div>

          {/* Insertion Cursor Notification Banner */}
          {insertionCursorPoint && (
            <div className="p-2 mb-3 rounded-lg border border-[#d4af37] bg-[#d4af37]/15 text-[11px] text-[#ffd700] flex items-start gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#ffd700]" />
              <div className="leading-snug">
                Ponto marcado em [{insertionCursorPoint[0]}, {insertionCursorPoint[2]}]. Clique no botão de inserção abaixo para nascer ali!
              </div>
            </div>
          )}

          {/* List of files in inventory */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {inventory.map((item) => (
              <div
                key={item.id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify(item));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="group p-2.5 rounded-lg border border-[#d4af37]/30 hover:border-[#ffd700] bg-black/40 hover:bg-black/60 transition-all flex flex-col gap-2 cursor-grab active:cursor-grabbing hover:shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                title="Clique e arraste para o cenário 3D ou clique no botão abaixo"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-10 rounded border border-[#d4af37]/40 bg-[#16181e] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.thumbUrl ? (
                      <img
                        src={item.thumbUrl}
                        alt={item.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Box className="w-5 h-5 text-[#d4af37]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-[#e8d5b5] truncate group-hover:text-[#ffd700]">
                        {item.displayName}
                      </h4>
                      <GripHorizontal className="w-3.5 h-3.5 text-[#d4af37]/40 group-hover:text-[#ffd700]" />
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#d4af37]/40 text-[#d4af37] inline-block mt-0.5">
                      {item.type}
                    </span>
                  </div>
                </div>

                {/* Insertion Action */}
                <button
                  type="button"
                  onClick={() => onInsertAssetToScene(item)}
                  className="w-full py-1 rounded border border-[#d4af37]/60 hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-black text-[10px] font-semibold text-[#d4af37] tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>
                    {item.type === 'Sala'
                      ? 'Carregar como Cenário 3D'
                      : insertionCursorPoint
                      ? 'Inserir no ponto marcado'
                      : 'Inserir na cena'}
                  </span>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#d4af37]/20 text-[10px] text-[#d4af37]/70">
            Arraste para soltar no chão ou clique no botão para inserir.
          </div>
        </div>
      )}
    </aside>
  );
};
