import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Box,
  Coins,
  CheckCircle2,
  Image as ImageIcon,
  Tag,
  ShoppingBag,
  Layers,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { InventoryItem, StoreObjectType, CreatorUser } from '../types';

interface PublishItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  user?: CreatorUser | null;
  onConfirmPublish: (payload: {
    item: InventoryItem;
    name: string;
    objectType: StoreObjectType;
    price: number;
    hashtags: string[];
    thumbnailUrl: string;
    rarity: 'COMUM' | 'RARO' | 'ÉLITE';
    description: string;
    publishMode: 'simples' | 'avancado';
  }) => Promise<void> | void;
  onGoToStore?: () => void;
}

export const PublishItemModal: React.FC<PublishItemModalProps> = ({
  isOpen,
  onClose,
  item,
  user,
  onConfirmPublish,
  onGoToStore,
}) => {
  const [publishMode, setPublishMode] = useState<'simples' | 'avancado'>('simples');
  const [title, setTitle] = useState('');
  const [objectType, setObjectType] = useState<StoreObjectType>('item');
  const [price, setPrice] = useState(0);
  const [hashtags, setHashtags] = useState('#comunidade, #3d, #criador');
  const [rarity, setRarity] = useState<'COMUM' | 'RARO' | 'ÉLITE'>('RARO');
  const [description, setDescription] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Initialize or synchronize form whenever item changes
  useEffect(() => {
    if (item) {
      setTitle(item.displayName || 'Novo Item 3D');
      setThumbUrl(item.thumbUrl || '');
      setHasSaved(false);

      if (item.type === 'Avatar') {
        setObjectType('avatar');
        setHashtags('#avatar, #personagem, #3d');
        setPrice(150);
        setRarity('ÉLITE');
      } else if (item.type === 'Sala') {
        setObjectType('sala');
        setHashtags('#sala, #cenario, #vitrine3d');
        setPrice(0);
        setRarity('RARO');
      } else {
        setObjectType('item');
        setHashtags('#item, #movel, #decoracao');
        setPrice(0);
        setRarity('COMUM');
      }
      setDescription(`Modelo 3D criado por ${user?.displayName || 'Luzenne'}.`);
    }
  }, [item, user]);

  if (!isOpen || !item) return null;

  const handlePublishSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!item || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const parsedTags = hashtags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`));

      const finalTags = parsedTags.length > 0 ? parsedTags : ['#comunidade', '#3d'];
      const finalPrice = publishMode === 'simples' ? 0 : Number(price) || 0;
      const finalName = title.trim() || item.displayName;
      const finalThumb = thumbUrl.trim() || item.thumbUrl;

      await onConfirmPublish({
        item,
        name: finalName,
        objectType,
        price: finalPrice,
        hashtags: finalTags,
        thumbnailUrl: finalThumb,
        rarity: publishMode === 'simples' ? 'COMUM' : rarity,
        description: description.trim() || `Item 3D criado por ${user?.displayName || 'Luzenne'}.`,
        publishMode,
      });

      setHasSaved(true);
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadgeLabel = () => {
    switch (objectType) {
      case 'sala':
        return '🏛️ Sala / Cenário';
      case 'avatar':
        return '👤 Avatar 3D';
      case 'moveis':
        return '🛋️ Móvel';
      default:
        return '📦 Item / Objeto';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#121317] border border-[#d4af37]/60 rounded-2xl p-6 shadow-[0_16px_50px_rgba(0,0,0,0.95)] text-[#e8d5b5] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#ffd700]" />
            <h2 className="text-sm font-extrabold tracking-wider text-[#e8d5b5] uppercase">
              Publicar na Vitrine & Loja
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

        {/* Mode Selector (Simples vs Avançado) */}
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
            <span className="text-[10px] opacity-75">(1 Clique / Grátis)</span>
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
            <span className="text-[10px] opacity-75">(Customizar Preço & Tags)</span>
          </button>
        </div>

        {/* 16:9 Vitrine Card Preview (Identical to Publicar Vitrine) */}
        <div className="my-4">
          <div className="relative aspect-video w-full rounded-xl border border-[#d4af37]/50 overflow-hidden bg-[#18191f] p-4 flex flex-col justify-between shadow-inner">
            {/* Background Thumbnail preview */}
            {thumbUrl && (
              <img
                src={thumbUrl}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[1px]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/70 pointer-events-none" />

            {/* Top info badge & price */}
            <div className="flex items-center justify-between z-10">
              <span className="px-2.5 py-0.5 rounded-full bg-black/85 border border-[#d4af37]/50 text-[10px] font-bold tracking-wider text-[#ffd700] flex items-center gap-1">
                <span>{getTypeBadgeLabel()}</span>
                <span className="text-[#e8d5b5]/50">·</span>
                <span className="text-[9px] uppercase font-mono">{publishMode === 'simples' ? 'Simples' : 'Avançado'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-black/85 border border-[#ffd700]/60 text-[11px] text-[#ffd700] font-black font-mono flex items-center gap-1 shadow-sm">
                <Coins className="w-3 h-3 text-[#ffd700]" />
                {publishMode === 'simples' || price <= 0 ? 'Grátis (0 🪙)' : `${price} moedas`}
              </span>
            </div>

            {/* Visual Center Preview */}
            <div className="text-center z-10 my-auto">
              <div className="w-12 h-12 mx-auto mb-1.5 rounded-xl border border-[#d4af37]/50 bg-black/60 overflow-hidden flex items-center justify-center shadow-lg">
                {thumbUrl ? (
                  <img src={thumbUrl} alt="Thumb" className="w-full h-full object-cover" />
                ) : (
                  <Box className="w-6 h-6 text-[#ffd700]" />
                )}
              </div>
              <h3 className="text-base font-bold text-[#e8d5b5] tracking-wide truncate max-w-xs mx-auto">
                {title || item.displayName}
              </h3>
              <p className="text-[11px] text-[#d4af37]/90 font-mono mt-0.5">
                Por {user?.displayName || 'Luzenne'} · Raridade {publishMode === 'simples' ? 'COMUM' : rarity}
              </p>
            </div>

            {/* Bottom Vitrine info */}
            <div className="flex items-center justify-between z-10 border-t border-[#d4af37]/30 pt-2 text-[11px]">
              <div className="flex items-center gap-2 text-[#d4af37]/90 text-[10px] font-mono truncate max-w-[240px]">
                <Tag className="w-3 h-3 text-[#ffd700] flex-shrink-0" />
                <span className="truncate">{hashtags}</span>
              </div>
              <div className="flex items-center gap-1 text-[#ffd700] font-bold text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{hasSaved ? '✓ Persistido na Loja' : 'Pronto para Publicar'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inputs Form */}
        <form onSubmit={handlePublishSubmit} className="space-y-3 mb-4 text-xs">
          {/* Nome do Item (Always editable for full user freedom) */}
          <div>
            <label className="block font-semibold text-[#e8d5b5] mb-1">
              Nome de Exibição do Item
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sofá Moderno, Avatar Gamer, Sala Loft..."
              className="w-full bg-[#1b1c24] border border-[#d4af37]/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#ffd700] font-semibold"
            />
          </div>

          {/* Type Selector (Quick buttons) */}
          <div>
            <label className="block font-semibold text-[#e8d5b5] mb-1">
              Tipo / Categoria do Item
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'sala', label: '🏛️ Sala' },
                  { id: 'avatar', label: '👤 Avatar' },
                  { id: 'moveis', label: '🛋️ Móvel' },
                  { id: 'item', label: '📦 Objeto' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setObjectType(t.id)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                    objectType === t.id
                      ? 'bg-[#d4af37]/30 border-[#ffd700] text-[#ffd700] font-bold'
                      : 'bg-[#1b1c24] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced fields */}
          {publishMode === 'avancado' && (
            <div className="space-y-3 pt-1 animate-fade-in">
              {/* Preço em Moedas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#e8d5b5]">
                    Preço de Venda na Loja (Moedas 🪙)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPrice(0)}
                    className="text-[10px] text-[#ffd700] hover:underline cursor-pointer"
                  >
                    Definir Grátis (0 🪙)
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[#1b1c24] border border-[#d4af37]/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#ffd700]"
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="block font-semibold text-[#e8d5b5] mb-1">
                  Hashtags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#comunidade, #3d, #criador"
                  className="w-full bg-[#1b1c24] border border-[#d4af37]/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#ffd700]"
                />
              </div>

              {/* Raridade */}
              <div>
                <label className="block font-semibold text-[#e8d5b5] mb-1">
                  Raridade do Item
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['COMUM', 'RARO', 'ÉLITE'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRarity(r)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        rarity === r
                          ? 'bg-[#d4af37]/30 border-[#ffd700] text-[#ffd700]'
                          : 'bg-[#1b1c24] border-white/10 text-zinc-400'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL da Capa / Thumbnail */}
              <div>
                <label className="block font-semibold text-[#e8d5b5] mb-1">
                  URL da Imagem de Capa (opcional)
                </label>
                <input
                  type="url"
                  value={thumbUrl}
                  onChange={(e) => setThumbUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#1b1c24] border border-[#d4af37]/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#ffd700]"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block font-semibold text-[#e8d5b5] mb-1">
                  Descrição do Item
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Conte mais sobre o design ou estilo deste item..."
                  className="w-full bg-[#1b1c24] border border-[#d4af37]/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#ffd700] resize-none"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-[#d4af37]/20">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#ffd700] hover:from-[#e5bd38] hover:to-[#ffe033] text-black text-xs font-black tracking-wider uppercase hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Publicando...'
                  : hasSaved
                  ? '✓ Publicado com Sucesso!'
                  : publishMode === 'simples'
                  ? 'Publicar na Loja (1 Clique)'
                  : 'Salvar & Publicar na Loja'}
              </span>
            </button>

            {onGoToStore && hasSaved && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToStore();
                }}
                className="py-2.5 px-4 rounded-xl border border-[#ffd700] bg-[#ffd700]/20 hover:bg-[#ffd700]/30 text-[#ffd700] text-xs font-bold uppercase transition-colors cursor-pointer text-center"
              >
                Ver na Loja
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#d4af37]/40 hover:border-[#ffd700] bg-transparent hover:bg-[#d4af37]/10 text-[#e8d5b5] hover:text-[#ffd700] text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer text-center"
            >
              {hasSaved ? 'Concluir' : 'Cancelar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
