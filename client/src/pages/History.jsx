import { useState, useEffect, useCallback } from 'react';
import { getHistory, getAuditLog, getUsers } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function History() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [tab, setTab] = useState('tasks'); // 'tasks' | 'audit'
  const [rows, setRows] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user_id: '',
    date_from: daysAgo(7),
    date_to: todayStr(),
    status: '',
  });

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        date_from: filters.date_from,
        date_to: filters.date_to,
        ...(filters.user_id ? { user_id: filters.user_id } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      };
      const data = await getHistory(params);
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadAudit = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await getAuditLog(100);
      setAuditRows(data);
    } catch {
      setAuditRows([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) getUsers().then(u => setUsers(u));
  }, [isAdmin]);

  useEffect(() => {
    if (tab === 'tasks') loadHistory();
    else loadAudit();
  }, [tab, loadHistory, loadAudit]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">History</h1>
          <p className="text-slate-500 text-sm mt-0.5">Past tasks and activity</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <TabBtn active={tab === 'tasks'} onClick={() => setTab('tasks')}>Task History</TabBtn>
        {isAdmin && <TabBtn active={tab === 'audit'} onClick={() => setTab('audit')}>Audit Log</TabBtn>}
      </div>

      {tab === 'tasks' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            {isAdmin && (
              <select
                value={filters.user_id}
                onChange={e => setFilter('user_id', e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All members</option>
                {users.filter(u => u.role === 'member').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={filters.date_from}
              onChange={e => setFilter('date_from', e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="self-center text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={e => setFilter('date_to', e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={filters.status}
              onChange={e => setFilter('status', e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All statuses</option>
              <option value="done">Done</option>
              <option value="pending">Pending</option>
              <option value="skipped">Skipped</option>
              <option value="reassigned">Reassigned</option>
            </select>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-slate-400 text-center py-12">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📅</div>
              <p className="text-slate-500">No task history for this period.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Task</th>
                    {isAdmin && <th className="text-left py-3 px-4 font-medium text-slate-600">Member</th>}
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Completed</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Verified by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600">{row.assigned_date}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {row.task_title}
                        {row.override_note && (
                          <p className="text-xs text-amber-600 font-normal">{row.override_note}</p>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={row.assigned_to_name} color={row.assigned_to_color} size="sm" />
                            <span className="text-slate-600">{row.assigned_to_name}</span>
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <StatusBadge status={row.status} verified={!!row.verified_at} />
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {row.completed_at ? new Date(row.completed_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {row.verified_by_name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'audit' && isAdmin && (
        <>
          {loading ? (
            <div className="text-slate-400 text-center py-12">Loading…</div>
          ) : auditRows.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500">No audit events yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actor</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Action</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Entity</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{row.actor_name || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{row.action}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {row.entity_type} {row.entity_id ? `(${row.entity_id.slice(0, 8)}…)` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs font-mono truncate max-w-xs">
                        {row.detail_json ? JSON.stringify(row.detail_json) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}
