import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useTasks } from '../../hooks/useTasks'
import { useAssignments } from '../../hooks/useAssignments'
import Avatar from '../Shared/Avatar'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AssignTasks() {
  const [members, setMembers] = useState([])
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [selectedMember, setSelectedMember] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const { tasks } = useTasks()
  const { assignments, createAssignment, deleteAssignment, loading } = useAssignments(
    selectedMember || null,
    selectedDate
  )

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => {
      setMembers(data || [])
      if (data?.length) setSelectedMember(data[0].id)
    })
  }, [])

  async function handleAssign(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await createAssignment({
        taskId: selectedTask,
        assignedTo: selectedMember,
        assignedDate: selectedDate,
      })
      setSelectedTask('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Assign Tasks</h2>

      {/* Assign form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-700">New Assignment</h3>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <form onSubmit={handleAssign} className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Family Member</label>
            <select
              required
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Task</label>
            <select
              required
              value={selectedTask}
              onChange={e => setSelectedTask(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a task…</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Assigning…' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Assignment list for selected member+date */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">
          Assignments for {memberMap[selectedMember]?.display_name || '…'} on {selectedDate}
        </h3>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-500 text-sm">No assignments for this date.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map(a => {
              const completed = a.completions?.length > 0
              const task = a.tasks
              return (
                <div
                  key={a.id}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={memberMap[a.assigned_to]?.display_name}
                      color={memberMap[a.assigned_to]?.avatar_color}
                      size="sm"
                    />
                    <div>
                      <span className={`font-medium text-sm ${completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task?.title}
                      </span>
                      {completed && (
                        <span className="ml-2 text-xs text-green-600 font-medium">✓ Done</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAssignment(a.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
