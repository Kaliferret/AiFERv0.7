// FERCodeV2 — Modern AI-powered IDE. AiFER zichtbaar bouwt met je mee.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GlassCard, NeonButton, NeonBadge, TOKENS, NeonGlobalStyles, FloatingOrb,
} from '@/components/ui/neon-ui';
import {
  FileCode, Folder, FolderOpen, Play, Save, Plus, Send, Sparkles,
  Terminal as TerminalIcon, Eye, Code2, X, ChevronRight, ChevronDown,
  Zap, Brain, Activity, Package, GitBranch,
} from 'lucide-react';

const { colors: C, bg } = TOKENS;

export default function FERCodeV2() {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [currentContent, setCurrentContent] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'aifer', text: 'Hey bro! 🦝 Ik ben AiFER. Wat gaan we vandaag bouwen? Zeg maar wat, ik laat zien wat ik doe.', t: Date.now() },
  ]);
  const [activeActions, setActiveActions] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src', 'src/components']));
  const [personaState, setPersonaState] = useState(null);
  const [controllerStats, setControllerStats] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [terminalLines, setTerminalLines] = useState([
    { type: 'info', text: '🦝 AiFER FERCode v2 — Samen bouwen met AI' },
    { type: 'info', text: 'Typ een commando of vraag AiFER iets te bouwen...' },
  ]);
  
  const messagesEndRef = useRef(null);
  const editorRef = useRef(null);

  // ═══════════════════════════════════════════════
  // INITIALIZATION + event wiring
  // ═══════════════════════════════════════════════

  useEffect(() => {
    const setup = async () => {
      const { aiferPersona } = await import('@/services/aiferPersonaService');
      const { fercodeController } = await import('@/services/fercodeControllerService');
      
      await aiferPersona.init();
      
      // Bind editor API so controller can drive it
      const editorApi = {
        openFile: (path) => setCurrentFile(path),
        writeContent: (content) => setCurrentContent(content),
      };
      fercodeController.bindEditor(editorApi);
      
      // Seed with a demo file so users see something immediately
      if (fercodeController.files.size === 0) {
        await fercodeController.createFile('src/App.aif', `@header {
  id: "demo-app"
  name: "Demo"
  version: "1.0.0"
}

@state {
  count: 0
}

@logic {
  const exports = {
    increment: () => state.set('count', (state.get('count') || 0) + 1)
  };
}

@ui {
  <div class="p-8 text-center">
    <h1 class="text-4xl font-bold text-neon">🦝 Count: {{ state.count }}</h1>
    <button onclick="increment()">+1</button>
  </div>
}
`, 'aif');
      }
      
      // Wire up listeners
      const unsubFiles = fercodeController.on('*', (event, data) => {
        if (event === 'fileCreated' || event === 'fileContentChanged' || event === 'fileSaved') {
          refreshFiles();
        }
        if (event === 'fileOpened' && data?.path) {
          const f = fercodeController.getFile(data.path);
          if (f) {
            setCurrentFile(data.path);
            setCurrentContent(f.content);
          }
        }
        if (event === 'fileContentStreaming' && data?.path) {
          if (data.path === fercodeController.currentFile) {
            setStreamingContent(data.partial);
            setIsStreaming(true);
          }
        }
        if (event === 'fileContentChanged') {
          if (data?.path === fercodeController.currentFile) {
            setCurrentContent(data.content);
            setIsStreaming(false);
            setStreamingContent('');
          }
        }
        if (event === 'visibleAction' && data) {
          const withId = { ...data, id: Math.random().toString(36).slice(2, 8), t: Date.now() };
          setActiveActions(prev => [...prev.slice(-4), withId]);
          setTerminalLines(prev => [...prev.slice(-20), { type: 'action', text: `🦝 ${data.message}` }]);
          setTimeout(() => {
            setActiveActions(prev => prev.filter(a => a.id !== withId.id));
          }, 4000);
        }
      });
      
      const unsubPersona = aiferPersona.on('*', (event, data) => {
        if (event === 'action') {
          setTerminalLines(prev => [...prev.slice(-20), { 
            type: 'action', 
            text: `⚡ ${data.type}: ${data.skillName || data.skillId || ''}` 
          }]);
        }
      });
      
      refreshFiles();
      
      // Periodic stats update
      const iv = setInterval(() => {
        setPersonaState(aiferPersona.getState());
        setControllerStats(fercodeController.getStats());
      }, 1000);
      
      return () => {
        unsubFiles();
        unsubPersona();
        clearInterval(iv);
      };
    };
    setup();
  }, []);

  const refreshFiles = async () => {
    const { fercodeController } = await import('@/services/fercodeControllerService');
    setFiles(fercodeController.getAllFiles());
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ═══════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════

  const sendMessage = async () => {
    if (!input.trim() || thinking) return;
    
    const userMsg = { role: 'user', text: input, t: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    
    try {
      const { aiferPersona } = await import('@/services/aiferPersonaService');
      const response = await aiferPersona.chat(input);
      
      setMessages(prev => [...prev, {
        role: 'aifer',
        text: response.text,
        skill: response.skill,
        tier: response.tier,
        t: Date.now(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'aifer',
        text: `Sorry bro, ging mis: ${e.message}`,
        error: true,
        t: Date.now(),
      }]);
    }
    setThinking(false);
  };

  const openFile = async (path) => {
    const { fercodeController } = await import('@/services/fercodeControllerService');
    await fercodeController.openFile(path);
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const saveCurrentFile = async () => {
    if (!currentFile) return;
    const { fercodeController } = await import('@/services/fercodeControllerService');
    const f = fercodeController.getFile(currentFile);
    if (f) {
      f.content = currentContent;
      f.modified = false;
    }
    await fercodeController.saveFile(currentFile);
  };

  // Build file tree from flat list
  const buildTree = () => {
    const tree = {};
    for (const f of files) {
      const parts = f.path.split('/');
      let node = tree;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          node[part] = { type: 'file', path: f.path, ...f };
        } else {
          if (!node[part]) node[part] = { type: 'folder', children: {}, path: parts.slice(0, i + 1).join('/') };
          node = node[part].children;
        }
      }
    }
    return tree;
  };

  const renderTree = (tree, depth = 0) => {
    return Object.entries(tree).map(([name, node]) => {
      if (node.type === 'folder') {
        const isOpen = expandedFolders.has(node.path);
        return (
          <div key={node.path}>
            <div
              onClick={() => toggleFolder(node.path)}
              style={{
                padding: '4px 6px', paddingLeft: 6 + depth * 12,
                cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                color: 'rgba(255,255,255,0.7)', borderRadius: 4,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {isOpen ? <FolderOpen size={14} color={C.gold} /> : <Folder size={14} color={C.gold} />}
              <span>{name}</span>
            </div>
            {isOpen && renderTree(node.children, depth + 1)}
          </div>
        );
      }
      
      const isCurrent = node.path === currentFile;
      return (
        <div
          key={node.path}
          onClick={() => openFile(node.path)}
          style={{
            padding: '4px 6px', paddingLeft: 6 + depth * 12 + 16,
            cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
            color: isCurrent ? C.neon : 'rgba(255,255,255,0.6)',
            background: isCurrent ? `${C.neon}12` : 'transparent',
            borderLeft: isCurrent ? `2px solid ${C.neon}` : '2px solid transparent',
            borderRadius: 4,
          }}
          onMouseEnter={e => !isCurrent && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={e => !isCurrent && (e.currentTarget.style.background = 'transparent')}
        >
          <FileCode size={12} color={node.path.endsWith('.aif') ? C.violet : C.cyan} />
          <span style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace" }}>{name}</span>
          {node.modified && <span style={{ color: C.gold, fontSize: 8 }}>●</span>}
        </div>
      );
    });
  };

  const displayContent = isStreaming ? streamingContent : currentContent;
  const fileTree = buildTree();

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  return (
    <div style={{
      height: '100vh', background: bg.deep, color: '#fff', 
      fontFamily: "'Outfit',system-ui", display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      <NeonGlobalStyles />
      <FloatingOrb color="neon" size={300} position={{ top: '-10%', right: '-8%' }} />
      <FloatingOrb color="violet" size={250} position={{ bottom: '-8%', left: '-8%' }} />

      {/* Top bar */}
      <div style={{
        background: bg.elev1, borderBottom: `1px solid ${bg.border}`,
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'relative', zIndex: 2,
      }}>
        <Code2 size={20} color={C.neon} />
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          FER<span style={{ color: C.neon }}>Code</span> v2
        </div>
        <NeonBadge color="neon">AiFER LIVE</NeonBadge>
        <div style={{ flex: 1 }} />
        
        {controllerStats && (
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono'" }}>
            <span>📄 {controllerStats.openFiles} files</span>
            <span>✍️ {controllerStats.linesWritten} lines</span>
            <span>✅ {controllerStats.tasksCompleted} tasks</span>
          </div>
        )}
        
        <NeonButton size="sm" variant="ghost" onClick={() => setShowPreview(!showPreview)}>
          <Eye size={12} /> {showPreview ? 'Hide' : 'Preview'}
        </NeonButton>
        <NeonButton size="sm" variant="secondary" onClick={saveCurrentFile} disabled={!currentFile}>
          <Save size={12} /> Save
        </NeonButton>
        <NeonButton size="sm" variant="primary">
          <Play size={12} /> Run
        </NeonButton>
      </div>

      {/* Main layout: Sidebar | Editor | Chat */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative', zIndex: 1 }}>
        
        {/* LEFT — File Explorer */}
        <div style={{
          width: 220, background: bg.elev1, borderRight: `1px solid ${bg.border}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 12px', borderBottom: `1px solid ${bg.border}`,
            fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>EXPLORER</span>
            <Plus size={12} style={{ cursor: 'pointer' }} onClick={() => {
              const name = prompt('Bestandsnaam:', 'new-file.js');
              if (name) import('@/services/fercodeControllerService').then(({ fercodeController }) => {
                fercodeController.createFile(name);
              });
            }} />
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
            {files.length === 0 ? (
              <div style={{ padding: 20, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                Geen bestanden.<br/>Vraag AiFER iets te bouwen →
              </div>
            ) : renderTree(fileTree)}
          </div>
          
          {/* Active actions feed */}
          {activeActions.length > 0 && (
            <div style={{
              borderTop: `1px solid ${bg.border}`, padding: 8, maxHeight: 140, overflow: 'auto',
            }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', color: C.violet, marginBottom: 4 }}>
                🦝 AiFER DOET...
              </div>
              <AnimatePresence>
                {activeActions.map(a => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    style={{
                      fontSize: 10, padding: '4px 6px', marginBottom: 2,
                      background: `${C.violet}12`, borderLeft: `2px solid ${C.violet}`,
                      borderRadius: 4, color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {a.message}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* MIDDLE — Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Tab bar */}
          {currentFile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: bg.elev1, borderBottom: `1px solid ${bg.border}`, padding: '4px 6px',
            }}>
              <div style={{
                padding: '6px 12px', background: bg.deep, borderRadius: '6px 6px 0 0',
                fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                borderTop: `2px solid ${C.neon}`,
              }}>
                <FileCode size={12} color={C.neon} />
                <span style={{ fontFamily: "'JetBrains Mono'" }}>{currentFile}</span>
                {isStreaming && <NeonBadge color="violet">AiFER TYPING</NeonBadge>}
              </div>
            </div>
          )}
          
          {/* Editor */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: bg.deep }}>
            {currentFile ? (
              <textarea
                ref={editorRef}
                value={displayContent}
                onChange={e => !isStreaming && setCurrentContent(e.target.value)}
                readOnly={isStreaming}
                style={{
                  width: '100%', height: '100%', background: 'transparent',
                  color: isStreaming ? C.violet : '#E8E8F0', border: 'none',
                  padding: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
                  lineHeight: 1.7, resize: 'none', outline: 'none',
                }}
              />
            ) : (
              <div style={{
                height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 16, color: 'rgba(255,255,255,0.4)',
              }}>
                <Code2 size={64} color={C.neon} style={{ opacity: 0.3 }} />
                <div style={{ fontSize: 14 }}>Selecteer een bestand of laat AiFER er een maken</div>
                <div style={{ fontSize: 11, opacity: 0.6, textAlign: 'center', maxWidth: 400 }}>
                  Vraag rechts: <em>"maak een todo app"</em>, <em>"fix de bug in App.aif"</em>,<br/>
                  of <em>"bouw een mesh chat"</em> — AiFER laat alles zichtbaar zien
                </div>
              </div>
            )}
            
            {/* Streaming cursor */}
            {isStreaming && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                style={{
                  position: 'absolute', bottom: 14, right: 14,
                  padding: '4px 8px', borderRadius: 4,
                  background: `${C.violet}22`, color: C.violet,
                  fontSize: 10, fontFamily: "'JetBrains Mono'",
                  border: `1px solid ${C.violet}44`,
                }}
              >
                🦝 typing... {streamingContent.length} chars
              </motion.div>
            )}
          </div>
          
          {/* Terminal */}
          <div style={{
            height: 140, background: '#0A0A0F', borderTop: `1px solid ${bg.border}`,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '6px 12px', borderBottom: `1px solid ${bg.border}`,
              fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <TerminalIcon size={11} /> TERMINAL
            </div>
            <div style={{
              flex: 1, padding: 8, overflow: 'auto',
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
            }}>
              {terminalLines.map((line, i) => (
                <div key={i} style={{
                  color: line.type === 'action' ? C.violet :
                         line.type === 'error' ? C.magenta :
                         line.type === 'success' ? C.neon :
                         'rgba(255,255,255,0.6)',
                  padding: '1px 0',
                }}>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — AiFER chat */}
        <div style={{
          width: 360, background: bg.elev1, borderLeft: `1px solid ${bg.border}`,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Persona header */}
          <div style={{
            padding: '12px 14px', borderBottom: `1px solid ${bg.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <motion.div
              animate={{ 
                boxShadow: [
                  `0 0 10px ${C.neon}66`,
                  `0 0 20px ${C.neon}aa`,
                  `0 0 10px ${C.neon}66`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.neon}, ${C.cyan})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}
            >
              🦝
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.neon }}>AiFER</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                {personaState?.persona?.currentMood || 'curious'} · 
                {personaState?.skillsAvailable || 0} skills · 
                {personaState?.memorySize?.facts || 0} facts
              </div>
            </div>
            <NeonBadge color={thinking ? 'violet' : 'neon'} pulse={thinking}>
              {thinking ? 'THINKING' : 'READY'}
            </NeonBadge>
          </div>
          
          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.t}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: 10,
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: msg.role === 'user' 
                      ? `${C.cyan}15`
                      : msg.error ? `${C.magenta}15` : `${C.neon}12`,
                    border: `1px solid ${msg.role === 'user' ? C.cyan : msg.error ? C.magenta : C.neon}30`,
                    fontSize: 12, lineHeight: 1.5,
                  }}>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#E8E8F0' }}>{msg.text}</div>
                    {msg.skill && (
                      <div style={{ fontSize: 9, color: C.violet, marginTop: 4, fontFamily: "'JetBrains Mono'" }}>
                        ⚡ skill:{msg.skill} {msg.tier && `· ${msg.tier}`}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {thinking && (
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ fontSize: 11, color: C.violet, padding: 8, fontFamily: "'JetBrains Mono'" }}
              >
                🦝 aan het nadenken...
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div style={{
            padding: 10, borderTop: `1px solid ${bg.border}`,
            display: 'flex', gap: 6, alignItems: 'flex-end',
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Vraag AiFER iets te bouwen..."
              rows={2}
              style={{
                flex: 1, background: bg.subtle, border: `1px solid ${bg.border}`,
                borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#fff',
                resize: 'none', outline: 'none', fontFamily: "'Outfit',system-ui",
              }}
            />
            <NeonButton variant="primary" size="sm" onClick={sendMessage} disabled={thinking || !input.trim()}>
              <Send size={14} />
            </NeonButton>
          </div>
          
          {/* Quick prompts */}
          <div style={{
            padding: '0 10px 10px', display: 'flex', flexWrap: 'wrap', gap: 4,
          }}>
            {['Maak todo app', 'Fix deze bug', 'Leg uit', 'Refactor'].map(p => (
              <button
                key={p}
                onClick={() => setInput(p)}
                style={{
                  padding: '4px 8px', fontSize: 10, 
                  background: `${C.violet}10`, color: C.violet,
                  border: `1px solid ${C.violet}30`, borderRadius: 12,
                  cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
