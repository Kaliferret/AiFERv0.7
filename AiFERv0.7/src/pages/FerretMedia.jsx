// FerretMedia — Music/video player with mesh broadcast
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Video, Upload, Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Radio, Users } from 'lucide-react';
import { GlassCard, NeonButton, NeonBadge, TOKENS, NeonGlobalStyles, NeonProgress } from '@/components/ui/neon-ui';

const { colors: C, bg } = TOKENS;

export default function FerretMedia() {
  const [library, setLibrary] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [broadcast, setBroadcast] = useState(false);
  const [listeners, setListeners] = useState(0);
  const mediaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadLibrary(); }, []);

  const loadLibrary = async () => {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      const stored = await indexedDBService.get('ferret-media') || [];
      setLibrary(stored);
    } catch {}
  };

  const saveLibrary = async (updated) => {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      await indexedDBService.set('ferret-media', updated);
    } catch {}
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const processed = await Promise.all(files.map(async f => {
      const dataUrl = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(f);
      });
      return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: f.name.replace(/\.[^.]+$/, ''),
        type: f.type.startsWith('video') ? 'video' : 'audio',
        size: f.size,
        dataUrl,
        addedAt: Date.now(),
      };
    }));
    const updated = [...library, ...processed];
    setLibrary(updated);
    saveLibrary(updated);
  };

  const play = (item) => {
    setCurrent(item);
    setPlaying(true);
    if (broadcast) broadcastCurrent(item);
  };

  const togglePlay = () => {
    if (!mediaRef.current || !current) return;
    if (playing) mediaRef.current.pause();
    else mediaRef.current.play();
    setPlaying(!playing);
  };

  const seek = (pct) => {
    if (!mediaRef.current || !duration) return;
    mediaRef.current.currentTime = (pct / 100) * duration;
  };

  const next = () => {
    if (!current) return;
    const idx = library.findIndex(l => l.id === current.id);
    if (idx < library.length - 1) play(library[idx + 1]);
  };

  const prev = () => {
    if (!current) return;
    const idx = library.findIndex(l => l.id === current.id);
    if (idx > 0) play(library[idx - 1]);
  };

  const broadcastCurrent = async (item) => {
    try {
      const { ferMesh } = await import('@/services/ferMeshService');
      ferMesh.emit('mediaBroadcast', { action: 'play', track: item.name, timestamp: Date.now() });
    } catch {}
  };

  const toggleBroadcast = async () => {
    setBroadcast(!broadcast);
    if (!broadcast) {
      try {
        const { ferMesh } = await import('@/services/ferMeshService');
        const peers = ferMesh.getPeers();
        setListeners(peers.length);
      } catch {}
    }
  };

  useEffect(() => {
    const m = mediaRef.current;
    if (!m) return;
    
    const onTime = () => {
      setProgress((m.currentTime / m.duration) * 100 || 0);
      setDuration(m.duration || 0);
    };
    const onEnd = () => next();
    
    m.addEventListener('timeupdate', onTime);
    m.addEventListener('ended', onEnd);
    m.volume = volume;
    
    return () => {
      m.removeEventListener('timeupdate', onTime);
      m.removeEventListener('ended', onEnd);
    };
  }, [current, volume]);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: bg.deep, color: '#fff', padding: 20, paddingBottom: 120, fontFamily: "'Outfit',system-ui" }}>
      <NeonGlobalStyles />
      <input ref={fileInputRef} type="file" multiple accept="audio/*,video/*" onChange={handleUpload} style={{ display: 'none' }} />
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Music style={{ color: C.magenta, width: 24 }} />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Ferret<span style={{ color: C.magenta }}>Media</span></h1>
        <NeonBadge color="magenta">{library.length} tracks</NeonBadge>
        <div style={{ flex: 1 }} />
        <NeonButton variant={broadcast ? 'danger' : 'ghost'} onClick={toggleBroadcast}>
          <Radio size={14} /> {broadcast ? `Broadcasting (${listeners})` : 'Start Broadcast'}
        </NeonButton>
        <NeonButton variant="primary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> Add Media
        </NeonButton>
      </div>

      {/* Library */}
      {library.length === 0 ? (
        <GlassCard style={{ padding: 60, textAlign: 'center' }}>
          <Music size={48} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 12 }} />
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Library is leeg — upload muziek of video</div>
        </GlassCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {library.map(item => (
            <motion.div
              key={item.id}
              whileHover={{ y: -3 }}
              onClick={() => play(item)}
              style={{
                padding: 14, background: current?.id === item.id ? `${C.magenta}15` : bg.card,
                border: `1px solid ${current?.id === item.id ? C.magenta + '50' : TOKENS.border.subtle}`,
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: `${C.magenta}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {item.type === 'video' ? <Video size={20} color={C.magenta} /> : <Music size={20} color={C.magenta} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{(item.size / 1048576).toFixed(1)} MB · {item.type}</div>
              </div>
              {current?.id === item.id && playing && (
                <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {[1, 2, 3].map(i => (
                    <motion.div key={i}
                      animate={{ scaleY: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      style={{ width: 2, height: 14, background: C.magenta, borderRadius: 1 }} />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Now playing bar */}
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: `${bg.deep}f0`, borderTop: `1px solid ${C.magenta}30`,
              padding: 12, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}
          >
            <div style={{ flex: '0 0 200px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current.name}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                {current.type} {broadcast && '· 🔴 Broadcasting'}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                <button onClick={prev} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}>
                  <SkipBack size={16} />
                </button>
                <button onClick={togglePlay} style={{
                  padding: 10, background: C.magenta, border: 'none', borderRadius: '50%',
                  cursor: 'pointer', color: '#000', boxShadow: `0 0 20px ${C.magenta}60`
                }}>
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button onClick={next} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}>
                  <SkipForward size={16} />
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono'", color: 'rgba(255,255,255,0.5)' }}>
                  {formatTime((progress / 100) * duration)}
                </span>
                <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seek(((e.clientX - rect.left) / rect.width) * 100);
                  }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: C.magenta, borderRadius: 2, boxShadow: `0 0 8px ${C.magenta}` }} />
                </div>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono'", color: 'rgba(255,255,255,0.5)' }}>
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 120px' }}>
              <Volume2 size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: C.magenta }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden media element */}
      {current && (current.type === 'audio' ? (
        <audio ref={mediaRef} src={current.dataUrl} autoPlay />
      ) : (
        <video ref={mediaRef} src={current.dataUrl} autoPlay style={{ display: 'none' }} />
      ))}
    </div>
  );
}
