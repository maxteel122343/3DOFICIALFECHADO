import React, { useState } from 'react';
import { X, Box, Image as ImageIcon, Check, Upload } from 'lucide-react';
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
}

export const UploadGLBModal: React.FC<UploadGLBModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  userDisplayName = 'Luzenne',
  insertionPoint,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [selectedType, setSelectedType] = useState<'Sala' | 'Avatar' | 'Item'>('Item');
  const [autoInsertAtMarkedPoint, setAutoInsertAtMarkedPoint] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

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

    setIsSuccess(true);
    setTimeout(() => {
      const pointToUse =
        selectedType === 'Item' && autoInsertAtMarkedPoint && insertionPoint
          ? insertionPoint
          : selectedType === 'Item' && autoInsertAtMarkedPoint
          ? ([0, 0.0, 0] as [number, number, number])
          : null;
      onUploadSuccess(newItem, pointToUse);
      setIsSuccess(false);
      onClose();
    }, 500);
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

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-[#d4af37] flex items-center justify-center text-[#d4af37]">
              <Check className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-[#e8d5b5] uppercase tracking-wider">
              Arquivo salvo no Inventário com sucesso!
            </p>
            <p className="text-xs text-[#d4af37]/80">
              Pronto para carregar como cenário da sala ou inserir na cena 3D.
            </p>
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
                    O nome acima será usado fielmente no cenário e na lista de objetos.
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
                      ? 'Sala: carrega como o cenário 3D da room (paredes, arquitetura e piso).'
                      : selectedType === 'Avatar'
                      ? 'Avatar: modelo usado para o visitante interagir nos spots.'
                      : 'Item: móvel ou objeto inserível em qualquer ponto clicado na cena.'}
                  </p>

                  {/* Insertion point indicator for Items */}
                  {selectedType === 'Item' && (
                    <div className="mt-2.5 p-2.5 rounded-lg border border-[#d4af37]/50 bg-[#d4af37]/10 text-xs">
                      {insertionPoint ? (
                        <label className="flex items-center gap-2 cursor-pointer text-[#ffd700]">
                          <input
                            type="checkbox"
                            checked={autoInsertAtMarkedPoint}
                            onChange={(e) => setAutoInsertAtMarkedPoint(e.target.checked)}
                            className="accent-[#d4af37] w-4 h-4 rounded"
                          />
                          <span className="font-bold text-xs">
                            Inserir no ponto marcado [X: {insertionPoint[0]}m, Z: {insertionPoint[2]}m]
                          </span>
                        </label>
                      ) : (
                        <span className="text-xs text-[#e8d5b5]/80 block">
                          📍 O item nascerá no centro da sala. (Você também pode clicar no piso antes de enviar para marcar um ponto).
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#d4af37] hover:bg-[#e2bd44] active:scale-[0.99] text-black text-sm font-extrabold tracking-wider uppercase transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              <span>
                {selectedType === 'Item' && autoInsertAtMarkedPoint
                  ? insertionPoint
                    ? 'Enviar e inserir no ponto marcado'
                    : 'Enviar e inserir no centro da sala'
                  : selectedType === 'Sala'
                  ? 'Carregar como cenário 3D da room'
                  : 'Publicar no inventário'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
