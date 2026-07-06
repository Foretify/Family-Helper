import { useState } from 'react'
import { useTasks } from '../../hooks/useTasks'

function TaskForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [points, setPoints] = useState(initial?.points || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSave({ title, description, points: points ? Number(points) : null })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
        <input
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Take out trash"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Optional details…"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Points</label>
        <input
          type="number"
          min={0}
          value={points}
          onChange={e => setPoints(e.target.value)}
          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="0"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function TaskRow({ task, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"?`)) return
    setDeleting(true)
    try {
      await onDelete(task.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">{task.title}</span>
          {task.points != null && (
            <span className="text-xs bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-medium">
              ⭐ {task.points} pts
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function TaskLibrary() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)

  if (loading) return <p className="text-gray-500">Loading tasks…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Task Library</h2>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + New Task
          </button>
        )}
      </div>

      {showCreate && (
        <TaskForm
          onSave={async (data) => { await createTask(data); setShowCreate(false) }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {tasks.length === 0 && !showCreate && (
        <p className="text-gray-500 text-sm">No tasks yet. Create your first one!</p>
      )}

      <div className="space-y-3">
        {tasks.map(task =>
          editing?.id === task.id ? (
            <TaskForm
              key={task.id}
              initial={task}
              onSave={async (data) => { await updateTask(task.id, data); setEditing(null) }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <TaskRow
              key={task.id}
              task={task}
              onEdit={setEditing}
              onDelete={deleteTask}
            />
          )
        )}
      </div>
    </div>
  )
}
