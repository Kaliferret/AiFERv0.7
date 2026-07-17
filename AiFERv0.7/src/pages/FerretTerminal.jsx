// FerretTerminal — CLI interface for AiFER
// Tauri: executes real shell commands
// Web: simulated + AI commands
// Built-in: aifer commands for mesh, AI, wallet, apps

import React, { useState, useEffect, useRef } from 'react';

const isTauri = typeof window !== 'undefined' && window.__TAURI__;

const BANNER = `
 █████╗ ██╗███████╗███████╗██████╗ 
██╔══██╗██║██╔════╝██╔════╝██╔══██╗
███████║██║█████╗  █████╗  ██████╔╝
██╔══██║██║██╔══╝  ██╔══╝  ██╔══██╗
██║  ██║██║██║     ███████╗██║  ██║
╚═╝  ╚═╝╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝ v8

🦝 The Bouncing Ferret — Type 'help' for commands
`;

const BUILTIN_COMMANDS = {
  help: {
    desc: 'Show available commands',
    run: () => `
AiFER CLI — Built-in commands:

  help                 Show this help
  clear                Clear terminal
  status               Show system status
  ai <prompt>          Ask AiFER AI
  mesh peers           List mesh peers
  mesh connect <room>  Connect to mesh room
  mesh send <msg>      Send mesh message
  wallet               Show wallet balance
  apps                 List installed .aif apps
  run <appId> <fn>     Run .aif app function
  login                Start zkLogin flow
  logout               Clear session
  about                About AiFER OS
  version              Show version

${isTauri ? '\nNative commands:\n  ls, cd, pwd, cat, echo — work via shell\n' : ''}
`,
  },
  clear: { desc: 'Clear screen', run: () => '__CLEAR__' },
  status: {
    desc: 'Show system status',
    run: async () => {
      const { aiferClient } = await import('@/api/aiferClient');
      const ai = aiferClient.aiRouter.getStatus();
      const mesh = aiferClient.mesh.getStats();
      const session = aiferClient.zkLogin.getSession();
      return `
🦝 AiFER OS v8 "Neon Ferret" Status:

AI Router:
  Tier available: ${Object.entries(ai.tiers).filter(([_,v]) => v.available).map(([k]) => k).join(', ') || 'fallback only'}
  Total requests: ${ai.stats.totalRequests}

FERMesh:
  Connected: ${mesh.connected ? '✓' : '✗'}
  Room: ${mesh.roomId || '—'}
  Peers: ${mesh.peerCount}
  Messages: in=${mesh.messagesIn} out=${mesh.messagesOut}

zkLogin:
  Authenticated: ${session ? '✓' : '✗'}
  Provider: ${session?.provider || '—'}
  Sui address: ${session?.suiAddress?.slice(0, 20) + '...' || '—'}

Runtime: ${isTauri ? '🖥️  Tauri (native)' : '🌐 Web'}
`;
    },
  },
  about: {
    desc: 'About AiFER',
    run: () => `
🦝 AiFER OS v8 "Neon Ferret"
The Bouncing Ferret — AI-first mesh ecosystem

Built by: SEM (aifer.org)
Stack:    React 18 · Vite · Tauri 2.x
AI:       Ollama + Claude + Groq + OpenAI
Mesh:     Trystero + Yjs CRDTs
Chain:    Sui + Move contracts
Storage:  Walrus decentralized

License: MIT · Open Source
`,
  },
  version: { desc: 'Version', run: () => 'AiFER OS v8.0.0 "Neon Ferret"' },
};

export default function FerretTerminal() {
  const [lines, setLines] = useState([{ type: 'banner', content: BANNER }]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [cwd, setCwd] = useState('~');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const println = (type, content) => {
    if (content === '__CLEAR__') {
      setLines([]);
      return;
    }
    setLines(prev => [...prev, { type, content }]);
  };

  const exec = async (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    
    // Echo the command
    println('prompt', `ferret@aifer:${cwd}$ ${trimmed}`);
    
    // Add to history
    setHistory(prev => [...prev, trimmed]);
    setHistIdx(-1);

    const [main, ...args] = trimmed.split(/\s+/);

    // Built-in commands
    if (BUILTIN_COMMANDS[main]) {
      try {
        const result = await BUILTIN_COMMANDS[main].run(args);
        if (result !== '__CLEAR__') println('out', result);
        return;
      } catch (e) {
        println('err', `Error: ${e.message}`);
        return;
      }
    }

    // AI command
    if (main === 'ai') {
      const prompt = args.join(' ');
      if (!prompt) return println('err', 'Usage: ai <prompt>');
      println('info', '🤖 Thinking...');
      try {
        const { aiferClient } = await import('@/api/aiferClient');
        const result = await aiferClient.aiRouter.ask(prompt);
        println('ai', `[${result.tier} · ${result.latency}ms]`);
        println('out', result.content);
      } catch (e) {
        println('err', `AI failed: ${e.message}`);
      }
      return;
    }

    // Mesh commands
    if (main === 'mesh') {
      const sub = args[0];
      try {
        const { aiferClient } = await import('@/api/aiferClient');
        if (sub === 'peers') {
          const peers = aiferClient.mesh.getPeers();
          println('out', peers.length ? peers.map(p => `  • ${p.name} (${p.peerId?.slice(0,8)})`).join('\n') : 'No peers connected');
        } else if (sub === 'connect') {
          const room = args[1] || 'aifer-default';
          const result = await aiferClient.mesh.connect(room, 'Ferret');
          println('info', result.success ? `✓ Connected to ${result.roomId}` : `✗ ${result.error}`);
        } else if (sub === 'send') {
          const msg = args.slice(1).join(' ');
          aiferClient.mesh.sendMessage(msg);
          println('info', `→ Sent: ${msg}`);
        } else {
          println('err', 'Usage: mesh <peers|connect|send>');
        }
      } catch (e) {
        println('err', e.message);
      }
      return;
    }

    // Wallet
    if (main === 'wallet') {
      try {
        const { aiferClient } = await import('@/api/aiferClient');
        const session = aiferClient.zkLogin.getSession();
        if (!session) return println('err', 'Not logged in. Run: login');
        println('out', `Wallet: ${session.suiAddress}\nBalance: loading from Sui...`);
      } catch (e) {
        println('err', e.message);
      }
      return;
    }

    // Apps
    if (main === 'apps') {
      try {
        const { aiferClient } = await import('@/api/aiferClient');
        const apps = aiferClient.aif.list();
        if (!apps.length) return println('out', 'No apps installed');
        println('out', apps.map(a => `  ${a.id.padEnd(20)} v${a.version}  ${a.name}`).join('\n'));
      } catch (e) {
        println('err', e.message);
      }
      return;
    }

    // Run
    if (main === 'run') {
      const [appId, fn, ...fnArgs] = args;
      if (!appId || !fn) return println('err', 'Usage: run <appId> <fn> [args...]');
      try {
        const { aiferClient } = await import('@/api/aiferClient');
        const result = await aiferClient.aif.call(appId, fn, ...fnArgs);
        println('out', JSON.stringify(result, null, 2));
      } catch (e) {
        println('err', e.message);
      }
      return;
    }

    // Login/Logout
    if (main === 'login') {
      try {
        const { aiferClient } = await import('@/api/aiferClient');
        const result = await aiferClient.zkLogin.login('google');
        println('info', `Login initiated: ${result.demo ? 'demo mode' : 'OAuth flow'}`);
      } catch (e) {
        println('err', e.message);
      }
      return;
    }
    if (main === 'logout') {
      const { aiferClient } = await import('@/api/aiferClient');
      await aiferClient.zkLogin.logout();
      println('info', 'Logged out');
      return;
    }

    // Native shell (Tauri)
    if (isTauri) {
      try {
        const { Command } = await import('@tauri-apps/plugin-shell');
        const output = await Command.create(main, args).execute();
        if (output.stdout) println('out', output.stdout);
        if (output.stderr) println('err', output.stderr);
      } catch (e) {
        println('err', `Command failed: ${e.message}`);
      }
      return;
    }

    println('err', `Unknown command: ${main}. Type 'help' for commands.`);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      exec(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length) {
        const newIdx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
        setHistIdx(newIdx);
        setInput(history[newIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx >= 0) {
        const newIdx = histIdx + 1;
        if (newIdx >= history.length) {
          setHistIdx(-1);
          setInput('');
        } else {
          setHistIdx(newIdx);
          setInput(history[newIdx]);
        }
      }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setLines([]);
    }
  };

  const lineColor = {
    banner: '#39FF14',
    prompt: '#00E5FF',
    out: '#E8E8F0',
    err: '#FF0080',
    info: '#FFD740',
    ai: '#B388FF',
  };

  return (
    <div 
      onClick={() => inputRef.current?.focus()}
      className="h-screen bg-black text-[#39FF14] font-mono text-sm p-4 overflow-y-auto"
      style={{ fontFamily: "'JetBrains Mono', Menlo, monospace" }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ color: lineColor[line.type] || '#E8E8F0', whiteSpace: 'pre-wrap', marginBottom: 2 }}>
          {line.content}
        </div>
      ))}
      
      <div className="flex items-center gap-2 mt-1">
        <span style={{ color: '#00E5FF' }}>ferret@aifer:{cwd}$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 bg-transparent outline-none caret-[#39FF14]"
          style={{ color: '#E8E8F0' }}
          autoFocus
          spellCheck={false}
        />
      </div>
      
      <div ref={endRef} />
    </div>
  );
}
