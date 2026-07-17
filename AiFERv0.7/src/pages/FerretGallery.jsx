// FerretGallery — Photo/video viewer with mesh sharing
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, Upload, Grid3x3, List, X, Download, Share2, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { GlassCard, NeonButton, NeonBadge, TOKENS, NeonGlobalStyles } from '@/components/ui/neon-ui';

const { colors: C, bg } = TOKENS;

export default function FerretGallery() {
  const [media, setMedia] = useState([]);
  const [view, setView] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadMedia(); }, []);

  const loadMedia = async () => {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      const stored = await indexedDBService.get('ferret-gallery') || [];
      setMedia(stored);
    } catch {}
  };

  const saveMedia = async (updated) => {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      await indexedDBService.set('ferret-gallery', updated);
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
        name: f.name,
        type: f.type.startsWith('video') ? 'video' : 'image',
        size: f.size,
        dataUrl,
        uploadedAt: Date.now(),
      };
    }));
    
    const updated = [...processed, ...media];
    setMedia(updated);
    saveMedia(updated);
  };

  const shareToMesh = async (item) => {
    try {
      const { ferMesh } = await import('@/services/ferMeshService');
      await ferMesh.shareFile(item.name, item.dataUrl, item.type);
      alert('Gedeeld naar mesh!');
    } catch (e) { alert('Share failed: ' + e.message); }
  };

  const download = (item) => {
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = item.name;
    a.click();
  };

  const remove = (id) => {
    if (!confirm('Remove from gallery?')) return;
    const updated = media.filter(m => m.id !== id);
    setMedia(updated);
    saveMedia(updated);
    if (lightbox?.id === id) setLightbox(null);
  };

  const filtered = media.filter(m =>
    filter === 'all' || m.type === filter
  );

  const navigateLightbox = (dir) => {
    if (!lightbox) return;
    const idx = filtered.findIndex(m => m.id === lightbox.id);
    const next = (idx + dir + filtered.length) % filtered.length;
    setLightbox(filtered[next]);
  };

  return (
    <div style={{ minHeight: '100vh', background: bg.deep, color: '#fff', padding: 20, fontFamily: "'Outfit',system-ui" }}>
      <NeonGlobalStyles />
      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleUpload} style={{ display: 'none' }} />
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image style={{ color: C.violet, width: 24 }} />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Ferret<span style={{ color: C.violet }}>Gallery</span></h1>
          <NeonBadge color="violet">{media.length}</NeonBadge>
        </div>
        
        <div style={{ flex: 1 }} />
        
        <div style={{ display: 'flex', gap: 4, padding: 3, background: bg.subtle, borderRadius: 10 }}>
          {['all', 'image', 'video'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: filter === f ? `${C.violet}25` : 'transparent',
              color: filter === f ? C.violet : 'rgba(255,255,255,0.5)',
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            }}>
              {f}
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setView('grid')} style={{ padding: 8, border: `1px solid ${TOKENS.border.subtle}`, borderRadius: 8, background: view === 'grid' ? C.violet + '15' : 'transparent', color: view === 'grid' ? C.violet : '#fff', cursor: 'pointer' }}>
            <Grid3x3 size={16} />
          </button>
          <button onClick={() => setView('list')} style={{ padding: 8, border: `1px solid ${TOKENS.border.subtle}`, borderRadius: 8, background: view === 'list' ? C.violet + '15' : 'transparent', color: view === 'list' ? C.violet : '#fff', cursor: 'pointer' }}>
            <List size={16} />
          </button>
        </div>
        
        <NeonButton variant="primary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> Upload
        </NeonButton>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <GlassCard style={{ padding: 60, textAlign: 'center' }}>
          <Image size={48} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 12 }} />
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 16 }}>
            {filter !== 'all' ? `Geen ${filter}s in de gallery` : 'Gallery is leeg — upload foto\'s of video\'s'}
          </div>
          <NeonButton variant="ghost" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Upload first media
          </NeonButton>
        </GlassCard>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {filtered.map(item => (
            <motion.div
              key={item.id}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => setLightbox(item)}
              style={{
                aspectRatio: '1', position: 'relative', cursor: 'pointer',
                borderRadius: 12, overflow: 'hidden', background: bg.subtle,
                border: `1px solid ${TOKENS.border.subtle}`,
              }}
            >
              {item.type === 'video' ? (
                <>
                  <video src={item.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                    width: 40, height: 40, borderRadius: '50%', background: `${C.neon}88`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={18} color="#000" fill="#000" />
                  </div>
                </>
              ) : (
                <img src={item.dataUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', fontSize: 10 }}>
                {item.name}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <GlassCard style={{ padding: 0 }}>
          {filtered.map(item => (
            <div key={item.id} onClick={() => setLightbox(item)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderBottom: `1px solid ${TOKENS.border.subtle}`, cursor: 'pointer' }}>
              <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                {item.type === 'video' ? <Video style={{ width: '100%', height: '100%', color: C.neon }} /> : <img src={item.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{(item.size / 1024).toFixed(0)} KB · {new Date(item.uploadedAt).toLocaleDateString()}</div>
              </div>
              <NeonBadge color={item.type === 'video' ? 'neon' : 'violet'}>{item.type.toUpperCase()}</NeonBadge>
            </div>
          ))}
        </GlassCard>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }} style={{
              position: 'absolute', top: 20, right: 20, padding: 10, background: 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#fff', zIndex: 10 }}>
              <X size={20} />
            </button>
            
            <button onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }} style={{
              position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
              padding: 10, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
              cursor: 'pointer', color: '#fff' }}>
              <ChevronLeft size={24} />
            </button>
            
            <button onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }} style={{
              position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
              padding: 10, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
              cursor: 'pointer', color: '#fff' }}>
              <ChevronRight size={24} />
            </button>

            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}
            >
              {lightbox.type === 'video' ? (
                <video src={lightbox.dataUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '90vh' }} />
              ) : (
                <img src={lightbox.dataUrl} alt={lightbox.name} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
              )}
              
              <div style={{ position: 'absolute', bottom: -60, left: 0, right: 0, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <NeonButton variant="secondary" size="sm" onClick={() => download(lightbox)}>
                  <Download size={12} /> Download
                </NeonButton>
                <NeonButton variant="secondary" size="sm" onClick={() => shareToMesh(lightbox)}>
                  <Share2 size={12} /> Share to Mesh
                </NeonButton>
                <NeonButton variant="danger" size="sm" onClick={() => remove(lightbox.id)}>
                  <X size={12} /> Delete
                </NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
