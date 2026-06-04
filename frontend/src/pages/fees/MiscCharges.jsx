import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  getMiscCharges, createMiscCharge, deleteMiscCharge,
  getChargeCategories, getMiscChargeSummary,
} from '../../api/feesApi'
import { getStudents } from '../../api/studentsApi'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import useYears from '../../hooks/useYears'

const MONTHS = [
  { v: 1,  l: 'January'  }, { v: 2,  l: 'February' }, { v: 3,  l: 'March'     },
  { v: 4,  l: 'April'    }, { v: 5,  l: 'May'       }, { v: 6,  l: 'June'      },
  { v: 7,  l: 'July'     }, { v: 8,  l: 'August'    }, { v: 9,  l: 'September' },
  { v: 10, l: 'October'  }, { v: 11, l: 'November'  }, { v: 12, l: 'December'  },
]

const NOW = new Date()

export default function MiscCharges() {
  const yearOptions = useYears()

  const [data, setData]       = useState([])
  const [count, setCount]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const PAGE_SIZE = 25

  const [search, setSearch]           = useState('')
  const [filterMonth, setFilterMonth] = useState(String(NOW.getMonth() + 1))
  const [filterYear, setFilterYear]   = useState(String(NOW.getFullYear()))

  const [categories, setCategories] = useState([])

  const [createModal, setCreateModal]       = useState(false)
  const [creating, setCreating]             = useState(false)
  const [studentSearch, setStudentSearch]   = useState('')
  const [studentOptions, setStudentOptions] = useState([])
  const [createForm, setCreateForm]         = useState({
    student: '', category: '', amount: '', month: NOW.getMonth() + 1,
    year: NOW.getFullYear(), remarks: '',
  })

  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting]           = useState(false)

  useEffect(() => {
    getChargeCategories()
      .then(({ data: res }) => setCategories((res.results ?? res).filter(c => c.is_active !== false)))
      .catch(() => {})
  }, [])

  const buildParams = useCallback(() => {
    const p = { page, page_size: PAGE_SIZE }
    if (search)      p.search = search
    if (filterMonth) p.month  = filterMonth
    if (filterYear)  p.year   = filterYear
    return p
  }, [page, search, filterMonth, filterYear])

  const load = useCallback(() => {
    setLoading(true)
    getMiscCharges(buildParams())
      .then(({ data: res }) => {
        setData(res.results ?? res)
        setCount(res.count ?? (res.results ?? res).length)
      })
      .catch(() => toast.error('Failed to load misc charges'))
      .finally(() => setLoading(false))
  }, [buildParams])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (studentSearch.length < 2) { setStudentOptions([]); return }
    getStudents({ search: studentSearch, page_size: 10 })
      .then(({ data: res }) => setStudentOptions(res.results ?? res))
      .catch(() => {})
  }, [studentSearch])

  const handleCategoryChange = (categoryId) => {
    const cat = categories.find(c => String(c.id) === String(categoryId))
    setCreateForm(prev => ({
      ...prev,
      category: categoryId,
      amount: cat?.default_amount ?? cat?.amount ?? '',
    }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createMiscCharge({
        student: createForm.student,
        category: createForm.category,
        amount: createForm.amount,
        month: createForm.month,
        year: createForm.year,
        remarks: createForm.remarks,
      })
      toast.success('Misc charge created successfully')
      setCreateModal(false)
      setCreateForm({
        student: '', category: '', amount: '', month: NOW.getMonth() + 1,
        year: NOW.getFullYear(), remarks: '',
      })
      setStudentSearch('')
      load()
    } catch (err) {
      const d = err.response?.data
      const msg = d?.non_field_errors?.[0] || d?.detail
        || (typeof d === 'object' ? Object.values(d).flat()[0] : null) || 'Failed to create charge'
      toast.error(Array.isArray(msg) ? msg[0] : String(msg))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await deleteMiscCharge(deleteConfirm.id)
      toast.success('Charge deleted')
      setDeleteConfirm(null)
      load()
    } catch {
      toast.error('Failed to delete charge')
    } finally {
      setDeleting(false)
    }
  }

  const clearFilters = () => {
    setSearch(''); setFilterMonth(''); setFilterYear('')
    setPage(1)
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)
  const hasFilters = search
  const currentMonthLabel = MONTHS.find(m => m.v === Number(filterMonth))?.l ?? ''

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Misc. Charges Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filterMonth && filterYear
              ? `${currentMonthLabel} ${filterYear} — ${count} charges`
              : `${count} total charges`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreateModal(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Charge
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Filter Period</p>
        <div className="flex flex-wrap gap-3">
          <select className="input w-44 bg-white" value={filterMonth}
            onChange={e => { setFilterMonth(e.target.value); setPage(1) }}>
            <option value="">All Months</option>
            {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select className="input w-32 bg-white" value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setPage(1) }}>
            <option value="">All Years</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input className="input flex-1 min-w-[200px]" placeholder="Search by student name or admission #..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          {hasFilters && <button className="btn-secondary" onClick={clearFilters}>Clear</button>}
        </div>
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
          <div className="py-16 text-center">
            <p className="text-gray-400 mb-3">No misc charges found for this period.</p>
            <button className="btn-primary" onClick={() => setCreateModal(true)}>Add First Charge</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="table-th">Student</th>
                  <th className="table-th">Admission #</th>
                  <th className="table-th">Class</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Month/Year</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Remarks</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="table-td font-medium">{r.student_name}</td>
                    <td className="table-td text-xs text-gray-500">#{r.admission_no}</td>
                    <td className="table-td text-sm">{r.current_class}</td>
                    <td className="table-td">
                      <Badge value={r.category_name || r.category} />
                    </td>
                    <td className="table-td font-mono text-sm">Rs {Number(r.amount).toLocaleString()}</td>
                    <td className="table-td text-xs">
                      {MONTHS.find(m => m.v === r.month)?.l ?? r.month} {r.year}
                    </td>
                    <td className="table-td text-xs text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td className="table-td text-xs text-gray-500 max-w-[150px] truncate">{r.remarks || '—'}</td>
                    <td className="table-td">
                      <button
                        className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                        onClick={() => setDeleteConfirm(r)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 flex flex-wrap gap-6 text-sm">
            <span className="text-gray-500">
              Showing <strong className="text-gray-800 dark:text-gray-200">{data.length}</strong> of {count}
            </span>
            <span className="text-gray-500">
              Total: <strong className="text-gray-800 dark:text-gray-200">Rs {data.reduce((s, r) => s + Number(r.amount), 0).toLocaleString()}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-secondary">Previous</button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn-secondary">Next</button>
          </div>
        </div>
      )}

      {/* Add Charge Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Misc Charge" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Student <span className="text-red-500">*</span></label>
            <input className="input" placeholder="Type name or admission # to search..."
              value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
            {studentOptions.length > 0 && studentSearch && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-sm">
                {studentOptions.map(s => (
                  <button key={s.id} type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-between"
                    onClick={() => {
                      setCreateForm({ ...createForm, student: s.id })
                      setStudentSearch(`${s.student_name} (#${s.admission_no}) — ${s.current_class}`)
                      setStudentOptions([])
                    }}>
                    <span className="font-medium">{s.student_name}</span>
                    <span className="text-gray-400 text-xs">#{s.admission_no} - {s.current_class}</span>
                  </button>
                ))}
              </div>
            )}
            {createForm.student && <p className="text-xs text-green-600 mt-1">Student selected</p>}
          </div>

          <div>
            <label className="label">Category <span className="text-red-500">*</span></label>
            <select className="input" value={createForm.category}
              onChange={e => handleCategoryChange(e.target.value)} required>
              <option value="">Select category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Amount (Rs) <span className="text-red-500">*</span></label>
            <input className="input" type="number" min="0" step="any"
              value={createForm.amount}
              onChange={e => setCreateForm({ ...createForm, amount: e.target.value })}
              required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Month <span className="text-red-500">*</span></label>
              <select className="input" value={createForm.month}
                onChange={e => setCreateForm({ ...createForm, month: Number(e.target.value) })} required>
                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year <span className="text-red-500">*</span></label>
              <select className="input" value={createForm.year}
                onChange={e => setCreateForm({ ...createForm, year: Number(e.target.value) })} required>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={3} placeholder="Optional remarks..."
              value={createForm.remarks}
              onChange={e => setCreateForm({ ...createForm, remarks: e.target.value })} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" disabled={creating || !createForm.student || !createForm.category} className="btn-primary">
              {creating ? 'Creating...' : 'Add Charge'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Misc Charge" size="sm">
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-sm space-y-1">
              <p className="text-red-700 dark:text-red-400 font-semibold">Are you sure you want to delete this charge?</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                <span className="text-gray-500">Student:</span> <strong>{deleteConfirm.student_name}</strong>
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="text-gray-500">Category:</span> <strong>{deleteConfirm.category_name || deleteConfirm.category}</strong>
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="text-gray-500">Amount:</span> Rs {Number(deleteConfirm.amount).toLocaleString()}
              </p>
              <p className="text-xs text-red-500 mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                onClick={handleDelete} disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Charge'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
