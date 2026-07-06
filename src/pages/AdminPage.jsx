import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Shared/Layout'
import TaskLibrary from '../components/Admin/TaskLibrary'
import AssignTasks from '../components/Admin/AssignTasks'
import FamilyMembers from '../components/Admin/FamilyMembers'

const TABS = [
  { id: 'tasks', label: '📋 Task Library', path: '/admin/tasks' },
  { id: 'assign', label: '📅 Assign Tasks', path: '/admin/assign' },
  { id: 'family', label: '👨‍👩‍👧 Family', path: '/admin/family' },
]

export default function AdminPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = TABS.find(t => t.path === location.pathname)?.id || 'tasks'

  return (
    <Layout>
      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && <TaskLibrary />}
      {activeTab === 'assign' && <AssignTasks />}
      {activeTab === 'family' && <FamilyMembers />}
    </Layout>
  )
}
