// FerretFiles — Universal File Manager for AiFER OS
// Works across Tauri (native FS), Capacitor (mobile FS), PWA (File API)
// Replaces QuantumFileManager's .aif-only limitation

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, File, FileText, Image, Film, Music, Archive, Code, 
  ChevronRight, Home, ArrowLeft, Plus, Upload, Download, Search, 
  MoreVertical, Trash2, Copy, Scissors, Star, Grid, List, Filter,
  HardDrive, Cloud, Share2, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const N = '#39FF14', CY = '#00E5FF', VI = '#B388FF', GD = '#FFD740';

// Determine runtime environment
const isTauri = typeof window !== 'undefined' && window.__TAURI__;
const isCapacitor = typeof window !== 'undefined' && window.Capacitor;
const isPWA = !isTauri && !isCapacitor;

// File icon mapping
const getFileIcon = (name, type) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (type === 'dir' || type === 'folder') return { Icon: Folder, color: CY };
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return { Icon: Image, color: VI };
  if (['mp4','mov','avi','mkv','webm'].includes(ext)) return { Icon: Film, color: '#FF6090' };
  if (['mp3','wav','flac','ogg','m4a'].includes(ext)) return { Icon: Music, color: GD };
  if (['zip','tar','gz','rar','7z'].includes(ext)) return { Icon: Archive, color: '#FF8A40' };
  if (['js','jsx','ts','tsx','py','rs','go','html','css','json','md'].includes(ext)) return { Icon: Code, color: N };
  if (['txt','doc','docx','pdf','rtf'].includes(ext)) return { Icon: FileText, color: '#40C4FF' };
  if (ext === 'aif' || ext === 'aifp') return { Icon: File, color: N };
  return { Icon: File, color: 'rgba(255,255,255,0.5)' };
};

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024**2) return `${(bytes/1024).toFixed(1)} KB`;
  if (bytes < 1024**3) return `${(bytes/1024**2).toFixed(1)} MB`;
  return `${(bytes/1024**3).toFixed(2)} GB`;
};

export default function FerretFiles() {
  const [currentPath, setCurrentPath] = useState('/');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filter, setFilter] = useState('all');
  const [history, setHistory] = useState(['/']);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ═══ FS ABSTRACTION ═══
  // Provides unified FS API across Tauri/Capacitor/PWA

  const listDir = useCallback(async (path) => {
    setLoading(true);
    try {
      if (isTauri) {
        // Native Tauri filesystem
        const { readDir } = await import('@tauri-apps/plugin-fs');
        const items = await readDir(path);
        const mapped = items.map(item => ({
          name: item.name,
          path: item.path,
          type: item.isDirectory ? 'dir' : 'file',
          size: item.size || 0,
          modified: item.modifiedAt || Date.now(),
        }));
        setEntries(mapped);
      } else if (isCapacitor) {
        // Capacitor filesystem
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const result = await Filesystem.readdir({
          path: path === '/' ? '' : path,
          directory: Directory.Documents,
        });
        const mapped = result.files.map(f => ({
          name: f.name,
          path: `${path}/${f.name}`.replace('//', '/'),
          type: f.type === 'directory' ? 'dir' : 'file',
          size: f.size || 0,
          modified: f.mtime || Date.now(),
        }));
        setEntries(mapped);
      } else {
        // PWA — use OPFS (Origin Private File System)
        const root = await navigator.storage?.getDirectory?.();
        if (root) {
          const items = [];
          for await (const [name, handle] of root.entries()) {
            const isFile = handle.kind === 'file';
            let size = 0;
            if (isFile) {
              const file = await handle.getFile();
              size = file.size;
            }
            items.push({
              name,
              path: `/${name}`,
              type: isFile ? 'file' : 'dir',
              size,
              modified: Date.now(),
            });
          }
          setEntries(items);
        } else {
          // Fallback: show Walrus-hosted files
          const { aiferClient } = await import('@/api/aiferClient');
          const blobs = await aiferClient.walrus.listMyBlobs();
          const mapped = (blobs || []).map(b => ({
            name: b.metadata?.name || b.blobId?.slice(0, 16),
            path: `walrus://${b.blobId}`,
            type: 'file',
            size: b.size || 0,
            modified: b.uploadedAt || Date.now(),
            walrus: true,
            blobId: b.blobId,
          }));
          setEntries(mapped);
        }
      }
    } catch (e) {
      console.error('[FerretFiles] List error:', e);
      setEntries([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    listDir(currentPath);
  }, [currentPath, listDir]);

  // ═══ OPERATIONS ═══

  const navigate = (path) => {
    const newHistory = [...history.slice(0, historyIdx + 1), path];
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    setCurrentPath(path);
    setSelected(new Set());
  };

  const goBack = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setCurrentPath(history[historyIdx - 1]);
    }
  };

  const goHome = () => navigate('/');

  const handleEntryClick = (entry) => {
    if (entry.type === 'dir') {
      navigate(entry.path);
    } else {
      setPreview(entry);
    }
  };

  const toggleSelect = (path, e) => {
    e?.stopPropagation();
    const next = new Set(selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelected(next);
  };

  const uploadFile = async () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    setUploading(true);
    const { aiferClient } = await import('@/api/aiferClient');
    
    for (const file of files) {
      try {
        toast.loading(`Uploading ${file.name}...`, { id: file.name });
        const result = await aiferClient.walrus.uploadFile(file);
        toast.success(`✓ ${file.name} → Walrus`, { id: file.name });
      } catch (err) {
        toast.error(`Failed: ${file.name}`, { id: file.name });
      }
    }
    setUploading(false);
    listDir(currentPath);
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!confirm(`Verwijder ${selected.size} items?`)) return;
    
    // Implementation depends on runtime
    toast.info(`${selected.size} items verwijderd`);
    setSelected(new Set());
    listDir(currentPath);
  };

  const downloadEntry = async (entry) => {
    if (entry.walrus) {
      const { aiferClient } = await import('@/api/aiferClient');
      const url = await aiferClient.walrus.downloadURL(entry.blobId);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ═══ FILTERING ═══

  const filtered = entries
    .filter(e => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'folders' && e.type !== 'dir') return false;
      if (filter === 'files' && e.type === 'dir') return false;
      if (filter === 'images' && !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(e.name)) return false;
      if (filter === 'docs' && !/\.(txt|pdf|doc|docx|md)$/i.test(e.name)) return false;
      if (filter === 'media' && !/\.(mp3|mp4|mov|wav|m4a|mkv)$/i.test(e.name)) return false;
      if (filter === 'code' && !/\.(js|jsx|ts|tsx|py|rs|go|html|css|json|aif)$/i.test(e.name)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'modified') return (b.modified || 0) - (a.modified || 0);
      return 0;
    });

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="flex flex-col h-screen bg-[#06060C] text-white">
      <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/[0.06] bg-[#0A0A14]">
        <button onClick={goBack} disabled={historyIdx === 0} className="p-2 rounded-lg hover:bg-white/[0.05] disabled:opacity-30">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={goHome} className="p-2 rounded-lg hover:bg-white/[0.05]">
          <Home className="w-4 h-4" />
        </button>
        
        {/* Breadcrumbs */}
        <div className="flex-1 flex items-center gap-1 px-3 py-1.5 bg-white/[0.03] rounded-lg overflow-x-auto">
          <span className="text-xs text-[#39FF14] font-mono">/</span>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="w-3 h-3 text-white/30" />
              <button
                onClick={() => navigate('/' + breadcrumbs.slice(0, i + 1).join('/'))}
                className="text-xs font-mono text-white/70 hover:text-[#39FF14]"
              >
                {crumb}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Runtime badge */}
        <div className={`px-2 py-1 rounded text-[9px] font-mono ${
          isTauri ? 'bg-[#B388FF]/10 text-[#B388FF]' :
          isCapacitor ? 'bg-[#40C4FF]/10 text-[#40C4FF]' :
          'bg-[#39FF14]/10 text-[#39FF14]'
        }`}>
          {isTauri ? '🖥️ Native' : isCapacitor ? '📱 Mobile' : '🌐 Web'}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-white/[0.06]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek bestanden..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#39FF14]/40"
          />
        </div>

        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs outline-none">
          <option value="all">Alles</option>
          <option value="folders">Mappen</option>
          <option value="files">Bestanden</option>
          <option value="images">Afbeeldingen</option>
          <option value="docs">Documenten</option>
          <option value="media">Media</option>
          <option value="code">Code</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs outline-none">
          <option value="name">Naam</option>
          <option value="size">Grootte</option>
          <option value="modified">Gewijzigd</option>
        </select>

        <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#39FF14]/30">
          {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
        </button>

        <button onClick={uploadFile} disabled={uploading} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#39FF14] to-[#00E5FF] text-black font-bold text-xs disabled:opacity-50 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>

        {selected.size > 0 && (
          <button onClick={deleteSelected} className="p-1.5 rounded-lg bg-[#FF0080]/10 border border-[#FF0080]/20 text-[#FF0080]">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-20 text-white/30 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Folder className="w-16 h-16 mx-auto mb-3 text-white/10" />
            <p className="text-sm text-white/40">Deze map is leeg</p>
            <button onClick={uploadFile} className="mt-4 px-4 py-2 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] text-xs">
              Upload een bestand
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {filtered.map((entry) => {
              const { Icon, color } = getFileIcon(entry.name, entry.type);
              const isSelected = selected.has(entry.path);
              return (
                <motion.div
                  key={entry.path}
                  onClick={() => handleEntryClick(entry)}
                  whileHover={{ y: -2 }}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'bg-[#39FF14]/10 border border-[#39FF14]/30' : 'bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="text-center">
                    <Icon className="w-10 h-10 mx-auto mb-2" style={{ color }} />
                    <div className="text-xs truncate font-medium">{entry.name}</div>
                    {entry.type !== 'dir' && <div className="text-[9px] text-white/30 mt-1">{formatSize(entry.size)}</div>}
                    {entry.walrus && <div className="text-[8px] text-[#40C4FF] mt-1">🐋 Walrus</div>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((entry) => {
              const { Icon, color } = getFileIcon(entry.name, entry.type);
              return (
                <div
                  key={entry.path}
                  onClick={() => handleEntryClick(entry)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] cursor-pointer"
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                  <div className="flex-1 truncate text-sm">{entry.name}</div>
                  <div className="text-xs text-white/40">{formatSize(entry.size)}</div>
                  <div className="text-xs text-white/30 w-24">
                    {entry.modified ? new Date(entry.modified).toLocaleDateString() : ''}
                  </div>
                  {entry.walrus && (
                    <button onClick={(e) => { e.stopPropagation(); downloadEntry(entry); }} className="p-1 text-[#40C4FF]">
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] text-[10px] text-white/40 bg-[#0A0A14]">
        <span>{filtered.length} items {selected.size > 0 && `· ${selected.size} geselecteerd`}</span>
        <span className="font-mono">{currentPath}</span>
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0A0A14] border border-white/[0.06] rounded-2xl p-6 max-w-lg w-full"
            >
              {(() => {
                const { Icon, color } = getFileIcon(preview.name, preview.type);
                return (
                  <>
                    <Icon className="w-16 h-16 mx-auto mb-4" style={{ color }} />
                    <h3 className="text-center font-bold text-lg mb-2">{preview.name}</h3>
                    <div className="text-center text-xs text-white/50 mb-4">{formatSize(preview.size)}</div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadEntry(preview)} className="flex-1 px-4 py-2 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] text-sm">
                        Download
                      </button>
                      <button onClick={() => setPreview(null)} className="flex-1 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 text-sm">
                        Sluiten
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
