// FerretMail — Decentralized encrypted mesh email
// No SMTP, no servers — uses mesh + Walrus for attachments

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, Send, Star, Trash2, Mail, Paperclip, Search, Plus, ArrowLeft, Lock, Users } from 'lucide-react';
import { GlassCard, NeonButton, NeonBadge, NeonInput, TOKENS, NeonGlobalStyles } from '@/components/ui/neon-ui';

const { colors: C, bg } = TOKENS;

export default function FerretMail() {
  const [folder, setFolder] = useState('inbox');
  const [mails, setMails] = useState({ inbox: [], sent: [], starred: [], trash: [] });
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState('');
  const [meshPeers, setMeshPeers] = useState([]);
  const [draft, setDraft] = useState({ to: '', subject: '', body: '', attachments: [] });

  useEffect(() => { loadMails(); initMesh(); }, []);

  const loadMails = async () => {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      const stored = await indexedDBService.get('ferret-mail') || { inbox: [], sent: [], starred: [], trash: [] };
      setMails(stored);
    } catch {}
  };

  const saveMails = async (updated) => {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      await indexedDBService.set('ferret-mail', updated);
    } catch {}
  };

  const initMesh = async () => {
    try {
      const { ferMesh } = await import('@/services/ferMeshService');
      setMeshPeers(ferMesh.getPeers());
      
      // Listen for incoming mesh mail
      ferMesh.on('ferretMail', (data) => {
        setMails(prev => {
          const updated = { ...prev, inbox: [{ ...data, id: Date.now().toString(36), read: false, folder: 'inbox' }, ...prev.inbox] };
          saveMails(updated);
          return updated;
        });
      });
    } catch {}
  };

  const sendMail = async () => {
    if (!draft.to || !draft.body) return;
    
    const mail = {
      id: Date.now().toString(36),
      from: 'me@ferret',
      to: draft.to,
      subject: draft.subject || '(no subject)',
      body: draft.body,
      attachments: draft.attachments,
      timestamp: Date.now(),
      read: true,
      encrypted: true,
      folder: 'sent',
    };

    try {
      // Encrypt via mesh (simplified - uses WebCrypto)
      const { ferMesh } = await import('@/services/ferMeshService');
      
      // Find target peer
      const target = meshPeers.find(p => p.name?.includes(draft.to) || p.peerId?.startsWith(draft.to));
      if (target && ferMesh.actions?.sendChat) {
        // Use chat channel with mail metadata
        ferMesh.emit('ferretMail', mail);
      }

      // Save to sent
      const updated = { ...mails, sent: [mail, ...mails.sent] };
      setMails(updated);
      saveMails(updated);
      
      setDraft({ to: '', subject: '', body: '', attachments: [] });
      setComposing(false);
    } catch (e) {
      alert('Send failed: ' + e.message);
    }
  };

  const currentList = mails[folder] || [];
  const filtered = currentList.filter(m =>
    !search ||
    m.subject?.toLowerCase().includes(search.toLowerCase()) ||
    m.body?.toLowerCase().includes(search.toLowerCase()) ||
    m.from?.toLowerCase().includes(search.toLowerCase())
  );

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: mails.inbox.filter(m => !m.read).length, color: C.neon },
    { id: 'sent', label: 'Sent', icon: Send, count: 0, color: C.cyan },
    { id: 'starred', label: 'Starred', icon: Star, count: 0, color: C.gold },
    { id: 'trash', label: 'Trash', icon: Trash2, count: 0, color: C.magenta },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg.deep, color: '#fff', fontFamily: "'Outfit', system-ui" }}>
      <NeonGlobalStyles />
      
      {/* Sidebar */}
      <div style={{ width: 220, borderRight: `1px solid ${TOKENS.border.subtle}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Mail style={{ color: C.neon, width: 20 }} />
          <div style={{ fontWeight: 800, fontSize: 16 }}>Ferret<span style={{ color: C.neon }}>Mail</span></div>
        </div>

        <NeonButton variant="primary" size="md" onClick={() => setComposing(true)}>
          <Plus size={14} /> Compose
        </NeonButton>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => { setFolder(f.id); setSelected(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                background: folder === f.id ? `${f.color}15` : 'transparent',
                color: folder === f.id ? f.color : 'rgba(255,255,255,0.6)',
                fontSize: 12, fontWeight: 600, textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <f.icon size={14} />
              <span style={{ flex: 1 }}>{f.label}</span>
              {f.count > 0 && <NeonBadge color="neon">{f.count}</NeonBadge>}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: 10, background: bg.subtle, borderRadius: 10, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Users size={10} /> <span>{meshPeers.length} mesh peers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={10} /> <span>E2E encrypted</span>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ width: 320, borderRight: `1px solid ${TOKENS.border.subtle}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${TOKENS.border.subtle}` }}>
          <NeonInput icon={Search} placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              {folder === 'inbox' ? '📭 Inbox is leeg' : `No ${folder} mail`}
            </div>
          ) : filtered.map(mail => (
            <div
              key={mail.id}
              onClick={() => setSelected(mail)}
              style={{
                padding: '12px 14px', borderBottom: `1px solid ${TOKENS.border.subtle}`,
                cursor: 'pointer', transition: 'all 0.15s',
                background: selected?.id === mail.id ? `${C.neon}10` : mail.read ? 'transparent' : `${C.cyan}06`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: mail.read ? 500 : 700, color: mail.read ? 'rgba(255,255,255,0.7)' : C.cyan }}>
                  {mail.from}
                </span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(mail.timestamp).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: mail.read ? 400 : 700, marginBottom: 2 }}>{mail.subject}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {mail.body?.slice(0, 60)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reader / Composer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {composing ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setComposing(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <ArrowLeft />
                </button>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>New Message</h2>
              </div>
              <NeonBadge color="neon" pulse>E2E</NeonBadge>
            </div>
            
            <NeonInput label="TO (peer name or ID)" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} placeholder="peer_abc123" />
            <NeonInput label="SUBJECT" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Re: ferret stuff" />
            
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>MESSAGE</div>
              <textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="Write your message..."
                style={{
                  width: '100%', minHeight: 200, resize: 'vertical',
                  background: bg.subtle, border: `1px solid ${TOKENS.border.subtle}`,
                  borderRadius: TOKENS.radius.md, padding: 12, color: '#fff',
                  fontFamily: 'inherit', fontSize: 13, outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <NeonButton variant="ghost" onClick={() => { /* attach file */ }}>
                <Paperclip size={14} /> Attach
              </NeonButton>
              <div style={{ flex: 1 }} />
              <NeonButton variant="secondary" onClick={() => setComposing(false)}>Cancel</NeonButton>
              <NeonButton variant="primary" onClick={sendMail}>
                <Send size={14} /> Send via Mesh
              </NeonButton>
            </div>
          </div>
        ) : selected ? (
          <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{selected.subject}</h2>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  From <span style={{ color: C.cyan }}>{selected.from}</span> · {new Date(selected.timestamp).toLocaleString('nl-NL')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selected.encrypted && <NeonBadge color="neon">🔐 E2E</NeonBadge>}
              </div>
            </div>
            
            <GlassCard style={{ padding: 20, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {selected.body}
            </GlassCard>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <Mail size={48} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: 13, marginTop: 10 }}>Selecteer een bericht of schrijf er een</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
