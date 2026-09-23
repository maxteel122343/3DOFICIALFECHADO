import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  RotateCw,
  Move,
  Maximize2,
  ArrowUp,
  ShoppingCart,
  Trash2,
  Plus,
  X,
  Check,
  Sparkles,
  User,
  LogOut,
  Tag,
  Upload,
  Coins,
  Gem,
  ArrowLeft,
} from 'lucide-react';
import {
  CustomizationItem,
  StoreAvatar,
  AvatarPoseConfig,
  CreatorUser,
  InventoryItem,
} from '../types';
import { AvatarPedestal3D } from './AvatarPedestal3D';

interface UserCustomizationViewProps {
  onBackToLobby: () => void;
  user: CreatorUser | null;
  onOpenAuthModal: () => void;
  initialTab?: 'loja' | 'inventario' | 'poses';
  userInventory: InventoryItem[];
  customizationItems: CustomizationItem[];
  storeAvatars: StoreAvatar[];
  poses: AvatarPoseConfig[];
  onToggleEquipItem: (itemId: string) => void;
  onRemoveItemFromInventory: (itemId: string) => void;
  onApplyPose: (poseId: string) => void;
  onRemovePose: (poseId: string) => void;
  onAcquireStoreAvatar: (avatarId: string) => void;
  onAcquireCustomItem: (item: CustomizationItem) => void;
  onPublishCustomItem: (item: Partial<CustomizationItem>) => void;
}

export const UserCustomizationView: React.FC<UserCustomizationViewProps> = ({
  onBackToLobby,
  user,
  onOpenAuthModal,
  initialTab = 'inventario',
  userInventory,
  customizationItems,
  storeAvatars,
  poses,
  onToggleEquipItem,
  onRemoveItemFromInventory,
  onApplyPose,
  onRemovePose,
  onAcquireStoreAvatar,
  onAcquireCustomItem,
  onPublishCustomItem,
}) => {
  // Navigation Tabs matching Image 2 & Image 3: 'loja' | 'inventario' | 'poses'
  const [activeTab, setActiveTab] = useState<'loja' | 'inventario' | 'poses'>(initialTab);

  // Currencies state
  const [coins, setCoins] = useState<number>(2450);
  const [gems, setGems] = useState<number>(180);

  // Cart state
  const [cart, setCart] = useState<Array<StoreAvatar | CustomizationItem>>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Selected avatar & pose
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    storeAvatars.find((a) => a.applied)?.id || storeAvatars[0]?.id || 'av-1'
  );

  const activePose = poses.find((p) => p.applied)?.name || 'Em pé';

  // Fine Adjustments ("Ajustes finos" matching Image 2 & Image 3)
  const [fineAdjustments, setFineAdjustments] = useState({
    panX: 0,
    panY: 0,
    rotationY: 0,
    scale: 1.0,
    elevationY: 0,
  });

  // Active fine adjust mode modal / slider trigger
  const [activeAdjustTool, setActiveAdjustTool] = useState<
    'mover' | 'rodar' | 'escalar' | 'elevar' | null
  >(null);

  // INVENTÁRIO TAB STATE (Matching Image 2)
  const [selectedCategory, setSelectedCategory] = useState<
    'chapeus' | 'casacos' | 'sapatos' | 'publicados' | 'todos'
  >('chapeus');

  // LOJA TAB STATE (Matching Image 3)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [newPublishName, setNewPublishName] = useState('');
  const [newPublishCategory, setNewPublishCategory] = useState<'chapeus' | 'casacos' | 'sapatos'>('chapeus');
  const [newPublishPrice, setNewPublishPrice] = useState(0);

  // Filter items in Inventário
  const filteredInventoryItems = customizationItems.filter((item) => {
    if (!item.owned) return false;
    if (selectedCategory === 'todos') return true;
    if (selectedCategory === 'publicados') return item.isPublishedByCreator;
    return item.category === selectedCategory;
  });

  // Filter avatars / items in Loja
  const filteredStoreAvatars = storeAvatars.filter((av) => {
    const matchesSearch = av.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || av.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const publishedCommunityItems = customizationItems.filter((i) => i.isPublishedByCreator);

  // Cart operations
  const addToCart = (item: StoreAvatar | CustomizationItem) => {
    if (cart.some((c) => c.id === item.id)) {
      showToast(`"${item.name}" já está no seu carrinho!`);
      return;
    }
    setCart((prev) => [...prev, item]);
    showToast(`"${item.name}" adicionado ao carrinho!`);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);
    if (coins < total) {
      showToast('Moedas insuficientes! Recarregue moedas ou escolha itens gratuitos.');
      return;
    }
    setCoins((prev) => prev - total);
    cart.forEach((item) => {
      if ('rarity' in item && 'tags' in item) {
        onAcquireStoreAvatar(item.id);
      } else {
        onAcquireCustomItem(item as CustomizationItem);
      }
    });
    setCart([]);
    setIsCartOpen(false);
    showToast('Compra finalizada com sucesso! Itens disponíveis no Inventário.');
  };

  const handleDirectAcquire = (item: CustomizationItem) => {
    onAcquireCustomItem(item);
    showToast(`Item "${item.name}" adquirido com sucesso! Já está no seu Inventário.`);
  };

  const handleCreatePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPublishName.trim()) return;

    const newItem: Partial<CustomizationItem> = {
      id: `pub-${Date.now()}`,
      code: `#P00${customizationItems.length + 1}`,
      name: newPublishName.trim(),
      category: newPublishCategory,
      thumb: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&q=80',
      owned: true,
      equipped: false,
      price: Number(newPublishPrice) || 0,
      rarity: 'RARO',
      isPublishedByCreator: true,
      author: user?.displayName || 'Luzenne',
      description: `Item exclusivo criado por ${user?.displayName || 'Luzenne'}.`,
    };

    onPublishCustomItem(newItem);
    setShowPublishModal(false);
    setNewPublishName('');
    showToast(`Item "${newItem.name}" publicado na Loja com sucesso!`);
  };

  const currentAvatar = storeAvatars.find((a) => a.id === selectedAvatarId) || storeAvatars[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0b0e] text-[#e8d5b5] font-sans flex flex-col select-none">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#1b1d24]/95 border border-[#d4af37] text-white text-xs font-semibold shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-[#ffd700]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER matching Image 2 & Image 3:
          Brand (Luzenne) | Currencies (2.450 / 180 / +) | Tabs (Loja, Inventário, Poses) | Cart (3) | Profile / Login */}
      <header className="relative z-30 h-16 border-b border-[#262833]/80 bg-[#0d0e12]/95 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0">
        {/* Left: Brand & Currencies */}
        <div className="flex items-center gap-6">
          {/* Back to Lobby Button */}
          <button
            type="button"
            onClick={onBackToLobby}
            className="flex items-center gap-2 text-xs font-medium text-[#c5a059] hover:text-white transition-colors cursor-pointer"
            title="Voltar ao Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Lobby</span>
          </button>

          {/* User Profile Avatar & Brand Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#d4af37]/60">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                alt="Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-xl md:text-2xl font-serif tracking-wide text-zinc-100 font-normal">
              {user?.displayName || 'Luzenne'}
            </h1>
          </div>

          {/* Currency HUD (Coin & Gem) */}
          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
            {/* Coins */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#14151b] border border-[#2b2d38]">
              <Coins className="w-3.5 h-3.5 text-[#ffd700]" />
              <span className="text-xs font-semibold text-zinc-200">{coins.toLocaleString('pt-BR')}</span>
            </div>

            {/* Gems */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#14151b] border border-[#2b2d38]">
              <Gem className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-zinc-200">{gems.toLocaleString('pt-BR')}</span>
            </div>

            {/* Quick Recharge "+" button */}
            <button
              type="button"
              onClick={() => {
                setCoins((prev) => prev + 1000);
                showToast('+1.000 moedas adicionadas com sucesso!');
              }}
              className="w-6 h-6 rounded-md bg-[#1f212a] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37] hover:text-black transition-colors cursor-pointer text-xs font-bold"
              title="Recarregar Moedas"
            >
              +
            </button>
          </div>
        </div>

        {/* Center: Main Navigation Tabs (Loja | Inventário | Poses) matching Image 2 & 3 */}
        <nav className="flex items-center gap-8 text-sm font-medium tracking-wide">
          <button
            type="button"
            onClick={() => setActiveTab('loja')}
            className={`relative py-5 transition-colors cursor-pointer ${
              activeTab === 'loja' ? 'text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Loja
            {activeTab === 'loja' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#d4af37] shadow-[0_0_8px_#d4af37]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventario')}
            className={`relative py-5 transition-colors cursor-pointer ${
              activeTab === 'inventario' ? 'text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Inventário
            {activeTab === 'inventario' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-white shadow-[0_0_8px_#ffffff]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('poses')}
            className={`relative py-5 transition-colors cursor-pointer ${
              activeTab === 'poses' ? 'text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Poses
            {activeTab === 'poses' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#d4af37] shadow-[0_0_8px_#d4af37]" />
            )}
          </button>
        </nav>

        {/* Right: Cart (3) & User Login/Cadastro Icon */}
        <div className="flex items-center gap-4">
          {/* Shopping Cart Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative w-10 h-10 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Abrir Carrinho"
          >
            <ShoppingCart className="w-4 h-4" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#d4af37] text-black text-[10px] font-bold flex items-center justify-center shadow-md">
                {cart.length}
              </span>
            )}
          </button>

          {/* User Account / Login / Cadastro Icon */}
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#d4af37]/40 bg-[#16171d] hover:bg-[#1f212a] text-zinc-300 hover:text-white transition-all cursor-pointer"
            title={user ? `Logado como ${user.displayName}` : 'Login / Cadastrar'}
          >
            <User className="w-4 h-4 text-[#d4af37]" />
            <span className="text-xs font-semibold hidden md:inline">
              {user && !user.isGuest ? user.displayName : 'Login / Cadastro'}
            </span>
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT: 3 COLUMNS MATCHING IMAGE 2 & IMAGE 3 */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================
            LEFT COLUMN: INVENTÁRIO OU LOJA DE ITENS
            ======================================================== */}
        <div className="w-full md:w-[420px] lg:w-[460px] border-r border-[#262833]/80 bg-[#0d0e12] flex flex-col overflow-hidden flex-shrink-0">
          {activeTab === 'inventario' ? (
            /* TAB: INVENTÁRIO (Exact Layout from Image 2) */
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {/* Header Title: "Comprados — todos os itens" & Filter Icon */}
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-sm md:text-base font-serif text-zinc-200 tracking-wide">
                  Comprados — todos os itens
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory((prev) => (prev === 'todos' ? 'chapeus' : 'todos'))
                  }
                  className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title="Filtrar todos os itens"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Category Pills: Chapéus | Casacos | Sapatos | Publicados */}
              <div className="flex items-center gap-6 pb-4 border-b border-white/5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('chapeus')}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 relative ${
                    selectedCategory === 'chapeus'
                      ? 'text-zinc-100 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>👒</span>
                  <span>Chapéus</span>
                  {selectedCategory === 'chapeus' && (
                    <span className="absolute -bottom-1 inset-x-0 h-0.5 bg-[#d4af37]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('casacos')}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 relative ${
                    selectedCategory === 'casacos'
                      ? 'text-zinc-100 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>🧥</span>
                  <span>Casacos</span>
                  {selectedCategory === 'casacos' && (
                    <span className="absolute -bottom-1 inset-x-0 h-0.5 bg-[#d4af37]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('sapatos')}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 relative ${
                    selectedCategory === 'sapatos'
                      ? 'text-zinc-100 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>👞</span>
                  <span>Sapatos</span>
                  {selectedCategory === 'sapatos' && (
                    <span className="absolute -bottom-1 inset-x-0 h-0.5 bg-[#d4af37]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('publicados')}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 relative ${
                    selectedCategory === 'publicados'
                      ? 'text-zinc-100 font-semibold text-[#d4af37]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>✨</span>
                  <span>Publicados</span>
                  {selectedCategory === 'publicados' && (
                    <span className="absolute -bottom-1 inset-x-0 h-0.5 bg-[#d4af37]" />
                  )}
                </button>
              </div>

              {/* Grid of Items matching Image 2 (3 columns) */}
              <div className="flex-1 overflow-y-auto pt-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="grid grid-cols-3 gap-3">
                  {filteredInventoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`relative rounded-xl border p-2 flex flex-col justify-between transition-all group ${
                        item.equipped
                          ? 'bg-[#15171e] border-[#d4af37]/80 ring-1 ring-[#d4af37]/40'
                          : 'bg-[#121317] border-[#22242d] hover:border-zinc-700'
                      }`}
                    >
                      {/* Code Tag (e.g. #H001, #C001, #S001) in soft cyan/teal matching Image 2 */}
                      <span className="text-[10px] font-mono font-medium text-[#14b8a6] px-1 py-0.5">
                        {item.code}
                      </span>

                      {/* Product Thumbnail on Dark Background */}
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#0d0e11] my-1 flex items-center justify-center">
                        <img
                          src={item.thumb}
                          alt={item.name}
                          className="w-full h-full object-cover filter contrast-110 brightness-95 group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        {item.equipped && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#d4af37] text-black flex items-center justify-center text-[10px] font-bold shadow-md">
                            ✓
                          </div>
                        )}
                      </div>

                      {/* Item Name */}
                      <p className="text-[11px] font-medium text-zinc-200 truncate mt-1 text-center">
                        {item.name}
                      </p>

                      {/* Action Button: Remover 🗑️ or Equipar / Equipado */}
                      <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleEquipItem(item.id)}
                          className={`w-full py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                            item.equipped
                              ? 'bg-[#d4af37] text-black hover:bg-amber-300'
                              : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                          }`}
                        >
                          {item.equipped ? (
                            <>
                              <span>Equipado</span>
                            </>
                          ) : (
                            <span>Equipar</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveItemFromInventory(item.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
                          title="Remover do Inventário"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredInventoryItems.length === 0 && (
                  <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center">
                    <p>Nenhum item nesta categoria ainda.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('loja')}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#ffd700] hover:bg-[#d4af37] hover:text-black transition-colors cursor-pointer text-xs font-semibold"
                    >
                      Explorar na Loja
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB: LOJA DE AVATARES E ITENS PUBLICADOS (Exact Layout from Image 3) */
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {/* Search Bar matching Image 3: "Buscar avatar..." + filter icon */}
              <div className="relative flex items-center mb-3">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar avatar ou item..."
                  className="w-full bg-[#13141a] border border-[#262833] rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#d4af37]/60 transition-colors"
                />
                <button
                  type="button"
                  className="absolute right-3 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Filter Chips: #formal, #noite, #luxo, #criador */}
              <div className="flex items-center gap-2 pb-3 overflow-x-auto scrollbar-none">
                {['#formal', '#noite', '#luxo', '#streetwear'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
                      selectedTag === tag
                        ? 'bg-[#14b8a6]/20 border-[#14b8a6] text-[#14b8a6]'
                        : 'bg-[#14151b] border-[#22242d] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}

                {/* Button to Publish user custom item */}
                <button
                  type="button"
                  onClick={() => setShowPublishModal(true)}
                  className="px-3 py-1 rounded-full text-[11px] font-medium bg-[#ffd700]/15 border border-[#ffd700]/50 text-[#ffd700] hover:bg-[#ffd700] hover:text-black transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0 ml-auto"
                >
                  <Plus className="w-3 h-3" />
                  <span>Publicar Item</span>
                </button>
              </div>

              {/* Section Title: AVATARES */}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  AVATARES
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {filteredStoreAvatars.length} disponíveis
                </span>
              </div>

              {/* Grid of Avatars matching Image 3 (2 columns) */}
              <div className="flex-1 overflow-y-auto pt-3 pr-1 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="grid grid-cols-2 gap-3">
                  {filteredStoreAvatars.map((av) => {
                    const isSelected = selectedAvatarId === av.id;
                    const inCart = cart.some((c) => c.id === av.id);

                    return (
                      <div
                        key={av.id}
                        onClick={() => setSelectedAvatarId(av.id)}
                        className={`rounded-xl border p-2.5 transition-all cursor-pointer flex flex-col justify-between group ${
                          isSelected
                            ? 'bg-[#171922] border-[#d4af37] ring-1 ring-[#d4af37]/60'
                            : 'bg-[#121317] border-[#22242d] hover:border-zinc-600'
                        }`}
                      >
                        {/* Thumbnail with Selection Checkmark */}
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#0d0e11] mb-2">
                          <img
                            src={av.thumb}
                            alt={av.name}
                            className="w-full h-full object-cover filter contrast-105 group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 text-[#ffd700]">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <h3 className="text-xs font-serif font-bold text-zinc-100 truncate mb-1">
                          {av.name}
                        </h3>

                        {/* Rarity Tag & Price */}
                        <div className="flex items-center justify-between text-[10px] mb-2">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono font-bold uppercase text-[9px] ${
                              av.rarity === 'ÉLITE'
                                ? 'bg-[#d4af37]/20 text-[#ffd700]'
                                : av.rarity === 'RARO'
                                ? 'bg-teal-950/80 text-teal-400'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {av.rarity}
                          </span>
                          <span className="font-semibold text-zinc-300 flex items-center gap-1 font-mono">
                            <span className="text-[#ffd700]">🪙</span> {av.price.toLocaleString('pt-BR')}
                          </span>
                        </div>

                        {/* Action Button: Aplicar or Carrinho 🛒 */}
                        {av.owned ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAcquireStoreAvatar(av.id);
                              showToast(`Avatar "${av.name}" aplicado!`);
                            }}
                            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              av.applied
                                ? 'bg-[#d4af37] text-black font-bold'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            }`}
                          >
                            {av.applied ? 'Aplicado' : 'Aplicar'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(av);
                            }}
                            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              inCart
                                ? 'bg-zinc-800 text-zinc-400'
                                : 'bg-[#1e2029] hover:bg-[#2b2d39] border border-white/10 text-zinc-200'
                            }`}
                          >
                            <span>{inCart ? 'No Carrinho' : 'Carrinho'}</span>
                            <ShoppingCart className="w-3 h-3 text-[#d4af37]" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ========================================================
                    ITENS PUBLICADOS PELO USUÁRIO (CRIADOR)
                    "se o usuario publicar item ele vai aparecer na loja como opção p ser adiquiro e esse item podem ser pego"
                    ======================================================== */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#ffd700]" />
                      <span className="text-[11px] font-bold tracking-wider text-[#ffd700] uppercase">
                        ITENS PUBLICADOS DA COMUNIDADE
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {publishedCommunityItems.length} itens
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-500 mb-3">
                    Itens criados e publicados por usuários. Qualquer usuário pode pegar e equipar no avatar.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {publishedCommunityItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#d4af37]/40 bg-[#14151b] p-2.5 flex flex-col justify-between"
                      >
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#0a0b0d] mb-2">
                          <img
                            src={item.thumb}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 border border-[#d4af37]/60 text-[9px] font-bold text-[#ffd700]">
                            CRIADOR
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-zinc-100 truncate">{item.name}</h4>
                        <p className="text-[10px] text-zinc-500 truncate mb-1">
                          Por {item.author || 'Luzenne'}
                        </p>

                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#ffd700] mb-2">
                          <span>{item.price && item.price > 0 ? `🪙 ${item.price}` : 'Grátis'}</span>
                          <span className="text-[9px] text-zinc-400 uppercase font-mono">{item.category}</span>
                        </div>

                        {/* Pegar Item Button */}
                        <button
                          type="button"
                          onClick={() => handleDirectAcquire(item)}
                          className="w-full py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#ffd700] hover:brightness-110 text-black text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-black" />
                          <span>Pegar Item</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            CENTER COLUMN: 3D INTERACTIVE PEDESTAL & FINE ADJUSTMENTS
            Matching Image 2 and Image 3
            ======================================================== */}
        <div className="flex-1 relative flex flex-col justify-between bg-gradient-to-b from-[#0b0c10] via-[#090a0d] to-[#050608] overflow-hidden">
          {/* Interactive 3D Avatar on Dark Obsidian Pedestal */}
          <div className="flex-1 relative w-full h-full">
            <AvatarPedestal3D
              currentPose={activePose}
              equippedItems={customizationItems.filter((i) => i.equipped)}
              avatarName={currentAvatar.name}
              fineAdjustments={fineAdjustments}
              onUpdateRotation={(rotY) =>
                setFineAdjustments((prev) => ({ ...prev, rotationY: rotY }))
              }
            />
          </div>

          {/* BOTTOM CONTROLS: "Ajustes finos" (Mover, Rodar, Escalar, Elevar) matching Image 2 & 3 */}
          <div className="relative z-20 px-8 pb-6 pt-2 flex flex-col items-center">
            {/* Fine Adjustments Card */}
            <div className="flex flex-col items-center mb-3">
              <span className="text-[11px] font-medium text-zinc-400 mb-2">Ajustes finos</span>
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#121318]/90 border border-white/10 backdrop-blur-md shadow-2xl">
                {/* Mover */}
                <button
                  type="button"
                  onClick={() =>
                    setFineAdjustments((prev) => ({
                      ...prev,
                      panX: (prev.panX + 0.1) % 0.4,
                    }))
                  }
                  className="flex flex-col items-center justify-center w-16 h-14 rounded-lg bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                >
                  <Move className="w-4 h-4 mb-1 text-zinc-400 group-hover:text-[#d4af37]" />
                  <span className="text-[10px] font-medium">Mover</span>
                </button>

                {/* Rodar */}
                <button
                  type="button"
                  onClick={() =>
                    setFineAdjustments((prev) => ({
                      ...prev,
                      rotationY: prev.rotationY + Math.PI / 4,
                    }))
                  }
                  className="flex flex-col items-center justify-center w-16 h-14 rounded-lg bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                >
                  <RotateCw className="w-4 h-4 mb-1 text-zinc-400 group-hover:text-[#d4af37]" />
                  <span className="text-[10px] font-medium">Rodar</span>
                </button>

                {/* Escalar */}
                <button
                  type="button"
                  onClick={() =>
                    setFineAdjustments((prev) => ({
                      ...prev,
                      scale: prev.scale === 1.0 ? 1.15 : prev.scale === 1.15 ? 0.9 : 1.0,
                    }))
                  }
                  className="flex flex-col items-center justify-center w-16 h-14 rounded-lg bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                >
                  <Maximize2 className="w-4 h-4 mb-1 text-zinc-400 group-hover:text-[#d4af37]" />
                  <span className="text-[10px] font-medium">Escalar</span>
                </button>

                {/* Elevar */}
                <button
                  type="button"
                  onClick={() =>
                    setFineAdjustments((prev) => ({
                      ...prev,
                      elevationY: (prev.elevationY + 0.08) % 0.32,
                    }))
                  }
                  className="flex flex-col items-center justify-center w-16 h-14 rounded-lg bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                >
                  <ArrowUp className="w-4 h-4 mb-1 text-zinc-400 group-hover:text-[#d4af37]" />
                  <span className="text-[10px] font-medium">Elevar</span>
                </button>
              </div>
            </div>

            {/* In Loja view: PROMINENT CTA BUTTON "Adicionar ao Carrinho" (Matching Image 3) */}
            {activeTab === 'loja' && (
              <button
                type="button"
                onClick={() => addToCart(currentAvatar)}
                className="w-full max-w-md py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#9e763b] via-[#b58c54] to-[#9e763b] text-black font-semibold text-sm tracking-wide shadow-[0_8px_25px_rgba(181,140,84,0.35)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4 text-black" />
                <span>Adicionar ao Carrinho</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: POSES DO AVATAR
            Matching Image 2: "Poses do Avatar" with cards (Em pé, Sentar, Deitar, Rindo)
            ======================================================== */}
        <div className="w-72 lg:w-80 border-l border-[#262833]/80 bg-[#0d0e12] p-6 flex flex-col overflow-hidden flex-shrink-0">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <h2 className="text-sm md:text-base font-serif text-zinc-200 tracking-wide">
              Poses do Avatar
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">{poses.length} poses</span>
          </div>

          <div className="flex-1 overflow-y-auto pt-4 pr-1 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
            {poses.map((pose) => (
              <div
                key={pose.id}
                className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                  pose.applied
                    ? 'bg-[#15171e] border-[#d4af37]/80 ring-1 ring-[#d4af37]/40'
                    : 'bg-[#121317] border-[#22242d] hover:border-zinc-700'
                }`}
              >
                {/* Pose Name */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-zinc-200">{pose.name}</span>
                  {pose.applied && (
                    <span className="text-[10px] font-mono text-[#d4af37] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ativa
                    </span>
                  )}
                </div>

                {/* Action Buttons: + Inserir & X Remover (matching Image 2) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyPose(pose.id);
                      showToast(`Pose "${pose.name}" aplicada ao Avatar!`);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      pose.applied
                        ? 'bg-[#d4af37] text-black font-bold'
                        : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Inserir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onRemovePose(pose.id);
                      showToast(`Pose "${pose.name}" desativada.`);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-900 border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          CART DRAWER / MODAL
          ======================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md h-full bg-[#121317] border-l border-[#d4af37]/40 p-6 flex flex-col justify-between shadow-2xl text-zinc-100">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#ffd700]" />
                  <h3 className="text-base font-serif font-bold text-white">Seu Carrinho</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#181920] border border-white/5 flex items-center justify-between gap-3"
                  >
                    <img
                      src={item.thumb}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-100 truncate">{item.name}</p>
                      <p className="text-[11px] font-mono text-[#ffd700]">
                        🪙 {item.price ? item.price.toLocaleString('pt-BR') : 'Grátis'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="py-16 text-center text-zinc-500 text-xs">
                    Seu carrinho está vazio. Adicione avatares e itens da loja.
                  </div>
                )}
              </div>
            </div>

            {/* Total and Checkout */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Total:</span>
                <span className="text-base font-bold text-[#ffd700] font-mono">
                  🪙 {cart.reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString('pt-BR')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-black font-bold text-sm tracking-wide shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 cursor-pointer"
              >
                Finalizar Aquisição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PUBLICAR NOVO ITEM NA LOJA MODAL
          ======================================================== */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="relative w-full max-w-md bg-[#14151b] border border-[#d4af37]/60 rounded-2xl p-6 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#ffd700]">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Publicar Item na Loja
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePublish} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nome do Item
                </label>
                <input
                  type="text"
                  value={newPublishName}
                  onChange={(e) => setNewPublishName(e.target.value)}
                  placeholder="Ex: Cartola Victorian Noir, Boina Elegance"
                  className="w-full bg-[#1b1c24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Categoria
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['chapeus', 'casacos', 'sapatos'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewPublishCategory(cat)}
                      className={`py-1.5 rounded-lg text-xs capitalize cursor-pointer border ${
                        newPublishCategory === cat
                          ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#ffd700] font-bold'
                          : 'bg-[#1b1c24] border-white/10 text-zinc-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Preço em Moedas (0 = Grátis para qualquer usuário pegar)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={newPublishPrice}
                  onChange={(e) => setNewPublishPrice(Number(e.target.value))}
                  className="w-full bg-[#1b1c24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-black font-bold text-xs shadow-md hover:brightness-110 cursor-pointer"
                >
                  Publicar na Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
