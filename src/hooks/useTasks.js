import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTasks()

    const channel = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchTasks() {
    setLoading(true)
    const { data, error } = await supabase.from('tasks').select('*').order('title')
    if (error) setError(error.message)
    else setTasks(data)
    setLoading(false)
  }

  async function createTask({ title, description, points }) {
    const { error } = await supabase.from('tasks').insert({ title, description, points })
    if (error) throw error
  }

  async function updateTask(id, updates) {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) throw error
  }

  async function deleteTask(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  }

  return { tasks, loading, error, createTask, updateTask, deleteTask }
}
