import React, { useState } from 'react';
import { X, Lock, Mail, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreatorUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CreatorUser | null;
  onAuthSuccess: (user: CreatorUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          onAuthSuccess({
            id: data.user.id,
            email: data.user.email || email,
            displayName: data.user.email?.split('@')[0] || 'Criador',
            isGuest: false,
          });
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          onAuthSuccess({
            id: data.user.id,
            email: data.user.email || email,
            displayName: data.user.email?.split('@')[0] || 'Criador',
            isGuest: false,
          });
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Supabase auth error:', err);
      setErrorMsg(err.message || 'Erro na autenticação. Verifique os dados ou use o modo Visitante.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser: CreatorUser = {
      id: `guest-${Date.now()}`,
      email: 'visitante@3dsocial.local',
      displayName: 'Visitante (Luzenne)',
      isGuest: true,
    };
    onAuthSuccess(guestUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-[#121317] border border-[#d4af37]/60 rounded-xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.9)] text-[#e8d5b5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#d4af37]" />
            <h2 className="text-sm font-semibold tracking-wider text-[#e8d5b5]">
              Autenticação Supabase
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#d4af37]/60 hover:text-[#d4af37] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex border-b border-[#d4af37]/20 my-4">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer border-b-2 ${
              mode === 'login'
                ? 'border-[#d4af37] text-[#ffd700]'
                : 'border-transparent text-[#d4af37]/50 hover:text-[#d4af37]'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer border-b-2 ${
              mode === 'signup'
                ? 'border-[#d4af37] text-[#ffd700]'
                : 'border-transparent text-[#d4af37]/50 hover:text-[#d4af37]'
            }`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#d4af37] mb-1">
              E-mail
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 text-[#d4af37]/50" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@dominio.com"
                className="w-full bg-[#16181e] border border-[#d4af37]/40 rounded-lg pl-9 pr-3 py-2 text-xs text-[#e8d5b5] placeholder:text-[#e8d5b5]/30 outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#d4af37] mb-1">
              Senha
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-[#d4af37]/50" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#16181e] border border-[#d4af37]/40 rounded-lg pl-9 pr-3 py-2 text-xs text-[#e8d5b5] placeholder:text-[#e8d5b5]/30 outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#d4af37] hover:bg-[#e2bd44] text-black text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4 text-xs text-[#d4af37]/40">
          <div className="flex-1 h-[1px] bg-[#d4af37]/20" />
          <span>ou</span>
          <div className="flex-1 h-[1px] bg-[#d4af37]/20" />
        </div>

        {/* Quick Guest mode */}
        <button
          type="button"
          onClick={handleGuestLogin}
          className="w-full py-2 rounded-lg border border-[#d4af37]/50 hover:border-[#d4af37] bg-black/40 hover:bg-[#d4af37]/10 text-xs font-semibold text-[#e8d5b5] hover:text-[#ffd700] transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>Continuar como Visitante (Luzenne)</span>
        </button>

        <p className="mt-4 text-[10px] text-center text-[#d4af37]/60 leading-relaxed">
          Conectado ao Supabase (`hvmhbwhshzbmkgwdznji`).
        </p>
      </div>
    </div>
  );
};
