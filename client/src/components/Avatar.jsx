export default function Avatar({ name, color, size = 'md' }) {
  const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: color || '#6366f1' }}
      title={name}
    >
      {name ? name[0].toUpperCase() : '?'}
    </div>
  );
}
