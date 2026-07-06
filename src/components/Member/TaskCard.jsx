import { useState } from 'react'

export default function TaskCard({ assignment, onComplete, onUncomplete, currentUserId }) {
  const task = assignment.tasks
  const completion = assignment.completions?.find(c => c.completed_by === currentUserId)
  const isCompleted = !!completion
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      if (isCompleted) {
        await onUncomplete(assignment.id, currentUserId)
      } else {
        await onComplete(assignment.id, currentUserId)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`bg-white border rounded-xl px-4 py-4 flex items-center gap-4 transition-colors ${
      isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'
    }`}>
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-indigo-400'
        } disabled:opacity-50`}
      >
        {isCompleted && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task?.title}
        </p>
        {task?.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
        )}
      </div>

      {task?.points != null && (
        <span className="text-xs bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-medium flex-shrink-0">
          ⭐ {task.points}
        </span>
      )}
    </div>
  )
}
