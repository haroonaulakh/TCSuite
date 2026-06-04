const variants = {
  paid:    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  unpaid:  'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  advance: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  waived:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  yes:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  no:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  active:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  inactive:'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export default function Badge({ value, label }) {
  const cls = variants[value] ?? variants.default
  return (
    <span className={`badge ${cls}`}>
      {label ?? value}
    </span>
  )
}
