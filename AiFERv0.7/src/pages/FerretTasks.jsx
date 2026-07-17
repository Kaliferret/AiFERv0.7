import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PopShell, { POPOS_TOKENS as T } from '@/components/ui/PopShell';
import { PopCard, PopButton, PopBadge, PopStat, PopInput, SectionHeader, PopPanel, EmptyState, Kbd, Divider } from '@/components/ui/popos-primitives';
import { CheckSquare, Clock, AlertCircle, Zap, Plus, Trash2, Sparkles, X } from 'lucide-react';

const COLUMNS = [
  { id: 'backlog', name: 'Backlog', variant: 'info', icon: Clock },
  { id: 'todo', name: 'To Do', variant: 'warning', icon: AlertCircle },
  { id: 'doing', name: 'Doing', variant: 'ai', icon: Zap },
  { id: 'done', name: 'Done', variant: 'success', icon: CheckSquare },
];

const PRIORITIES = {
  low: { label: 'Low', variant: 'info' },
  med: { label: 'Med', variant: 'warning' },
  high: { label: 'High', variant: 'danger' },
};

const DEMO = [
  { id: '1', col: 'doing', title: 'AiFER v11 PopOS overhaul', priority: 'high', tags: ['ui'], desc: 'Migrate all pages to PopShell' },
  { id: '2', col: 'todo', title: 'Capacitor setup + Android build', priority: 'high', tags: ['mobile'] },
  { id: '3', col: 'todo', title: 'Tauri build for PopOS', priority: 'med', tags: ['desktop'] },
  { id: '4', col: 'backlog', title: 'iOS TestFlight submission', priority: 'med', tags: ['mobile'] },
  { id: '5', col: 'backlog', title: 'Windows MSIX packaging', priority: 'low', tags: ['desktop'] },
  { id: '6', col: 'done', title: 'v10 all 5 sprints', priority: 'high', tags: ['core'] },
];

function TaskCard({ task, onDelete, onMove }) {
  const prio = PRIORITIES[task.priority] || PRIORITIES.med;
  const prioColor = prio.variant === 'warning' ? T.colors.warning : prio.variant === 'danger' ? T.colors.danger : T.colors.info;
  return (
    <motion.div
      layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: T.bg.raised,
        border: `1px solid ${T.border.subtle}`,
        borderLeft: `3px solid ${prioColor}`,
        borderRadius: T.radius.md,
        padding: T.space.sm, marginBottom: T.space.xs,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: T.space.xs, marginBottom: task.desc ? 4 : 0 }}>
        <div style={{ fontSize: T.text.sm, fontWeight: 500, color: T.colors.text, flex: 1, lineHeight: 1.4 }}>
          {task.title}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete?.(task); }} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: T.colors.textDim, padding: 0,
        }}><Trash2 size={12} /></button>
      </div>
      {task.desc && (
        <div style={{
          fontSize: T.text.xs, color: T.colors.textMuted,
          marginBottom: T.space.xs, lineHeight: 1.4,
        }}>{task.desc}</div>
      )}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <PopBadge variant={prio.variant} size="sm">{prio.label}</PopBadge>
        {task.tags?.map(tag => (
          <span key={tag} style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 3,
            background: T.bg.elevated, color: T.colors.textMuted,
            fontFamily: T.font.mono,
          }}>{tag}</span>
        ))}
        <div style={{ flex: 1 }} />
        {COLUMNS.filter(c => c.id !== task.col).slice(0, 2).map(c => (
          <button key={c.id}
            onClick={(e) => { e.stopPropagation(); onMove?.(task.id, c.id); }}
            style={{
              padding: '1px 5px', fontSize: 9,
              background: 'transparent', border: `1px solid ${T.border.subtle}`,
              color: T.colors.textMuted, borderRadius: 3, cursor: 'pointer',
              fontFamily: T.font.mono,
            }}>→ {c.name}</button>
        ))}
      </div>
    </motion.div>
  );
}

export default function FerretTasks() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '', priority: 'med', col: 'todo', tags: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const { indexedDBService } = await import('@/services/indexedDBService');
        const s = await indexedDBService.get('ferret-tasks');
        setTasks(s?.tasks || DEMO);
      } catch { setTasks(DEMO); }
    };
    load();
  }, []);

  useEffect(() => {
    if (tasks.length === 0) return;
    (async () => {
      try {
        const { indexedDBService } = await import('@/services/indexedDBService');
        await indexedDBService.set('ferret-tasks', { tasks, savedAt: Date.now() });
      } catch {}
    })();
  }, [tasks]);

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.col === 'done').length,
    doing: tasks.filter(t => t.col === 'doing').length,
  };
  stats.progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <PopShell title="Tasks" actions={
      <>
        <PopButton variant="ghost" size="sm" icon={Sparkles}>AiFER suggest</PopButton>
        <PopButton variant="primary" size="sm" icon={Plus} onClick={() => setShowForm(true)}>New</PopButton>
      </>
    }>
      <PopPanel maxWidth={1400}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: T.space.md,
          marginBottom: T.space.lg, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{
              fontSize: T.text.hero, fontWeight: 700,
              color: T.colors.text, margin: 0, letterSpacing: '-0.02em',
            }}>Tasks</h1>
            <div style={{ fontSize: T.text.sm, color: T.colors.textMuted, marginTop: 2 }}>
              {stats.total} tasks · {stats.progress}% done · {stats.doing} in progress
            </div>
          </div>
          <div style={{ minWidth: 200, flex: '0 1 auto' }}>
            <div style={{ height: 4, background: T.bg.elevated, borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${stats.progress}%` }}
                style={{ height: '100%', background: T.colors.pop }}
              />
            </div>
            <div style={{ fontSize: T.text.xs, color: T.colors.textMuted, marginTop: 3, fontFamily: T.font.mono }}>
              {stats.done} / {stats.total}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: T.space.sm,
        }}>
          {COLUMNS.map(col => {
            const Icon = col.icon;
            const colTasks = tasks.filter(t => t.col === col.id);
            return (
              <div key={col.id} style={{
                background: T.bg.raised, border: `1px solid ${T.border.subtle}`,
                borderRadius: T.radius.lg, padding: T.space.sm,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: `${T.space.xs}px ${T.space.sm - 2}px`,
                  marginBottom: T.space.sm, borderBottom: `1px solid ${T.border.subtle}`,
                }}>
                  <Icon size={13} color={col.variant === 'info' ? T.colors.info : col.variant === 'warning' ? T.colors.warning : col.variant === 'ai' ? T.colors.ai : T.colors.success} />
                  <div style={{
                    fontSize: T.text.xs, fontWeight: 600,
                    color: T.colors.textMuted,
                    letterSpacing: '0.05em', textTransform: 'uppercase', flex: 1,
                  }}>{col.name}</div>
                  <PopBadge variant={col.variant} size="sm">{colTasks.length}</PopBadge>
                </div>
                <div style={{ minHeight: 80 }}>
                  <AnimatePresence>
                    {colTasks.map(task => (
                      <TaskCard key={task.id} task={task}
                        onMove={(id, newCol) => setTasks(prev => prev.map(t => t.id === id ? { ...t, col: newCol } : t))}
                        onDelete={(t) => { if (confirm(`Delete "${t.title}"?`)) setTasks(prev => prev.filter(x => x.id !== t.id)); }}
                      />
                    ))}
                  </AnimatePresence>
                  {colTasks.length === 0 && (
                    <div style={{ padding: T.space.md, textAlign: 'center', color: T.colors.textDim, fontSize: T.text.xs }}>
                      Leeg
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: T.space.lg, padding: T.space.sm,
          background: T.bg.raised, border: `1px solid ${T.border.subtle}`,
          borderRadius: T.radius.md,
          display: 'flex', gap: T.space.md, fontSize: T.text.xs,
          color: T.colors.textMuted, flexWrap: 'wrap',
        }}>
          <span><Kbd>N</Kbd> new</span>
          <span><Kbd>Del</Kbd> delete</span>
          <span><Kbd>↵</Kbd> edit</span>
          <span><Kbd>1-4</Kbd> move</span>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 200,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: T.space.md,
              }}
            >
              <motion.div
                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 500,
                  background: T.bg.raisedAlt,
                  border: `1px solid ${T.border.regular}`,
                  borderRadius: T.radius.lg, padding: T.space.lg,
                  boxShadow: T.shadow.lg,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: T.space.md }}>
                  <h3 style={{ margin: 0, fontSize: T.text.lg, fontWeight: 700 }}>Nieuwe task</h3>
                  <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.colors.textDim }}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ display: 'grid', gap: T.space.sm }}>
                  <PopInput label="Titel" placeholder="Wat moet er gebeuren?"
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    autoFocus
                  />
                  <PopInput label="Tags (komma-gescheiden)" placeholder="core, design"
                    value={form.tags}
                    onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                  />
                  <div style={{ display: 'flex', gap: T.space.sm }}>
                    <PopButton variant="ghost" onClick={() => setShowForm(false)} fullWidth>Cancel</PopButton>
                    <PopButton variant="primary" onClick={() => {
                      if (!form.title) return;
                      setTasks(prev => [...prev, {
                        id: `t-${Date.now()}`, ...form,
                        tags: form.tags.split(',').map(x => x.trim()).filter(Boolean),
                      }]);
                      setShowForm(false);
                      setForm({ title: '', desc: '', priority: 'med', col: 'todo', tags: '' });
                    }} fullWidth>Create</PopButton>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PopPanel>
    </PopShell>
  );
}
