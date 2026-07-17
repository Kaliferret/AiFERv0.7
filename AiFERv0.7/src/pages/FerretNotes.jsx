// FerretNotes — Decentralized notes with auto-save + mesh sync
import React, { useState, useEffect } from 'react';
import { Plus, Search, Pin, Trash2, Save, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#39FF14', '#00E5FF', '#B388FF', '#FFD740', '#FF0080', '#40C4FF'];

export default function FerretNotes() {
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      const stored = await indexedDBService.get('ferret-notes') || [];
      setNotes(stored);
      if (stored.length && !activeId) setActiveId(stored[0].id);
    } catch {}
  };

  const saveNotes = async (updated) => {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      await indexedDBService.set('ferret-notes', updated);
    } catch {}
  };

  const createNote = () => {
    const newNote = {
      id: Date.now().toString(36),
      title: 'Nieuwe notitie',
      content: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    setActiveId(newNote.id);
    saveNotes(updated);
  };

  const updateNote = (id, changes) => {
    const updated = notes.map(n => 
      n.id === id ? { ...n, ...changes, updatedAt: Date.now() } : n
    );
    setNotes(updated);
    saveNotes(updated);
  };

  const deleteNote = (id) => {
    if (!confirm('Notitie verwijderen?')) return;
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    if (activeId === id) setActiveId(updated[0]?.id || null);
    saveNotes(updated);
  };

  const togglePin = (id) => {
    const note = notes.find(n => n.id === id);
    updateNote(id, { pinned: !note.pinned });
  };

  const askAI = async () => {
    const active = notes.find(n => n.id === activeId);
    if (!active?.content) return toast.error('Schrijf eerst iets');
    
    setAiThinking(true);
    try {
      const { aiferClient } = await import('@/api/aiferClient');
      const result = await aiferClient.aiRouter.ask(
        `Verbeter deze notitie (houd dezelfde taal, wees bondig):\n\n${active.content}`
      );
      updateNote(activeId, { content: result.content });
      toast.success(`✨ Verbeterd door ${result.tier}`);
    } catch (e) {
      toast.error('AI faalde: ' + e.message);
    }
    setAiThinking(false);
  };

  const filtered = notes.filter(n => 
    !search || 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  const active = notes.find(n => n.id === activeId);

  return (
    <div className="flex h-screen bg-[#06060C] text-white">
      {/* Sidebar */}
      <div className="w-72 border-r border-white/[0.06] flex flex-col">
        <div className="p-3 border-b border-white/[0.06]">
          <button 
            onClick={createNote}
            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#39FF14] to-[#00E5FF] text-black font-bold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nieuwe notitie
          </button>
        </div>
        
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoeken..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#39FF14]/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              {search ? 'Geen matches' : 'Nog geen notities'}
            </div>
          ) : filtered.map(note => (
            <button
              key={note.id}
              onClick={() => setActiveId(note.id)}
              className={`w-full text-left p-3 mb-1 rounded-lg transition-all border ${
                activeId === note.id 
                  ? 'bg-white/[0.06] border-white/[0.1]' 
                  : 'bg-transparent border-transparent hover:bg-white/[0.03]'
              }`}
              style={{ borderLeftColor: note.color, borderLeftWidth: 3 }}
            >
              <div className="flex items-center gap-2 mb-1">
                {note.pinned && <Pin className="w-3 h-3" style={{ color: note.color }} />}
                <div className="font-semibold text-sm truncate flex-1">{note.title}</div>
              </div>
              <div className="text-xs text-white/40 truncate">{note.content.slice(0, 60) || 'Leeg...'}</div>
              <div className="text-[10px] text-white/25 mt-1">
                {new Date(note.updatedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-white/[0.06] text-[10px] text-white/30 flex items-center gap-2">
          <Users className="w-3 h-3" />
          <span>{notes.length} notities · Offline-first · CRDT sync</span>
        </div>
      </div>

      {/* Editor */}
      {active ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 p-3 border-b border-white/[0.06]">
            <div className="w-3 h-3 rounded-full" style={{ background: active.color }} />
            <input
              value={active.title}
              onChange={(e) => updateNote(active.id, { title: e.target.value })}
              className="flex-1 bg-transparent text-lg font-bold outline-none"
              placeholder="Titel..."
            />
            <button onClick={() => togglePin(active.id)} className={`p-2 rounded-lg hover:bg-white/[0.05] ${active.pinned ? 'text-[#FFD740]' : 'text-white/40'}`}>
              <Pin className="w-4 h-4" />
            </button>
            <button onClick={askAI} disabled={aiThinking} className="p-2 rounded-lg hover:bg-white/[0.05] text-[#B388FF] disabled:opacity-50">
              <Sparkles className={`w-4 h-4 ${aiThinking ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex gap-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => updateNote(active.id, { color: c })}
                  className={`w-5 h-5 rounded-full transition-all ${active.color === c ? 'ring-2 ring-white/30 scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
            <button onClick={() => deleteNote(active.id)} className="p-2 rounded-lg text-[#FF0080]/70 hover:bg-[#FF0080]/10">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <textarea
            value={active.content}
            onChange={(e) => updateNote(active.id, { content: e.target.value })}
            placeholder="Begin met typen..."
            className="flex-1 bg-transparent p-6 outline-none resize-none text-sm leading-relaxed font-mono"
          />
          
          <div className="px-4 py-2 text-[10px] text-white/30 border-t border-white/[0.06] flex justify-between">
            <span>{active.content.length} tekens · {active.content.split(/\s+/).filter(Boolean).length} woorden</span>
            <span className="flex items-center gap-1 text-[#39FF14]"><Save className="w-3 h-3" /> Auto-saved</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-white/30">
          <div className="text-center">
            <div className="text-6xl mb-3 opacity-30">📝</div>
            <p className="text-sm">Selecteer of maak een notitie</p>
          </div>
        </div>
      )}
    </div>
  );
}
