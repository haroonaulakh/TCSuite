import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStudents } from '../api/studentsApi'
import { getFeeSummary, getTopDefaulters } from '../api/feesApi'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'

export default function Dashboard() {
  const [stats, setStats]       = useState(null)
  const [recent, setRecent]     = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const now = new Date()
    Promise.all([
      getStudents({ page_size: 5, ordering: '-created_at' }),
      getFeeSummary({ month: now.getMonth() + 1, year: now.getFullYear() }),
      getTopDefaulters({ limit: 10 }),
    ])
      .then(([studRes, sumRes, defaultersRes]) => {
        setStats({
          totalStudents:  studRes.data.count ?? studRes.data.length,
          ...sumRes.data,
        })
        setRecent(defaultersRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-display tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{month} overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents}
          sub="Enrolled"
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Collected"
          value={stats?.total_collected != null ? `Rs ${Number(stats.total_collected).toLocaleString()}` : '—'}
          sub="This month"
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Outstanding Balance"
          value={stats?.total_balance != null ? `Rs ${Number(stats.total_balance).toLocaleString()}` : '—'}
          sub="Pending dues"
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          title="Fully Paid"
          value={stats?.paid_count}
          sub="Records this month"
          color="teal"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Top Defaulters — ranked by highest pending balance */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-rose-500" />
            </span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 font-display tracking-tight">Top Defaulters</h2>
            <span className="text-xs text-slate-400">ranked by highest pending dues</span>
          </div>
          <Link to="/fees/records?status=unpaid" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            No defaulters — great work!
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900">
              <tr>
                <th className="table-th w-8">#</th>
                <th className="table-th">Student</th>
                <th className="table-th">Class</th>
                <th className="table-th">Period</th>
                <th className="table-th text-right">Total Due</th>
                <th className="table-th text-right">Paid</th>
                <th className="table-th text-right">Balance</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {recent.map((r, idx) => (
                <tr key={r.id} className="bg-red-50/40 dark:bg-red-950/10 hover:bg-red-100/60 dark:hover:bg-red-950/20 border-l-4 border-l-red-400">
                  <td className="table-td text-center">
                    <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-red-600 text-white' : idx < 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                      <div>
                        <Link to={`/students/${r.student}`} className="font-medium hover:text-blue-600 block leading-tight">
                          {r.student_name ?? r.student}
                        </Link>
                        <span className="text-xs text-gray-400">#{r.admission_no}</span>
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-sm">{r.current_class}</td>
                  <td className="table-td text-xs">{r.month_name ?? r.month} {r.year}</td>
                  <td className="table-td text-right font-mono text-xs font-medium">Rs {Number(r.total_amount).toLocaleString()}</td>
                  <td className="table-td text-right font-mono text-xs text-green-700">Rs {Number(r.amount_paid).toLocaleString()}</td>
                  <td className="table-td text-right">
                    <span className="font-mono text-sm font-bold text-red-600">Rs {Number(r.balance).toLocaleString()}</span>
                  </td>
                  <td className="table-td"><Badge value={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          { path: '/students/new',    label: 'Enrol New Student', from: '#3b82f6', end: '#1d4ed8', icon: '＋' },
          { path: '/classes',         label: 'Manage Classes',    from: '#14b8a6', end: '#0f766e', icon: '🏫' },
          { path: '/fees',            label: 'Fee Dashboard',     from: '#6366f1', end: '#4338ca', icon: '📊' },
          { path: '/fees/records',    label: 'Fee Records',       from: '#10b981', end: '#047857', icon: '₨' },
          { path: '/fees/structures', label: 'Fee Structures',    from: '#0ea5e9', end: '#0369a1', icon: '⚙' },
          { path: '/academic-years',  label: 'Academic Years',    from: '#f59e0b', end: '#b45309', icon: '📅' },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="group relative rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
          >
            <span
              className="absolute inset-0 transition-opacity duration-300"
              style={{
                background: `linear-gradient(135deg, ${item.from} 0%, ${item.end} 100%)`,
                boxShadow: `0 10px 30px -10px ${item.end}80`,
              }}
            />
            <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
            <span className="relative text-2xl drop-shadow">{item.icon}</span>
            <span className="relative font-semibold text-white tracking-tight">{item.label}</span>
            <span className="relative ml-auto text-white/80 transition-transform group-hover:translate-x-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
