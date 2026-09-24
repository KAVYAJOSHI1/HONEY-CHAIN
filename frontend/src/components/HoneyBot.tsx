"use client";
import { useState } from 'react';

interface HoneyBotProps {
  hiveId?: string;
}

export default function HoneyBot({ hiveId }: HoneyBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: `Bzzzt! I am HoneyBot AI 🐝. Ask me anything about hive health, harvest predictions, Varroa treatments, or blockchain verification!` }
  ]);
  const [loading, setLoading] = useState(false);

  const [chips, setChips] = useState<string[]>(["Unhealthy Hives", "Harvest Ready", "Varroa Risk", "Today's Alerts", "Batch Verification"]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    setQuery('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/honeybot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
        if (data.chips) setChips(data.chips);
      } else {
        setMessages(prev => [...prev, { sender: 'bot', text: "Apologies, I encountered an issue querying the hive intelligence network." }]);
      }
    } catch {
      setMessages(prev => [...prev, { sender: 'bot', text: "Apologies, I had trouble connecting to the hive intelligence node." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(query);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold px-4 py-3 rounded-full shadow-2xl flex items-center space-x-2 border-2 border-amber-300 transition-all hover:scale-105"
        >
          <span className="text-xl">🐝</span>
          <span className="text-xs tracking-wide uppercase">HoneyBot AI</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-950 animate-ping"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[460px] animate-in fade-in slide-in-from-bottom-4">
          
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🐝</span>
              <div>
                <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">HoneyBot AI Assistant</h3>
                <span className="text-[10px] text-emerald-400 font-mono">Apiary Knowledge Engine Active</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl ${m.sender === 'user' ? 'bg-amber-500 text-slate-950 font-semibold rounded-tr-none' : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none leading-relaxed'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-950 p-3 rounded-2xl text-amber-400 border border-slate-800 text-xs font-mono animate-pulse">
                  HoneyBot is analyzing colony metrics...
                </div>
              </div>
            )}
          </div>

          {/* Prompt Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/80 flex space-x-1.5 overflow-x-auto text-[10px] no-scrollbar">
            {chips.map((chip, idx) => (
              <button 
                key={idx}
                onClick={() => sendQuery(chip)} 
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-md whitespace-nowrap transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex space-x-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask HoneyBot AI..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-amber-500 outline-none"
            />
            <button type="submit" className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl">
              Send
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
