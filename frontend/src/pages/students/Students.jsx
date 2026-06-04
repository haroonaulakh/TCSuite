import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getStudents, deleteStudent } from '../../api/studentsApi'
import { getClassRooms } from '../../api/feesApi'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'

import client from '../../api/client'
const getStudentsByClass = (params) => client.get('/students/by-class/', { params })

// ── List view ─────────────────────────────────────────────
function ListView({ onDelete }) {
  const navigate = useNavigate()
  const [data, setData]           = useState([])
  const [count, setCount]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [classFilter, setClass]   = useState('')
  const [withdrawn, setWithdrawn] = useState('')
  const [page, setPage]           = useState(1)
  const [classOptions, setClassOptions] = useState([])
  const PAGE_SIZE = 20

  useEffect(() => {
    getClassRooms().then(({ data: res }) => setClassOptions((res.results ?? res).map(c => c.name))).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, page_size: PAGE_SIZE }
    if (search)      params.search        = search
    if (classFilter) params.current_class = classFilter
    if (withdrawn)   params.withdrawn     = withdrawn
    getStudents(params)
      .then(({ data: res }) => {
        setData(res.results ?? res)
        setCount(res.count ?? (res.results ?? res).length)
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false))
  }, [page, search, classFilter, withdrawn])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <>
      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="Search by name, admission no, B-Form, guardian…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        <select className="input w-full sm:w-48" value={classFilter}
          onChange={(e) => { setClass(e.target.value); setPage(1) }}>
          <option value="">All Classes</option>
          {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input w-full sm:w-44" value={withdrawn}
          onChange={(e) => { setWithdrawn(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="no">Active</option>
          <option value="yes">Withdrawn</option>
        </select>
        {(search || classFilter || withdrawn) && (
          <button className="btn-secondary"
            onClick={() => { setSearch(''); setClass(''); setWithdrawn(''); setPage(1) }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No students found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Adm #</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">Class</th>
                  <th className="table-th">Monthly Fee</th>
                  <th className="table-th">Guardian</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th">Arrears</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono text-blue-700 font-medium">{s.admission_no}</td>
                    <td className="table-td font-medium">{s.student_name}</td>
                    <td className="table-td">{s.current_class}</td>
                    <td className="table-td text-green-700 font-mono text-xs">
                      {s.current_fee ? `Rs ${Number(s.current_fee).toLocaleString()}` : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="table-td">{s.f_g_name}</td>
                    <td className="table-td">{s.f_g_contact}</td>
                    <td className="table-td">
                      {Number(s.arrear_dues) > 0
                        ? <span className="text-red-600 font-medium">Rs {Number(s.arrear_dues).toLocaleString()}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="table-td">
                      <Badge value={s.withdrawn} label={s.withdrawn === 'yes' ? 'Withdrawn' : 'Active'} />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/students/${s.id}`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors" title="View">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button onClick={() => navigate(`/students/${s.id}/edit`)}
                          className="text-gray-400 hover:text-emerald-600 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => onDelete(s.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages} ({count} students)</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-secondary">Previous</button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn-secondary">Next</button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Class view ────────────────────────────────────────────
function ClassView() {
  const navigate = useNavigate()
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    getStudentsByClass()
      .then(({ data }) => {
        setGroups(data)
        const first = data.find(g => g.count > 0)
        if (first) setExpanded({ [first.class_name]: true })
      })
      .catch(() => toast.error('Failed to load class groups'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (cls) => setExpanded((prev) => ({ ...prev, [cls]: !prev[cls] }))

  const totalStudents = groups.reduce((s, g) => s + g.count, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  if (groups.length === 0) {
    return <div className="py-16 text-center text-gray-400 card">No classes found. Go to Classes page to add classes.</div>
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="card p-3 bg-blue-50 border-blue-200 text-sm flex flex-wrap gap-x-5 gap-y-1">
        <span className="font-semibold text-blue-800">{groups.length} classes</span>
        <span className="text-blue-700">{totalStudents} active students</span>
      </div>

      {groups.map((g) => (
        <div key={g.class_name} className="card overflow-hidden">
          {/* Class header */}
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            onClick={() => toggle(g.class_name)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 ${g.count > 0 ? 'bg-blue-600' : 'bg-gray-400'} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
                {g.class_name.substring(0, 2)}
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">{g.class_name}</p>
                <p className="text-xs text-gray-400">
                  {g.count > 0
                    ? `${g.count} active student${g.count !== 1 ? 's' : ''}`
                    : 'No students'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {g.count > 0 && (
                <Link
                  to={`/fees/records?current_class=${encodeURIComponent(g.class_name)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Fee Records
                </Link>
              )}
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expanded[g.class_name] ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Students table */}
          {expanded[g.class_name] && (
            <div className="border-t border-gray-100 overflow-x-auto">
              {g.count === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No active students in this class</div>
              ) : (
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th">Adm #</th>
                      <th className="table-th">Name</th>
                      <th className="table-th">Monthly Fee</th>
                      <th className="table-th">Guardian</th>
                      <th className="table-th">Contact</th>
                      <th className="table-th">Arrears</th>
                      <th className="table-th">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {g.students.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="table-td font-mono text-blue-700 text-xs">{s.admission_no}</td>
                        <td className="table-td font-medium">{s.student_name}</td>
                        <td className="table-td font-mono text-xs text-green-700">
                          {s.current_fee ? `Rs ${Number(s.current_fee).toLocaleString()}` : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="table-td">{s.f_g_name}</td>
                        <td className="table-td">{s.f_g_contact}</td>
                        <td className="table-td">
                          {Number(s.arrear_dues) > 0
                            ? <span className="text-red-600 text-xs font-medium">Rs {Number(s.arrear_dues).toLocaleString()}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="table-td">
                          <div className="flex gap-2">
                            <button onClick={() => navigate(`/students/${s.id}`)}
                              className="text-xs text-blue-600 hover:underline">View</button>
                            <button onClick={() => navigate(`/students/${s.id}/edit`)}
                              className="text-xs text-emerald-600 hover:underline">Edit</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main Students page ────────────────────────────────────
export default function Students() {
  const [tab, setTab]         = useState('list')
  const [deleteId, setDeleteId] = useState(null)

  const handleDeleteConfirm = async () => {
    try {
      await deleteStudent(deleteId)
      toast.success('Student deleted')
      setDeleteId(null)
    } catch {
      toast.error('Could not delete student')
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-display tracking-tight">Students</h1>
        <Link to="/students/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Enrol Student
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'list',  label: 'All Students' },
          { key: 'class', label: 'By Class' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list'
        ? <ListView onDelete={setDeleteId} />
        : <ClassView />
      }

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Student" size="sm">
        <p className="text-gray-600 text-sm">
          Permanently delete this student? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDeleteConfirm}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
