import React, { useState, useRef, useEffect } from 'react';
import { Smile, Send } from 'lucide-react';
import { ChatMessage } from '../types';

interface GlassChatProps {
  roomName: string;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const GlassChat: React.FC<GlassChatProps> = ({
  roomName,
  messages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      id="glass-chat-panel"
      className="w-72 md:w-80 bg-[#16171acc]/85 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-2xl flex flex-col justify-between text-white font-sans max-h-[500px]"
    >
      {/* Chat Header matching Reference 1: "Sala Lounge" */}
      <div className="pb-3 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-base font-medium tracking-wide text-zinc-100">
          Sala {roomName}
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>online</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-3 group">
            {/* Avatar thumbnail */}
            <img
              src={msg.avatarUrl}
              alt={msg.user}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-white/15 flex-shrink-0"
              referrerPolicy="no-referrer"
            />

            {/* Message Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold text-[#facc15] tracking-wide truncate">
                  {msg.user}
                </span>
                <span className="text-[10px] text-zinc-400 select-none">
                  {msg.time}
                </span>
              </div>
              <p className="text-sm text-zinc-200 leading-snug break-words">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar matching Reference 1: "Digite uma mensagem..." + emoji + submit */}
      <form onSubmit={handleSubmit} className="pt-2">
        <div className="relative flex items-center bg-[#212328]/90 rounded-xl border border-white/10 px-3 py-2 focus-within:border-[#ffd700]/50 transition-colors">
          <input
            id="chat-message-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none pr-14"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setInputText((prev) => prev + ' 😊')}
              className="p-1 text-zinc-400 hover:text-[#ffd700] transition-colors cursor-pointer"
              title="Inserir emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Enviar mensagem"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
