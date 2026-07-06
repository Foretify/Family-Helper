import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask, getUsers } from '../api/client';

const RECURRENCES = [
  { value: 'daily',       label: 'Every day' },
  { value: 'weekdays',    label: 'Weekdays (Mon–Fri)' },
  { value: 'weekends',    label: 'Weekends (Sat–Sun)' },
  { value: 'custom_days', label: 'Custom days' },
  { value: 'one_off',     label: 'One-off (manual only)' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const COLORS = [
  '#6366f1', '#7c3aed', '#0ea5e9', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#64748b',
];

export default function TaskLibrary() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editTask, setEditTask] = useState(null); // null=closed, {}=new, task=edit
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([getTasks(showInactive), getUsers()]);
      setTasks(t);
      setUsers(u.filter(u => u.role === 'member'));
    } catch {
      setError('Failed to load task library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [showInactive]);

  const handleDelete = async (task) => {
    if (!confirm(`Deactivate "${task.title}"? It will no longer generate daily tasks.`)) return;
    try {
      await deleteTask(task.id);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_active: false } : t));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate task');
    }
  };

  const handleReactivate = async (task) => {
    try {
      await updateTask(task.id, { is_active: true });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_active: true } : t));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reactivate task');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (formData.id) {
        const updated = await updateTask(formData.id, formData);
        setTasks(prev => prev.map(t => t.id === formData.id ? updated : t));
      } else {
        const created = await createTask(formData);
        setTasks(prev => [created, ...prev]);
      }
      setEditTask(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save task');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Task Library</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage reusable task templates</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
          <button
            onClick={() => setEditTask({})}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + New Task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-slate-400 text-center py-12">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-slate-500">No tasks yet. Create your first task!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              users={users}
              onEdit={() => setEditTask(task)}
              onDelete={handleDelete}
              onReactivate={handleReactivate}
            />
          ))}
        </div>
      )}

      {editTask !== null && (
        <TaskForm
          task={editTask}
          users={users}
          onSave={handleSave}
          onClose={() => setEditTask(null)}
        />
      )}
    </div>
  );
}

function TaskRow({ task, users, onEdit, onDelete, onReactivate }) {
  const assignee = users.find(u => u.id === task.default_assignee_id);
  const rec = RECURRENCES.find(r => r.value === task.recurrence);

  return (
    <div className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${
      task.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-medium text-sm ${task.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
            {task.title}
          </p>
          {!task.is_active && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">inactive</span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {rec?.label || task.recurrence}
          </span>
          {assignee && (
            <span className="text-xs text-slate-500">→ {assignee.name}</span>
          )}
          {task.instructions && (
            <span className="text-xs text-slate-400">📋 has instructions</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          Edit
        </button>
        {task.is_active ? (
          <button
            onClick={() => onDelete(task)}
            className="px-3 py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50"
          >
            Deactivate
          </button>
        ) : (
          <button
            onClick={() => onReactivate(task)}
            className="px-3 py-1.5 text-xs text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-50"
          >
            Reactivate
          </button>
        )}
      </div>
    </div>
  );
}

function TaskForm({ task, users, onSave, onClose }) {
  const isNew = !task.id;
  const [form, setForm] = useState({
    id: task.id || undefined,
    title: task.title || '',
    description: task.description || '',
    instructions: task.instructions || '',
    recurrence: task.recurrence || 'daily',
    custom_days: task.custom_days || [],
    default_assignee_id: task.default_assignee_id || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleDay = (day) => {
    set('custom_days', form.custom_days.includes(day)
      ? form.custom_days.filter(d => d !== day)
      : [...form.custom_days, day].sort());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { alert('Title is required'); return; }
    setSaving(true);
    await onSave({
      ...form,
      default_assignee_id: form.default_assignee_id || null,
      custom_days: form.recurrence === 'custom_days' ? form.custom_days : undefined,
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-800">{isNew ? 'New Task' : 'Edit Task'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Make Bed"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Short description (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recurrence</label>
            <select
              value={form.recurrence}
              onChange={e => set('recurrence', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {RECURRENCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {form.recurrence === 'custom_days' && (
              <div className="flex gap-2 mt-2">
                {DAY_NAMES.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                      form.custom_days.includes(i)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Assignee</label>
            <select
              value={form.default_assignee_id}
              onChange={e => set('default_assignee_id', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None (ad-hoc only)</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Instructions <span className="text-slate-400 font-normal">(Markdown)</span>
            </label>
            <textarea
              value={form.instructions}
              onChange={e => set('instructions', e.target.value)}
              rows={5}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Step-by-step instructions, tips, links…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isNew ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
