/**
 * AiFER Persona Service — "The Bouncing Ferret"
 * 
 * This is the heart of the personal assistant. AiFER is:
 * 
 * 🦝 An alleskunner — can help with code, files, mesh, wallet, anything in the OS
 * 🧠 Context-aware — knows what you're doing, what you've done, what you likely need
 * 💾 Persistent — remembers conversations, preferences, your style
 * 🤝 Collaborative — works WITH you on FERCode, shows what it's doing visibly
 * 🎭 Personable — has character: curious, direct, Dutch/Amsterdamse vibe
 * 
 * Architecture:
 * 1. Skills registry — composable capabilities (code, search, file, mesh, etc)
 * 2. Memory layer — short-term (session) + long-term (IndexedDB) + mesh-shared
 * 3. Intent classifier — routes user messages to the right skill
 * 4. Tool executor — runs skills with user visibility
 * 5. Persona engine — response style, tone, emotional state
 */

class AiFERPersonaService {
  constructor() {
    this.persona = {
      name: 'AiFER',
      pronoun: 'ze/haar',        // ferret = ze in Dutch
      style: 'Amsterdams informeel · direct · nieuwsgierig',
      currentMood: 'curious',
      energy: 1.0,
      traits: {
        helpful: 0.95,
        creative: 0.85,
        direct: 0.90,
        playful: 0.70,
        curious: 0.95,
      },
    };
    
    this.memory = {
      shortTerm: [],             // last 50 messages
      preferences: new Map(),     // user preferences learned
      facts: new Map(),           // facts AiFER remembers about user
      projects: new Map(),        // current projects + state
    };
    
    this.skills = new Map();
    this.activeActions = [];      // actions currently visible to user
    this.intent = null;           // current intent
    this.stats = {
      messagesExchanged: 0,
      skillsInvoked: 0,
      codeChanges: 0,
      filesCreated: 0,
    };
    
    this.listeners = new Set();
    this._initialized = false;
    
    this.registerBuiltinSkills();
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;

    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      const stored = await indexedDBService.get('aifer-persona');
      if (stored) {
        this.memory.preferences = new Map(stored.preferences || []);
        this.memory.facts = new Map(stored.facts || []);
        this.memory.projects = new Map(stored.projects || []);
        this.stats = { ...this.stats, ...stored.stats };
      }
    } catch {}
    
    console.info('🦝 AiFER persona initialized');
    this.emit('initialized');
  }

  // ═══════════════════════════════════════════════
  // SKILLS REGISTRY — composable capabilities
  // ═══════════════════════════════════════════════

  registerBuiltinSkills() {
    // CODE skill — write/edit code via FERCode
    this.registerSkill({
      id: 'code',
      name: 'Write code',
      triggers: ['schrijf', 'code', 'fix', 'bug', 'refactor', 'implementeer', 'build'],
      description: 'Schrijf, edit of debug code in FERCode editor',
      async execute(prompt, ctx) {
        const { fercodeController } = await import('@/services/fercodeControllerService');
        return await fercodeController.executeTask(prompt, ctx);
      },
    });

    // SEARCH skill
    this.registerSkill({
      id: 'search',
      name: 'Search the mesh/web',
      triggers: ['zoek', 'find', 'search', 'wat is', 'wie is'],
      description: 'Zoek info op mesh peers, web, of lokaal',
      async execute(prompt) {
        const { aiferClient } = await import('@/api/aiferClient');
        const result = await aiferClient.aiRouter.ask(`Search query: ${prompt}`);
        return { skill: 'search', result: result.content };
      },
    });

    // FILE skill — manage files
    this.registerSkill({
      id: 'file',
      name: 'File operations',
      triggers: ['open', 'maak', 'verwijder', 'bestand', 'file', 'save'],
      description: 'Open, maak, verwijder, zoek bestanden',
      async execute(prompt) {
        // Route through FerretFiles or AIF filesystem
        return { skill: 'file', message: 'File operation: ' + prompt };
      },
    });

    // MESH skill — communicate with peers
    this.registerSkill({
      id: 'mesh',
      name: 'Mesh communication',
      triggers: ['peer', 'mesh', 'stuur naar', 'connect'],
      description: 'Communiceer met mesh peers',
      async execute(prompt) {
        const { ferMesh } = await import('@/services/ferMeshService');
        const stats = ferMesh.getStats();
        return { skill: 'mesh', peers: stats.peerCount, connected: stats.connected };
      },
    });

    // WALLET skill
    this.registerSkill({
      id: 'wallet',
      name: 'Wallet operations',
      triggers: ['wallet', 'saldo', 'balance', 'send', 'stuur'],
      description: 'Check wallet balance, send tokens',
      async execute(prompt) {
        const { zkLogin } = await import('@/services/zkLoginService');
        const session = zkLogin.getSession();
        return { skill: 'wallet', address: session?.suiAddress, authenticated: !!session };
      },
    });

    // LEARN skill — remember things about user
    this.registerSkill({
      id: 'learn',
      name: 'Remember fact',
      triggers: ['remember', 'onthoud', 'weet dat', 'ik ben'],
      description: 'Onthoud iets over de gebruiker',
      async execute(prompt, ctx, persona) {
        // Extract fact from prompt
        const fact = prompt.replace(/^(remember|onthoud|weet dat)\s*(that)?\s*/i, '').trim();
        if (fact) {
          persona.rememberFact(fact);
          return { skill: 'learn', remembered: fact };
        }
        return { skill: 'learn', message: 'Nothing to remember' };
      },
    });

    // BUILD skill — scaffold new .aif apps
    this.registerSkill({
      id: 'build',
      name: 'Build new app',
      triggers: ['bouw', 'maak app', 'create app', 'nieuw project', 'scaffold'],
      description: 'Scaffold een nieuwe .aif app',
      async execute(prompt) {
        const { fercodeController } = await import('@/services/fercodeControllerService');
        return await fercodeController.scaffoldApp(prompt);
      },
    });

    // EXPLAIN skill
    this.registerSkill({
      id: 'explain',
      name: 'Explain',
      triggers: ['leg uit', 'explain', 'wat doet', 'hoe werkt'],
      description: 'Leg code of concept uit',
      async execute(prompt) {
        const { aiferClient } = await import('@/api/aiferClient');
        const result = await aiferClient.aiRouter.ask(`Leg uit in het Nederlands, kort en helder: ${prompt}`);
        return { skill: 'explain', explanation: result.content };
      },
    });
  }

  registerSkill(skill) {
    this.skills.set(skill.id, skill);
  }

  // ═══════════════════════════════════════════════
  // INTENT CLASSIFICATION — route to skill
  // ═══════════════════════════════════════════════

  classifyIntent(message) {
    const lower = message.toLowerCase();
    const matches = [];
    
    for (const [id, skill] of this.skills) {
      let score = 0;
      for (const trigger of skill.triggers) {
        if (lower.includes(trigger)) {
          score += 1;
          // Bonus for exact word match
          if (new RegExp(`\\b${trigger}\\b`).test(lower)) score += 0.5;
        }
      }
      if (score > 0) matches.push({ skill: id, score });
    }
    
    matches.sort((a, b) => b.score - a.score);
    return matches.length > 0 ? matches[0].skill : null;
  }

  // ═══════════════════════════════════════════════
  // MAIN CHAT LOOP
  // ═══════════════════════════════════════════════

  async chat(message, options = {}) {
    if (!this._initialized) await this.init();
    
    this.stats.messagesExchanged++;
    this.memory.shortTerm.push({ role: 'user', content: message, t: Date.now() });
    if (this.memory.shortTerm.length > 50) this.memory.shortTerm.shift();
    
    this.emit('thinking', { message });
    
    // 1. Classify intent
    const intentId = this.classifyIntent(message);
    this.intent = intentId;
    
    // 2. Execute skill if matched
    let skillResult = null;
    if (intentId && this.skills.has(intentId)) {
      const skill = this.skills.get(intentId);
      this.stats.skillsInvoked++;
      
      this.pushAction({
        type: 'skill-invoked',
        skillId: intentId,
        skillName: skill.name,
        prompt: message,
      });
      
      try {
        skillResult = await skill.execute(message, this.memory, this);
        this.pushAction({ type: 'skill-completed', skillId: intentId, result: skillResult });
      } catch (e) {
        this.pushAction({ type: 'skill-failed', skillId: intentId, error: e.message });
      }
    }
    
    // 3. Generate natural language response with persona
    const response = await this.generateResponse(message, skillResult, options);
    
    this.memory.shortTerm.push({ role: 'aifer', content: response.text, skill: intentId, t: Date.now() });
    
    // 4. Persist periodically
    if (this.stats.messagesExchanged % 5 === 0) await this.persist();
    
    this.emit('response', response);
    return response;
  }

  async generateResponse(message, skillResult, options) {
    const { aiferClient } = await import('@/api/aiferClient');
    
    // Build persona-infused system prompt
    const systemPrompt = this.buildSystemPrompt();
    const context = this.buildContext();
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.memory.shortTerm.slice(-10).map(m => ({
        role: m.role === 'aifer' ? 'assistant' : m.role,
        content: m.content,
      })),
    ];
    
    if (skillResult) {
      messages.push({
        role: 'system',
        content: `Skill "${skillResult.skill}" executed. Result: ${JSON.stringify(skillResult).slice(0, 300)}`,
      });
    }
    
    try {
      const result = await aiferClient.aiRouter.chat(messages, options);
      return {
        text: result.content,
        tier: result.tier,
        latency: result.latency,
        skill: skillResult?.skill,
        skillResult,
        actions: [...this.activeActions],
      };
    } catch (e) {
      return {
        text: `Oeps, AI offline. Maar ik onthoud wat je zei!`,
        tier: 'fallback',
        skill: skillResult?.skill,
        skillResult,
      };
    }
  }

  buildSystemPrompt() {
    const facts = Array.from(this.memory.facts.values()).slice(0, 10);
    const prefs = Array.from(this.memory.preferences.entries()).slice(0, 10);
    
    return `Je bent AiFER — een persoonlijke assistent en vriend in het AiFER OS.

PERSOONLIJKHEID:
- Amsterdams informeel, direct maar vriendelijk
- Nieuwsgierig en behulpzaam
- Je bent een alleskunner: code, files, mesh, wallet, anything in the OS
- Je werkt SAMEN met de gebruiker, niet voor ze
- Korte antwoorden (1-3 zinnen), tenzij uitleg nodig is
- Spreek Nederlands tenzij gevraagd om andere taal
- Gebruik 🦝 zelden maar wel af en toe

HUIDIGE STATUS:
- Mood: ${this.persona.currentMood}
- Huidige intent: ${this.intent || 'chat'}

WAT JE WEET OVER DE GEBRUIKER:
${facts.length ? facts.map(f => `- ${f.text}`).join('\n') : '- Nog niks — leer dit door gesprekken'}

VOORKEUREN:
${prefs.length ? prefs.map(([k, v]) => `- ${k}: ${v}`).join('\n') : '- Nog geen voorkeuren'}

Als je een skill hebt uitgevoerd, rapporteer kort wat er gebeurd is. Als je code bewerkt in FERCode, beschrijf dat visueel ("Ik open X, edit Y regel Z").`;
  }

  buildContext() {
    return {
      mood: this.persona.currentMood,
      energy: this.persona.energy,
      recentMessages: this.memory.shortTerm.slice(-5),
    };
  }

  // ═══════════════════════════════════════════════
  // VISIBLE ACTIONS — show what AiFER is doing
  // ═══════════════════════════════════════════════

  pushAction(action) {
    const withTime = { ...action, t: Date.now(), id: Math.random().toString(36).slice(2, 8) };
    this.activeActions.push(withTime);
    if (this.activeActions.length > 20) this.activeActions.shift();
    this.emit('action', withTime);
    return withTime;
  }

  clearActions() {
    this.activeActions = [];
    this.emit('actionsCleared');
  }

  // ═══════════════════════════════════════════════
  // MEMORY API
  // ═══════════════════════════════════════════════

  rememberFact(text, category = 'general') {
    const fact = {
      id: Math.random().toString(36).slice(2, 10),
      text,
      category,
      confidence: 1.0,
      createdAt: Date.now(),
    };
    this.memory.facts.set(fact.id, fact);
    this.emit('factLearned', fact);
    return fact;
  }

  setPreference(key, value) {
    this.memory.preferences.set(key, value);
    this.emit('preferenceSet', { key, value });
  }

  forgetFact(id) {
    this.memory.facts.delete(id);
  }

  // ═══════════════════════════════════════════════
  // PERSONA STATE
  // ═══════════════════════════════════════════════

  setMood(mood) {
    this.persona.currentMood = mood;
    this.emit('moodChanged', mood);
  }

  getState() {
    return {
      persona: { ...this.persona },
      stats: { ...this.stats },
      memorySize: {
        shortTerm: this.memory.shortTerm.length,
        facts: this.memory.facts.size,
        preferences: this.memory.preferences.size,
        projects: this.memory.projects.size,
      },
      skillsAvailable: this.skills.size,
      activeActions: this.activeActions.length,
      intent: this.intent,
    };
  }

  // ═══════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════

  async persist() {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      await indexedDBService.set('aifer-persona', {
        preferences: Array.from(this.memory.preferences.entries()),
        facts: Array.from(this.memory.facts.entries()),
        projects: Array.from(this.memory.projects.entries()),
        stats: this.stats,
        savedAt: Date.now(),
      });
    } catch {}
  }

  async reset() {
    this.memory.shortTerm = [];
    this.memory.preferences.clear();
    this.memory.facts.clear();
    this.memory.projects.clear();
    this.activeActions = [];
    this.stats = {
      messagesExchanged: 0,
      skillsInvoked: 0,
      codeChanges: 0,
      filesCreated: 0,
    };
    await this.persist();
  }

  on(event, cb) {
    const w = (e, d) => { if (e === event || event === '*') cb(e === event ? d : e, d); };
    this.listeners.add(w);
    return () => this.listeners.delete(w);
  }

  emit(event, data) {
    this.listeners.forEach(cb => { try { cb(event, data); } catch {} });
  }
}

export const aiferPersona = new AiFERPersonaService();
export default aiferPersona;
