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
  onSelectSpot: (spot: SpotItem) => void;
  activeSpotId: string | null;
  insertionCursorPoint: [number, number, number] | null;
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
  onSelectSpot,
  activeSpotId,
  insertionCursorPoint,
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

  return (
    <aside className="w-64 md:w-72 bg-[#121317]/95 border-r border-[#d4af37]/30 flex flex-col h-full text-[#e8d5b5] select-none z-20 font-sans shadow-lg">
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
              <span className="font-semibold text-[#d4af37]">Spots da room</span>
              <span className="text-[11px] font-mono">{spots.length} spots</span>
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
                    <span className="text-xs font-medium truncate">{spot.name}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border border-[#d4af37]/30 text-[#d4af37]/80">
                      {spot.type === 'sentar' ? 'SENTAR' : spot.type === 'deitar' ? 'DEITAR' : 'PE'}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#d4af37]" />
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
                return (
                  <div
                    key={obj.id}
                    onClick={() => onSelectObjectId?.(obj.id)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
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
                        <span className="text-xs font-semibold truncate block">
                          {obj.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#d4af37]/75">
                          X: {obj.position[0].toFixed(2)}m · Z: {obj.position[2].toFixed(2)}m
                        </span>
                      </div>
                    </div>

                    {/* Trash Action Icon with tooltip */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveObject?.(obj.id);
                        }}
                        className="p-1.5 rounded text-red-400 hover:text-red-200 hover:bg-red-950/80 border border-transparent hover:border-red-500/60 transition-colors cursor-pointer"
                        title={`Excluir ${obj.name} da sala`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-[#d4af37]/20 text-[10px] text-[#d4af37]/70 leading-tight">
            Clique no objeto para abrir o gizmo de ajuste fino ou na lixeira para removê-lo.
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

          {/* Insertion Cursor Notification Banner */}
          {insertionCursorPoint ? (
            <div className="p-2 mb-3 rounded-lg border border-[#d4af37] bg-[#d4af37]/15 text-[11px] text-[#ffd700] flex items-start gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#ffd700]" />
              <div className="leading-snug">
                Ponto marcado em [{insertionCursorPoint[0]}, {insertionCursorPoint[2]}]. Clique em um item abaixo para fazê-lo nascer ali!
              </div>
            </div>
          ) : (
            <div className="p-2 mb-3 rounded-lg border border-[#d4af37]/20 bg-black/40 text-[10px] text-[#e8d5b5]/60 leading-snug">
              Clique em qualquer local do cenário 3D para marcar um ponto de inserção.
            </div>
          )}

          {/* List of files in inventory */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {inventory.map((item) => (
              <div
                key={item.id}
                className="group p-2.5 rounded-lg border border-[#d4af37]/30 hover:border-[#d4af37] bg-black/40 transition-all flex flex-col gap-2"
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
                    <h4 className="text-xs font-semibold text-[#e8d5b5] truncate group-hover:text-[#ffd700]">
                      {item.displayName}
                    </h4>
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
            Arquivos do inventário não entram na cena sozinhos.
          </div>
        </div>
      )}
    </aside>
  );
};
