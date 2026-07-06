import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../Shared/Avatar'

const ROLES = ['admin', 'member']

export default function FamilyMembers() {
  const { profile: currentProfile } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    const { data } = await supabase.from('profiles').select('*').order('display_name')
    setMembers(data || [])
    setLoading(false)
  }

  async function changeRole(memberId, role) {
    setSaving(memberId)
    await supabase.from('profiles').update({ role }).eq('id', memberId)
    await fetchMembers()
    setSaving(null)
  }

  if (loading) return <p className="text-gray-500">Loading family members…</p>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Family Members</h2>

      {members.length === 0 && (
        <p className="text-gray-500 text-sm">No family members yet.</p>
      )}

      <div className="space-y-3">
        {members.map(member => (
          <div
            key={member.id}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Avatar name={member.display_name} color={member.avatar_color} />
              <div>
                <p className="font-medium text-gray-800">{member.display_name}</p>
                <p className="text-xs text-gray-400">{member.id === currentProfile?.id ? 'You' : ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                member.role === 'admin'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {member.role}
              </span>

              {member.id !== currentProfile?.id && (
                <select
                  value={member.role}
                  disabled={saving === member.id}
                  onChange={e => changeRole(member.id, e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
