import React, { useState } from 'react';
import { X, Box, Image as ImageIcon, Check, Upload, Sparkles } from 'lucide-react';
import { InventoryItem } from '../types';

interface UploadGLBModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (
    item: InventoryItem,
    autoInsertPoint?: [number, number, number] | null
  ) => void;
  userDisplayName?: string;
  insertionPoint?: [number, number, number] | null;
  onPublishToStore?: (item: InventoryItem) => void;
}

export const UploadGLBModal: React.FC<UploadGLBModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  userDisplayName = 'Luzenne',
  insertionPoint,
  onPublishToStore,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [selectedType, setSelectedType] = useState<'Sala' | 'Avatar' | 'Item'>('Item');
  const [uploadedItem, setUploadedItem] = useState<InventoryItem | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      // Strictly preserve and set the exact file name (e.g. "man" for "man.glb")
      const baseName = f.name.replace(/\.[^/.]+$/, '').trim();
      setDisplayName(baseName);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDisplayName = displayName.trim() || (file ? file.name.replace(/\.[^/.]+$/, '').trim() : 'Objeto 3D');
    const finalFileName = file ? file.name : `${finalDisplayName.toLowerCase().replace(/\s+/g, '_')}.glb`;

    let finalThumb = thumbUrl.trim();
    if (!finalThumb) {
      if (selectedType === 'Sala') {
        finalThumb = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80';
      } else if (selectedType === 'Avatar') {
        finalThumb = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
      } else {
        finalThumb = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80';
      }
    }

    const blobUrl = file ? URL.createObjectURL(file) : undefined;

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      fileName: finalFileName,
      displayName: finalDisplayName,
      thumbUrl: finalThumb,
      type: selectedType,
      createdAt: 'Agora',
      isScenario: selectedType === 'Sala',
      fileBlobUrl: blobUrl,
      modelType: 'custom_glb',
    };

    setUploadedItem(newItem);
  };

  const handleFinishSaveOnly = () => {
    if (!uploadedItem) return;
    onUploadSuccess(uploadedItem, null);
    setUploadedItem(null);
    onClose();
  };

  const handleFinishInsertNow = () => {
    if (!uploadedItem) return;
    const pointToUse =
      insertionPoint ? insertionPoint : ([0, 0, 0] as [number, number, number]);
    onUploadSuccess(uploadedItem, pointToUse);
    setUploadedItem(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-6 animate-fade-in font-sans">
      <div className="relative w-full max-w-3xl md:max-w-4xl bg-[#121317] border border-[#d4af37]/60 rounded-2xl p-6 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.95)] text-[#e8d5b5]">
        {/* Header HUD: User / Coins / Close */}
        <div className="flex items-center justify-between pb-4 border-b border-[#d4af37]/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-[#d4af37]/80 flex items-center justify-center text-sm text-[#ffd700] bg-[#1a1c24]">
              👤
            </div>
            <span className="text-sm md:text-base font-bold text-[#e8d5b5]">
              {userDisplayName}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#ffd700]">
              <span className="w-4 h-4 rounded-full border border-[#d4af37] flex items-center justify-center text-[10px]">
                $
              </span>
              <span>2.450</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-purple-400">
              <span className="w-3.5 h-3.5 rotate-45 border border-purple-400" />
              <span>180</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#d4af37]/70 hover:text-[#ffd700] hover:bg-[#d4af37]/15 transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Title: ENVIAR ARQUIVO 3D */}
        <h1 className="text-lg md:text-xl font-extrabold tracking-wide text-[#ffd700] uppercase my-4">
          ENVIAR ARQUIVO 3D (GLB / GLTF)
        </h1>

        {uploadedItem ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-5">
            <div className="w-16 h-16 rounded-full border-2 border-[#ffd700] bg-[#ffd700]/10 flex items-center justify-center text-[#ffd700] shadow-[0_0_25px_rgba(255,215,0,0.3)]">
              <Check className="w-9 h-9" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-base font-extrabold text-[#ffd700] uppercase tracking-wider">
                Upload concluído com sucesso!
              </p>
              <p className="text-sm text-[#e8d5b5]">
                <strong className="text-white">"{uploadedItem.displayName}"</strong> foi adicionado ao seu inventário.
              </p>
              <p className="text-xs text-[#e8d5b5]/70 max-w-md mx-auto">
                Você decide se deseja colocá-lo agora no ambiente 3D ou mantê-lo apenas guardado na sua biblioteca para usar quando quiser.
              </p>
            </div>

            {/* Action Buttons: Insert Now vs Publish to Store vs Keep in Library */}
            <div className="w-full max-w-md flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={handleFinishInsertNow}
                className="w-full py-3 px-4 rounded-xl bg-[#ffd700] hover:bg-amber-300 active:scale-[0.99] text-black font-extrabold text-sm tracking-wide uppercase transition-all shadow-[0_4px_20px_rgba(255,215,0,0.35)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>➕</span>
                <span>
                  {uploadedItem.type === 'Sala'
                    ? 'Aplicar como Cenário 3D Agora'
                    : 'Inserir na Cena 3D Agora'}
                </span>
              </button>

              {onPublishToStore && (
                <button
                  type="button"
                  onClick={() => {
                    if (uploadedItem) {
                      onPublishToStore(uploadedItem);
                      onUploadSuccess(uploadedItem, null);
                      setUploadedItem(null);
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4af37]/30 to-[#ffd700]/30 hover:from-[#d4af37]/50 hover:to-[#ffd700]/50 border border-[#ffd700] text-[#ffd700] font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-4 h-4 text-[#ffd700]" />
                  <span>Publicar na Loja (Opção para ser Adquirido)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleFinishSaveOnly}
                className="w-full py-2.5 px-4 rounded-xl bg-black/40 hover:bg-black/60 border border-[#d4af37]/40 hover:border-[#ffd700] text-[#e8d5b5] font-semibold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📁</span>
                <span>Guardar apenas no Inventário (Não Inserir)</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Outer box with fine gold border */}
            <div className="border border-[#d4af37]/40 rounded-xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/50">
              {/* Left Side: Dotted Dropzone */}
              <div className="relative border-2 border-dashed border-[#d4af37]/60 rounded-xl p-6 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-[#d4af37]/10 transition-colors">
                <input
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                {/* Wireframe Cube Icon */}
                <div className="mb-3 text-[#ffd700] group-hover:scale-105 transition-transform">
                  <Box className="w-14 h-14 stroke-[1.5]" />
                </div>

                <p className="text-sm font-bold text-[#ffd700] mb-2 px-2 break-all">
                  {file ? file.name : 'Solte o arquivo GLB aqui'}
                </p>

                <p className="text-xs text-[#e8d5b5]/70 mb-3">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Clique para procurar em seu computador'}
                </p>

                <div className="px-4 py-2 rounded-lg border border-[#d4af37] text-[#ffd700] text-xs md:text-sm font-bold bg-[#14151a] group-hover:bg-[#d4af37] group-hover:text-black transition-colors flex items-center gap-2 shadow-sm">
                  <Upload className="w-4 h-4" />
                  <span>{file ? 'Trocar arquivo selecionado' : 'Selecionar arquivo do disco'}</span>
                </div>
              </div>

              {/* Right Side: Form Inputs */}
              <div className="space-y-4 flex flex-col justify-between">
                {/* Nome de exibição */}
                <div>
                  <label className="block text-xs md:text-sm font-bold text-[#ffd700] mb-1.5">
                    Nome do arquivo / Objeto na cena
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: man, mesa_moderna, predio"
                    className="w-full bg-[#181a22] border border-[#d4af37]/50 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-[#ffd700] placeholder:text-[#e8d5b5]/30 outline-none focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700]"
                  />
                  <span className="text-xs text-[#e8d5b5]/60 mt-1 block">
                    O nome acima será usado fielmente no inventário e no cenário.
                  </span>
                </div>

                {/* Imagem de capa */}
                <div>
                  <label className="block text-xs font-medium text-[#d4af37] mb-1">
                    Imagem de capa
                  </label>
                  <div className="flex items-center gap-2.5">
                    <div className="w-16 h-10 border border-[#d4af37]/40 rounded-md flex items-center justify-center text-[#d4af37] bg-black/60 overflow-hidden flex-shrink-0">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 stroke-[1.5]" />
                      )}
                    </div>
                    <input
                      type="url"
                      value={thumbUrl}
                      onChange={(e) => setThumbUrl(e.target.value)}
                      placeholder="URL da miniatura (opcional)"
                      className="flex-1 bg-[#16181e] border border-[#d4af37]/40 rounded-lg px-3 py-2 text-xs text-[#e8d5b5] placeholder:text-[#e8d5b5]/30 outline-none"
                    />
                  </div>
                </div>

                {/* Tipo Selector: [ Sala ] [ Avatar ] [ Item ] */}
                <div>
                  <label className="block text-xs md:text-sm font-bold text-[#ffd700] mb-1.5">
                    Tipo do produto 3D
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Sala', 'Avatar', 'Item'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedType(t)}
                        className={`py-2 text-xs md:text-sm font-bold rounded-lg border transition-all cursor-pointer ${
                          selectedType === t
                            ? 'bg-[#d4af37] text-black border-[#ffd700] shadow-md'
                            : 'border-[#d4af37]/40 text-[#e8d5b5]/80 hover:border-[#ffd700] bg-[#161820]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-[#d4af37]/80 mt-1.5 leading-relaxed">
                    {selectedType === 'Sala'
                      ? 'Sala: cenário 3D da room (paredes, arquitetura e piso).'
                      : selectedType === 'Avatar'
                      ? 'Avatar: modelo usado para o visitante interagir nos spots.'
                      : 'Item: móvel ou objeto inserível em qualquer ponto clicado na cena.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#d4af37] hover:bg-[#e2bd44] active:scale-[0.99] text-black text-sm font-extrabold tracking-wider uppercase transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              <span>Enviar Arquivo 3D para o Inventário</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
