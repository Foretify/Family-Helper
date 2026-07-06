import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAssignments } from '../../hooks/useAssignments'
import TaskCard from './TaskCard'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })
}

export default function MyTasks() {
  const { profile } = useAuth()
  const [viewDate, setViewDate] = useState(todayISO())
  const {
    assignments,
    loading,
    completeAssignment,
    uncompleteAssignment,
  } = useAssignments(profile?.id, viewDate)

  const totalPoints = assignments
    .filter(a => a.completions?.some(c => c.completed_by === profile?.id))
    .reduce((sum, a) => sum + (a.tasks?.points || 0), 0)

  const completedCount = assignments.filter(
    a => a.completions?.some(c => c.completed_by === profile?.id)
  ).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Hey, {profile?.display_name}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{formatDate(viewDate)}</p>
        </div>

        <input
          type="date"
          value={viewDate}
          onChange={e => setViewDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 self-start"
        />
      </div>

      {/* Progress summary */}
      {assignments.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-700">
              {completedCount}/{assignments.length} tasks done
            </p>
            <div className="mt-1.5 h-2 w-48 bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-indigo-500 rounded-full transition-all"
                style={{ width: `${(completedCount / assignments.length) * 100}%` }}
              />
            </div>
          </div>
          {totalPoints > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">⭐ {totalPoints}</p>
              <p className="text-xs text-gray-500">points earned</p>
            </div>
          )}
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-medium">No tasks assigned for this day!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => (
            <TaskCard
              key={a.id}
              assignment={a}
              currentUserId={profile?.id}
              onComplete={completeAssignment}
              onUncomplete={uncompleteAssignment}
            />
          ))}
        </div>
      )}
    </div>
  )
}
