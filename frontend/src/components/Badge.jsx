const variants = {
  paid:    'bg-emerald-100/80 text-emerald-800 ring-1 ring-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20',
  partial: 'bg-amber-100/80 text-amber-800 ring-1 ring-amber-200/60 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20',
  unpaid:  'bg-rose-100/80 text-rose-800 ring-1 ring-rose-200/60 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20',
  advance: 'bg-teal-100/80 text-teal-800 ring-1 ring-teal-200/60 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-400/20',
  waived:  'bg-slate-100/80 text-slate-600 ring-1 ring-slate-200/60 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
  yes:     'bg-rose-100/80 text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20',
  no:      'bg-emerald-100/80 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20',
  active:  'bg-blue-100/80 text-blue-700 ring-1 ring-blue-200/60 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/20',
  inactive:'bg-slate-100/80 text-slate-500 ring-1 ring-slate-200/60 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10',
  default: 'bg-slate-100/80 text-slate-700 ring-1 ring-slate-200/60 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
}

export default function Badge({ value, label }) {
  const cls = variants[value] ?? variants.default
  return (
    <span className={`badge ${cls}`}>
      {label ?? value}
    </span>
  )
}
