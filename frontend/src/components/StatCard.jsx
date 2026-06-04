export default function StatCard({ title, value, sub, icon, color = 'blue' }) {
  const colors = {
    blue: {
      bg: 'from-blue-500/15 to-blue-500/5 dark:from-blue-400/20 dark:to-blue-400/5',
      ring: 'ring-blue-300/40 dark:ring-blue-400/20',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bg: 'from-emerald-500/15 to-emerald-500/5 dark:from-emerald-400/20 dark:to-emerald-400/5',
      ring: 'ring-emerald-300/40 dark:ring-emerald-400/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
    yellow: {
      bg: 'from-amber-500/15 to-amber-500/5 dark:from-amber-400/20 dark:to-amber-400/5',
      ring: 'ring-amber-300/40 dark:ring-amber-400/20',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    red: {
      bg: 'from-rose-500/15 to-rose-500/5 dark:from-rose-400/20 dark:to-rose-400/5',
      ring: 'ring-rose-300/40 dark:ring-rose-400/20',
      icon: 'text-rose-600 dark:text-rose-400',
    },
    teal: {
      bg: 'from-teal-500/15 to-teal-500/5 dark:from-teal-400/20 dark:to-teal-400/5',
      ring: 'ring-teal-300/40 dark:ring-teal-400/20',
      icon: 'text-teal-600 dark:text-teal-400',
    },
    // legacy alias — used to be purple, now teal
    purple: {
      bg: 'from-teal-500/15 to-teal-500/5 dark:from-teal-400/20 dark:to-teal-400/5',
      ring: 'ring-teal-300/40 dark:ring-teal-400/20',
      icon: 'text-teal-600 dark:text-teal-400',
    },
  }
  const c = colors[color] ?? colors.blue
  return (
    <div className="card p-5 flex items-start gap-4 hover:-translate-y-0.5 transition-transform">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0
                    bg-gradient-to-br ${c.bg} ring-1 ${c.ring} ${c.icon}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-display tracking-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
