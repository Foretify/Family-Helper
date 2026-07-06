import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAssignments(userId, date) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('assignments')
      .select(`
        id,
        assigned_date,
        assigned_to,
        tasks ( id, title, description, points ),
        completions ( id, completed_by, completed_at )
      `)
      .order('assigned_date', { ascending: false })

    if (userId) query = query.eq('assigned_to', userId)
    if (date) query = query.eq('assigned_date', date)

    const { data, error } = await query
    if (error) setError(error.message)
    else setAssignments(data)
    setLoading(false)
  }, [userId, date])

  useEffect(() => {
    fetchAssignments()

    const channel = supabase
      .channel(`assignments-${userId || 'all'}-${date || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetchAssignments)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'completions' }, fetchAssignments)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchAssignments, userId, date])

  async function createAssignment({ taskId, assignedTo, assignedDate }) {
    const { error } = await supabase.from('assignments').insert({
      task_id: taskId,
      assigned_to: assignedTo,
      assigned_date: assignedDate,
    })
    if (error) throw error
  }

  async function deleteAssignment(id) {
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (error) throw error
  }

  async function completeAssignment(assignmentId, userId) {
    const { error } = await supabase.from('completions').insert({
      assignment_id: assignmentId,
      completed_by: userId,
    })
    if (error) throw error
  }

  async function uncompleteAssignment(assignmentId, userId) {
    const { error } = await supabase
      .from('completions')
      .delete()
      .eq('assignment_id', assignmentId)
      .eq('completed_by', userId)
    if (error) throw error
  }

  return {
    assignments,
    loading,
    error,
    createAssignment,
    deleteAssignment,
    completeAssignment,
    uncompleteAssignment,
    refresh: fetchAssignments,
  }
}
