import { useState, useEffect, useCallback } from 'react';
import { getInstances, getUsers, updateInstance, createInstance, getTasks, deleteInstance } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
import InstructionsModal from '../components/InstructionsModal';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminBoard() {
  const [date, setDate] = useState(todayStr());
  const [instances, setInstances] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInstructions, setSelectedInstructions] = useState(null);
  const [overrideModal, setOverrideModal] = useState(null);
  const [addModal, setAddModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [inst, usr, tsk] = await Promise.all([
        getInstances(date),
        getUsers(),
        getTasks(),
      ]);
      setInstances(inst);
      setUsers(usr.filter(u => u.role === 'member'));
      setTasks(tsk);
    } catch {
      setError('Failed to load board data.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Group instances by user
  const byUser = users.map(u => ({
    user: u,
    instances: instances.filter(i => i.assigned_to === u.id),
  }));

  const handleAction = async (instance, action, extra = {}) => {
    try {
      const updated = await updateInstance(instance.id, { action, ...extra });
      setInstances(prev => prev.map(i => i.id === instance.id ? { ...i, ...updated } : i));
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} task`);
    }
  };

  const handleDeleteInstance = async (instance) => {
    if (!confirm('Remove this task from the board?')) return;
    try {
      await deleteInstance(instance.id);
      setInstances(prev => prev.filter(i => i.id !== instance.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete instance');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daily Board</h1>
          <p className="text-slate-500 text-sm mt-0.5">Family task overview</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => setAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + Add Task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-slate-400 text-center py-12">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {byUser.map(({ user, instances: userInst }) => (
            <MemberColumn
              key={user.id}
              user={user}
              instances={userInst}
              users={users}
              onAction={handleAction}
              onDelete={handleDeleteInstance}
              onViewInstructions={setSelectedInstructions}
              onOpenOverride={setOverrideModal}
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

      {/* Override / reassign modal */}
      {overrideModal && (
        <OverrideModal
          instance={overrideModal.instance}
          action={overrideModal.action}
          users={users}
          onConfirm={async (extra) => {
            await handleAction(overrideModal.instance, overrideModal.action, extra);
            setOverrideModal(null);
            if (overrideModal.action === 'reassign') load();
          }}
          onClose={() => setOverrideModal(null)}
        />
      )}

      {/* Add ad-hoc task modal */}
      {addModal && (
        <AddTaskModal
          tasks={tasks}
          users={users}
          date={date}
          onAdd={async (data) => {
            try {
              const inst = await createInstance(data);
              await load();
              setAddModal(false);
            } catch (err) {
              alert(err.response?.data?.error || 'Failed to add task');
            }
          }}
          onClose={() => setAddModal(false)}
        />
      )}
    </div>
  );
}

function MemberColumn({ user, instances, users, onAction, onDelete, onViewInstructions, onOpenOverride }) {
  const done = instances.filter(i => i.status === 'done').length;
  const total = instances.filter(i => i.status !== 'skipped' && i.status !== 'reassigned').length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Column header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-slate-50">
        <Avatar name={user.name} color={user.avatar_color} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{user.name}</p>
          <p className="text-xs text-slate-500">{done}/{total} done</p>
        </div>
      </div>

      {/* Tasks */}
      <div className="divide-y divide-slate-100">
        {instances.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No tasks</p>
        ) : (
          instances.map(inst => (
            <BoardTaskRow
              key={inst.id}
              instance={inst}
              users={users}
              onAction={onAction}
              onDelete={onDelete}
              onViewInstructions={onViewInstructions}
              onOpenOverride={onOpenOverride}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BoardTaskRow({ instance, users, onAction, onDelete, onViewInstructions, onOpenOverride }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="p-3 hover:bg-slate-50 group">
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <button
          onClick={() => onAction(instance, instance.status === 'done' ? 'uncomplete' : 'complete')}
          className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
            instance.status === 'done' ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-indigo-400'
          }`}
          disabled={instance.status === 'skipped' || instance.status === 'reassigned'}
        >
          {instance.status === 'done' && <span className="text-white text-xs">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium flex-1 min-w-0 truncate ${
              instance.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
            }`}>
              {instance.task_title}
            </p>
            <StatusBadge status={instance.status} verified={!!instance.verified_at} />
          </div>

          {instance.override_note && (
            <p className="text-xs text-amber-600 mt-0.5 italic">{instance.override_note}</p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-1.5">
            {instance.status === 'done' && !instance.verified_at && (
              <button
                onClick={() => onAction(instance, 'verify')}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
              >
                ✓ Verify
              </button>
            )}
            {instance.instructions_snapshot && (
              <button
                onClick={() => onViewInstructions(instance)}
                className="text-xs text-indigo-500 hover:text-indigo-700"
              >
                📋 Instructions
              </button>
            )}
            {instance.status !== 'skipped' && instance.status !== 'reassigned' && (
              <>
                <button
                  onClick={() => onOpenOverride({ instance, action: 'skip' })}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Skip
                </button>
                <button
                  onClick={() => onOpenOverride({ instance, action: 'reassign' })}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Reassign
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(instance)}
              className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 ml-auto"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverrideModal({ instance, action, users, onConfirm, onClose }) {
  const [note, setNote] = useState('');
  const [reassignTo, setReassignTo] = useState('');

  const handleConfirm = () => {
    if (action === 'reassign' && !reassignTo) {
      alert('Please select a user to reassign to');
      return;
    }
    onConfirm({
      override_note: note,
      ...(action === 'reassign' ? { reassign_to: reassignTo } : {}),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-slate-800 capitalize">{action} Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-medium">{instance.task_title}</span>
          </p>

          {action === 'reassign' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reassign to</label>
              <select
                value={reassignTo}
                onChange={e => setReassignTo(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select member…</option>
                {users.filter(u => u.id !== instance.assigned_to).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Alice was at soccer practice"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({ tasks, users, date, onAdd, onClose }) {
  const [taskId, setTaskId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!taskId || !assignedTo) {
      alert('Please select a task and assignee');
      return;
    }
    onAdd({ task_id: taskId, assigned_to: assignedTo, assigned_date: date, override_note: note });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-slate-800">Add Task for {date}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Task</label>
            <select
              value={taskId}
              onChange={e => setTaskId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select task…</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assign to</label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select member…</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Reason for adding…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
