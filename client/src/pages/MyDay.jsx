import { useState, useEffect, useCallback } from 'react';
import { getInstances, updateInstance, updateTaskInstructions } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import InstructionsModal from '../components/InstructionsModal';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function MyDay() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInstructions, setSelectedInstructions] = useState(null);
  const [editingInstructions, setEditingInstructions] = useState(null);
  const [instrText, setInstrText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getInstances(date, user.id);
      setInstances(data);
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [date, user.id]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (instance) => {
    try {
      const action = instance.status === 'done' ? 'uncomplete' : 'complete';
      const updated = await updateInstance(instance.id, { action });
      setInstances(prev => prev.map(i => i.id === instance.id ? { ...i, ...updated } : i));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update task');
    }
  };

  const startEditInstructions = (instance) => {
    setEditingInstructions(instance);
    setInstrText(instance.instructions_snapshot || '');
  };

  const saveInstructions = async () => {
    if (!editingInstructions) return;
    setSaving(true);
    try {
      await updateInstance(editingInstructions.id, {
        action: 'update_instructions',
        instructions_snapshot: instrText,
      });
      setInstances(prev =>
        prev.map(i =>
          i.id === editingInstructions.id
            ? { ...i, instructions_snapshot: instrText }
            : i
        )
      );
      setEditingInstructions(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save instructions');
    } finally {
      setSaving(false);
    }
  };

  const done = instances.filter(i => i.status === 'done').length;
  const total = instances.filter(i => i.status !== 'skipped' && i.status !== 'reassigned').length;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Day</h1>
          <p className="text-slate-500 text-sm mt-0.5">Hello, {user.name}!</p>
        </div>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={e => setDate(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-600 mb-1">
            <span>{done} of {total} done</span>
            <span>{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm text-center py-12">Loading…</div>
      ) : instances.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-slate-500">No tasks for this day.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map(instance => (
            <TaskRow
              key={instance.id}
              instance={instance}
              onToggle={handleToggle}
              onViewInstructions={setSelectedInstructions}
              onEditInstructions={startEditInstructions}
            />
          ))}
        </div>
      )}

      {/* Instructions view modal */}
      {selectedInstructions && (
        <InstructionsModal
          title={selectedInstructions.task_title}
          instructions={selectedInstructions.instructions_snapshot}
          onClose={() => setSelectedInstructions(null)}
        />
      )}

      {/* Instructions edit modal */}
      {editingInstructions && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setEditingInstructions(null); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-slate-800">Edit Instructions — {editingInstructions.task_title}</h2>
              <button onClick={() => setEditingInstructions(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-4">
              <textarea
                value={instrText}
                onChange={e => setInstrText(e.target.value)}
                rows={8}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Add instructions (Markdown supported)…"
              />
              <p className="text-xs text-slate-400 mt-1">Markdown supported</p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setEditingInstructions(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
              <button onClick={saveInstructions} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ instance, onToggle, onViewInstructions, onEditInstructions }) {
  const isDone = instance.status === 'done';
  const isSkipped = instance.status === 'skipped';
  const isReassigned = instance.status === 'reassigned';
  const isInactive = isSkipped || isReassigned;
  const hasInstructions = !!instance.instructions_snapshot;

  return (
    <div className={`bg-white border rounded-xl p-4 flex items-start gap-3 transition-all ${
      isDone ? 'border-green-200 bg-green-50' : isInactive ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-indigo-200'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => !isInactive && onToggle(instance)}
        disabled={isInactive}
        className={`w-6 h-6 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
          isDone ? 'bg-green-500 border-green-500' : isInactive ? 'border-slate-300 cursor-default' : 'border-slate-300 hover:border-indigo-400'
        }`}
      >
        {isDone && <span className="text-white text-xs">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {instance.task_title}
          </p>
          <StatusBadge status={instance.status} verified={!!instance.verified_at} />
        </div>

        {instance.task_description && (
          <p className="text-xs text-slate-500 mt-0.5">{instance.task_description}</p>
        )}
        {instance.override_note && (
          <p className="text-xs text-amber-600 mt-1 italic">Note: {instance.override_note}</p>
        )}

        {/* Instruction links */}
        <div className="flex gap-3 mt-2">
          {hasInstructions && (
            <button
              onClick={() => onViewInstructions(instance)}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline"
            >
              View instructions
            </button>
          )}
          {!isInactive && (
            <button
              onClick={() => onEditInstructions(instance)}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              {hasInstructions ? 'Edit instructions' : 'Add instructions'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
