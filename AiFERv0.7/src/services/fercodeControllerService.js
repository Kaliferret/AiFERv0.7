/**
 * FERCode Controller Service
 * 
 * Lets AiFER visibly control the FERCode editor. When AiFER wants to write code:
 * 
 * 1. Opens a file (animated — scroll to it, highlight)
 * 2. Types character-by-character (visible streaming)
 * 3. Saves + runs
 * 4. Shows result
 * 
 * User sees everything AiFER is doing — like watching a skilled pair-programmer.
 * 
 * Also scaffolds new .aif apps: generates header/state/logic/ui, signs them,
 * installs via package manager.
 */

class FERCodeControllerService {
  constructor() {
    this.activeEditor = null;       // ref to current editor instance
    this.files = new Map();          // filePath → { content, language, modified }
    this.currentFile = null;
    this.cursorPosition = { line: 0, col: 0 };
    this.selection = null;
    this.taskQueue = [];
    this.isExecuting = false;
    this.listeners = new Set();
    
    this.stats = {
      tasksCompleted: 0,
      filesCreated: 0,
      linesWritten: 0,
      bugsFixed: 0,
    };
  }

  // ═══════════════════════════════════════════════
  // EDITOR BINDING — React component registers itself
  // ═══════════════════════════════════════════════

  bindEditor(editorApi) {
    this.activeEditor = editorApi;
    this.emit('editorBound');
    return () => {
      this.activeEditor = null;
      this.emit('editorUnbound');
    };
  }

  // ═══════════════════════════════════════════════
  // HIGH-LEVEL TASKS — executes natural language instructions
  // ═══════════════════════════════════════════════

  async executeTask(prompt, ctx = {}) {
    this.taskQueue.push({ prompt, ctx, id: Math.random().toString(36).slice(2, 8) });
    
    if (this.isExecuting) {
      return { queued: true, position: this.taskQueue.length };
    }
    
    return await this.processQueue();
  }

  async processQueue() {
    if (this.isExecuting || this.taskQueue.length === 0) return;
    this.isExecuting = true;
    
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      try {
        const result = await this.executeTaskNow(task);
        this.stats.tasksCompleted++;
        this.emit('taskCompleted', { task, result });
      } catch (e) {
        this.emit('taskFailed', { task, error: e.message });
      }
    }
    
    this.isExecuting = false;
  }

  async executeTaskNow(task) {
    this.emit('taskStarted', task);
    
    // Use AI to plan the code changes
    const plan = await this.planChanges(task.prompt, task.ctx);
    
    // Execute plan visibly
    for (const step of plan.steps) {
      await this.executeStep(step);
    }
    
    return { plan, completedAt: Date.now() };
  }

  async planChanges(prompt, ctx) {
    const { aiferClient } = await import('@/api/aiferClient');
    
    const systemPrompt = `Je bent AiFER's code planning module. Gegeven een gebruikersverzoek, geef een JSON plan met concrete stappen.

Huidige files: ${JSON.stringify(Array.from(this.files.keys()))}
Huidige file: ${this.currentFile || 'none'}

Geef ALLEEN JSON terug in dit formaat:
{
  "description": "wat ga je doen",
  "steps": [
    { "action": "create-file", "path": "src/NewComponent.jsx", "language": "jsx" },
    { "action": "open-file", "path": "src/App.jsx" },
    { "action": "write-code", "path": "src/App.jsx", "content": "...", "mode": "replace|append|insert", "line": 1 },
    { "action": "save", "path": "src/App.jsx" },
    { "action": "run", "target": "app" }
  ]
}

Opdracht: ${prompt}`;
    
    try {
      const result = await aiferClient.aiRouter.ask(systemPrompt);
      // Extract JSON from response
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {}
    
    // Fallback: simple single-step plan
    return {
      description: `Execute: ${prompt}`,
      steps: [
        { action: 'write-code', path: this.currentFile || 'scratch.js', content: `// ${prompt}\n// AiFER couldn't parse a detailed plan`, mode: 'append' },
      ],
    };
  }

  async executeStep(step) {
    this.emit('stepStarted', step);
    
    switch (step.action) {
      case 'create-file':
        await this.createFile(step.path, step.content || '', step.language);
        break;
      case 'open-file':
        await this.openFile(step.path);
        break;
      case 'write-code':
        await this.writeCode(step.path, step.content, step.mode || 'replace', step.line);
        break;
      case 'delete-lines':
        await this.deleteLines(step.path, step.fromLine, step.toLine);
        break;
      case 'save':
        await this.saveFile(step.path);
        break;
      case 'run':
        await this.runTarget(step.target);
        break;
      case 'comment':
        // AiFER's commentary — shown as bubble
        this.emit('aiferComment', { text: step.text });
        await this.pause(1000);
        break;
      default:
        console.warn('Unknown step:', step.action);
    }
    
    this.emit('stepCompleted', step);
  }

  // ═══════════════════════════════════════════════
  // LOW-LEVEL EDITOR OPERATIONS
  // ═══════════════════════════════════════════════

  async createFile(path, content = '', language = null) {
    this.files.set(path, {
      content,
      language: language || this.detectLanguage(path),
      modified: true,
      createdAt: Date.now(),
    });
    this.stats.filesCreated++;
    
    this.emit('fileCreated', { path, content, language });
    this.emit('visibleAction', {
      type: 'creating-file',
      message: `Maak bestand: ${path}`,
      path,
      duration: 800,
    });
    
    await this.pause(600);
    return path;
  }

  async openFile(path) {
    if (!this.files.has(path)) {
      this.files.set(path, { content: '', language: this.detectLanguage(path), modified: false });
    }
    
    this.currentFile = path;
    this.emit('fileOpened', { path });
    this.emit('visibleAction', {
      type: 'opening-file',
      message: `Open ${path}`,
      path,
      duration: 300,
    });
    
    await this.pause(300);
    return path;
  }

  /**
   * Write code to a file with visible streaming (character-by-character)
   */
  async writeCode(path, content, mode = 'replace', line = null) {
    if (!this.files.has(path)) {
      await this.createFile(path, '', this.detectLanguage(path));
    }
    this.currentFile = path;
    
    const file = this.files.get(path);
    const originalContent = file.content;
    
    this.emit('visibleAction', {
      type: 'writing-code',
      message: `Schrijf code in ${path}`,
      path,
      mode,
    });
    
    // Simulate streaming (useful for UI — real impl would use actual streaming from LLM)
    let finalContent;
    switch (mode) {
      case 'replace':
        finalContent = content;
        break;
      case 'append':
        finalContent = originalContent + (originalContent.endsWith('\n') ? '' : '\n') + content;
        break;
      case 'prepend':
        finalContent = content + '\n' + originalContent;
        break;
      case 'insert':
        finalContent = this.insertAtLine(originalContent, content, line || 0);
        break;
      default:
        finalContent = content;
    }
    
    // Stream the characters with small delays for visibility
    const chunkSize = 25; // chars per tick for smooth streaming
    for (let i = 0; i <= finalContent.length; i += chunkSize) {
      const partial = finalContent.slice(0, i);
      file.content = partial;
      file.modified = true;
      
      this.emit('fileContentStreaming', { path, partial, total: finalContent.length });
      await this.pause(15);
    }
    
    file.content = finalContent;
    file.modified = true;
    this.stats.linesWritten += (finalContent.match(/\n/g) || []).length;
    
    this.emit('fileContentChanged', { path, content: finalContent, mode });
    return finalContent;
  }

  insertAtLine(content, insertion, line) {
    const lines = content.split('\n');
    lines.splice(line, 0, insertion);
    return lines.join('\n');
  }

  async deleteLines(path, fromLine, toLine) {
    const file = this.files.get(path);
    if (!file) return;
    
    const lines = file.content.split('\n');
    lines.splice(fromLine, toLine - fromLine + 1);
    file.content = lines.join('\n');
    file.modified = true;
    
    this.emit('fileContentChanged', { path, content: file.content, mode: 'delete' });
    this.emit('visibleAction', {
      type: 'deleting-lines',
      message: `Verwijder regel ${fromLine}-${toLine}`,
      path,
    });
    
    await this.pause(200);
  }

  async saveFile(path) {
    const file = this.files.get(path || this.currentFile);
    if (!file) return false;
    
    file.modified = false;
    file.savedAt = Date.now();
    
    this.emit('fileSaved', { path: path || this.currentFile });
    this.emit('visibleAction', {
      type: 'saving',
      message: `💾 Saved ${path || this.currentFile}`,
    });
    
    await this.pause(150);
    return true;
  }

  async runTarget(target) {
    this.emit('visibleAction', {
      type: 'running',
      message: `▶ Running ${target}`,
    });
    
    await this.pause(500);
    this.emit('runCompleted', { target });
  }

  // ═══════════════════════════════════════════════
  // APP SCAFFOLDING — create new .aif apps
  // ═══════════════════════════════════════════════

  async scaffoldApp(description) {
    this.emit('taskStarted', { type: 'scaffold', description });
    
    const { aiferClient } = await import('@/api/aiferClient');
    
    // Use AI to generate app skeleton
    const systemPrompt = `Genereer een complete .aif app skeleton voor deze beschrijving: "${description}"

Return ALLEEN JSON:
{
  "header": { "id": "app-id", "name": "App Name", "version": "1.0.0", "permissions": [...], "icon": "🦝" },
  "state": { /* initial state */ },
  "logic": "const exports = { ... };",
  "ui": "<div class=\\"p-4\\">...</div>"
}`;
    
    try {
      const result = await aiferClient.aiRouter.ask(systemPrompt);
      const match = result.content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in response');
      
      const spec = JSON.parse(match[0]);
      
      // Create the files visibly
      const appPath = `apps/${spec.header.id}`;
      await this.createFile(`${appPath}/app.aif`, '', 'aif');
      await this.pause(200);
      
      // Stream the header
      await this.writeCode(`${appPath}/app.aif`, this.formatAifFile(spec), 'replace');
      await this.saveFile(`${appPath}/app.aif`);
      
      // Also create the binary version
      const { AIFFile } = await import('@/services/aif-runtime/aifFilesystem');
      const { aifKeyManager } = await import('@/services/aif-runtime/aifCrypto');
      await aifKeyManager.init();
      
      const binaryFile = new AIFFile();
      binaryFile.setHeader(spec.header);
      binaryFile.setState(spec.state);
      binaryFile.setLogic(spec.logic);
      binaryFile.setUI(spec.ui);
      await binaryFile.sign(aifKeyManager);
      const bytes = await binaryFile.serialize();
      
      // Install via package manager
      const { aifPackageManager } = await import('@/services/aif-runtime/aifPackageManager');
      await aifPackageManager.init();
      const installed = await aifPackageManager.install(binaryFile);
      
      this.emit('appScaffolded', {
        path: appPath,
        spec,
        cid: installed.cid,
        binarySize: bytes.length,
      });
      
      return {
        success: true,
        appId: spec.header.id,
        path: appPath,
        cid: installed.cid,
        size: bytes.length,
      };
    } catch (e) {
      this.emit('scaffoldFailed', { error: e.message });
      return { success: false, error: e.message };
    }
  }

  formatAifFile(spec) {
    const headerStr = Object.entries(spec.header || {})
      .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
      .join('\n');
    const stateStr = JSON.stringify(spec.state || {}, null, 2)
      .split('\n').map(l => '  ' + l).join('\n');
    
    return `@header {
${headerStr}
}

@state ${stateStr}

@logic {
${spec.logic || 'const exports = {};'}
}

@ui {
${spec.ui || '<div>Empty app</div>'}
}
`;
  }

  // ═══════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════

  detectLanguage(path) {
    const ext = path.split('.').pop()?.toLowerCase();
    const map = {
      jsx: 'javascript', js: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', rs: 'rust', go: 'go', md: 'markdown',
      json: 'json', html: 'html', css: 'css', aif: 'aif',
      move: 'move', toml: 'toml', yaml: 'yaml', yml: 'yaml',
    };
    return map[ext] || 'plaintext';
  }

  async pause(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  getFile(path) {
    return this.files.get(path);
  }

  getAllFiles() {
    return Array.from(this.files.entries()).map(([path, file]) => ({ path, ...file }));
  }

  getStats() {
    return { ...this.stats, openFiles: this.files.size, queueLength: this.taskQueue.length };
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

export const fercodeController = new FERCodeControllerService();
export default fercodeController;
