export default function StatusBadge({ status, verified }) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';

  if (status === 'done' && verified) {
    return <span className={`${base} bg-emerald-100 text-emerald-800`}>✓ Verified</span>;
  }
  if (status === 'done') {
    return <span className={`${base} bg-green-100 text-green-700`}>✓ Done</span>;
  }
  if (status === 'skipped') {
    return <span className={`${base} bg-slate-100 text-slate-600`}>— Skipped</span>;
  }
  if (status === 'reassigned') {
    return <span className={`${base} bg-amber-100 text-amber-700`}>⟳ Reassigned</span>;
  }
  return <span className={`${base} bg-blue-100 text-blue-700`}>● Pending</span>;
}
