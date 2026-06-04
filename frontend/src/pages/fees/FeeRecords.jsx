import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getFeeRecords, createFeeRecord, recordPayment,
  editFeeRecord, deleteFeeRecord,
  downloadStudentInvoicePdf, downloadClassInvoicePdf,
  getClassRooms, advancePayment,
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
const STATUSES = ['unpaid', 'partial', 'paid', 'advance', 'waived']
const NOW = new Date()

const EMPTY_CREATE = {
  student: '', month: NOW.getMonth() + 1, year: NOW.getFullYear(),
  amount_paid: 0, due_date: '',
  previous_balance: '', current_fee: '',
}

export default function FeeRecords() {
  const yearOptions = useYears()
  const [sp] = useSearchParams()

  const [data, setData]       = useState([])
  const [count, setCount]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const PAGE_SIZE = 25

  const [classOptions, setClassOptions] = useState([])

  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState(sp.get('status') || '')
  const [filterMonth, setFilterMonth]   = useState(sp.get('month') || String(NOW.getMonth() + 1))
  const [filterYear, setFilterYear]     = useState(sp.get('year') || String(NOW.getFullYear()))
  const [filterClass, setFilterClass]   = useState(sp.get('current_class') || '')
  const [filterStudent, setFilterStudent] = useState(sp.get('student') || '')

  const [createModal, setCreateModal]   = useState(false)
  const [createForm, setCreateForm]     = useState(EMPTY_CREATE)
  const [creating, setCreating]         = useState(false)
  const [studentOptions, setStudentOptions] = useState([])
  const [studentSearch, setStudentSearch]   = useState('')

  const [payModal, setPayModal]   = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying]       = useState(false)

  const [pdfLoading, setPdfLoading] = useState(null)

  const [editModal, setEditModal]     = useState(null)
  const [editForm, setEditForm]       = useState({})
  const [editing, setEditing]         = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting]       = useState(false)

  const [advModal, setAdvModal]               = useState(false)
  const [advStudentSearch, setAdvStudentSearch] = useState('')
  const [advStudentOptions, setAdvStudentOptions] = useState([])
  const [advSelected, setAdvSelected]         = useState([])
  const [advMonths, setAdvMonths]             = useState([])
  const [advYear, setAdvYear]                 = useState(String(NOW.getFullYear()))
  const [advAmount, setAdvAmount]             = useState('')
  const [advRemarks, setAdvRemarks]           = useState('')
  const [advLoading, setAdvLoading]           = useState(false)

  useEffect(() => {
    getClassRooms()
      .then(({ data: res }) => setClassOptions((res.results ?? res).map(c => c.name)))
      .catch(() => {})
  }, [])

  const buildParams = useCallback(() => {
    const p = { page, page_size: PAGE_SIZE }
    if (search)        p.search        = search
    if (filterStatus)  p.status        = filterStatus
    if (filterMonth)   p.month         = filterMonth
    if (filterYear)    p.year          = filterYear
    if (filterClass)   p.current_class = filterClass
    if (filterStudent && String(filterStudent).match(/^\d+$/)) p.student = filterStudent
    return p
  }, [page, search, filterStatus, filterMonth, filterYear, filterClass, filterStudent])

  const load = useCallback(() => {
    setLoading(true)
    getFeeRecords(buildParams())
      .then(({ data: res }) => {
        setData(res.results ?? res)
        setCount(res.count ?? (res.results ?? res).length)
      })
      .catch(() => toast.error('Failed to load records'))
      .finally(() => setLoading(false))
  }, [buildParams])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (studentSearch.length < 2) { setStudentOptions([]); return }
    getStudents({ search: studentSearch, page_size: 10 })
      .then(({ data: res }) => setStudentOptions(res.results ?? res))
      .catch(() => {})
  }, [studentSearch])

  useEffect(() => {
    if (advStudentSearch.length < 2) { setAdvStudentOptions([]); return }
    getStudents({ search: advStudentSearch, page_size: 15 })
      .then(({ data: res }) => setAdvStudentOptions(res.results ?? res))
      .catch(() => {})
  }, [advStudentSearch])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload = { ...createForm }
      if (!payload.previous_balance) delete payload.previous_balance
      if (!payload.current_fee)      delete payload.current_fee
      if (!payload.due_date)         delete payload.due_date
      await createFeeRecord(payload)
      toast.success('Fee record created')
      setCreateModal(false)
      setCreateForm(EMPTY_CREATE)
      setStudentSearch('')
      load()
    } catch (err) {
      const d = err.response?.data
      const msg = d?.non_field_errors?.[0] || d?.detail
        || (typeof d === 'object' ? Object.values(d).flat()[0] : null) || 'Failed'
      toast.error(Array.isArray(msg) ? msg[0] : String(msg))
    } finally {
      setCreating(false)
    }
  }

  const handlePayment = async (e) => {
    e.preventDefault()
    setPaying(true)
    try {
      await recordPayment(payModal.id, { amount_paid: payAmount })
      toast.success('Payment recorded')
      setPayModal(null)
      setPayAmount('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.amount_paid?.[0] || 'Failed to record payment')
    } finally {
      setPaying(false)
    }
  }

  const handleDownloadPdf = async (id, receiptNo) => {
    setPdfLoading(id)
    try {
      const { data: blob } = await downloadStudentInvoicePdf(id)
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice_${receiptNo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  const handleDownloadClassPdf = async () => {
    if (!filterMonth || !filterYear || !filterClass) return
    setPdfLoading('class')
    try {
      const { data: blob } = await downloadClassInvoicePdf({
        current_class: filterClass, month: filterMonth, year: filterYear,
      })
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Fee_Collection_${filterClass}_${filterMonth}_${filterYear}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  const openEditModal = (record) => {
    setEditForm({
      previous_balance: record.previous_balance ?? '',
      current_fee: record.current_fee ?? '',
      amount_paid: record.amount_paid ?? '',
      status: record.status ?? 'unpaid',
      due_date: record.due_date ?? '',
      payment_date: record.payment_date ?? '',
      remarks: record.remarks ?? '',
    })
    setEditModal(record)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditing(true)
    try {
      const payload = { ...editForm }
      if (!payload.due_date) payload.due_date = null
      if (!payload.payment_date) payload.payment_date = null
      await editFeeRecord(editModal.id, payload)
      toast.success('Record updated')
      setEditModal(null)
      load()
    } catch (err) {
      const d = err.response?.data
      const msg = d?.non_field_errors?.[0] || d?.detail
        || (typeof d === 'object' ? Object.values(d).flat()[0] : null) || 'Update failed'
      toast.error(Array.isArray(msg) ? msg[0] : String(msg))
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await deleteFeeRecord(deleteConfirm.id)
      toast.success('Record deleted')
      setDeleteConfirm(null)
      load()
    } catch {
      toast.error('Failed to delete record')
    } finally {
      setDeleting(false)
    }
  }

  const toggleAdvMonth = (m) => {
    setAdvMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b))
  }

  const addAdvStudent = (s) => {
    if (!advSelected.find(x => x.id === s.id)) {
      setAdvSelected(prev => [...prev, s])
    }
    setAdvStudentSearch('')
    setAdvStudentOptions([])
  }

  const removeAdvStudent = (id) => {
    setAdvSelected(prev => prev.filter(x => x.id !== id))
  }

  const handleAdvancePayment = async (e) => {
    e.preventDefault()
    if (!advSelected.length || !advMonths.length) {
      toast.error('Select at least one student and one month')
      return
    }
    setAdvLoading(true)
    try {
      const payload = {
        student_ids: advSelected.map(s => s.id),
        months: advMonths,
        year: Number(advYear),
      }
      if (advAmount) payload.amount_paid = Number(advAmount)
      if (advRemarks) payload.remarks = advRemarks
      const { data: res } = await advancePayment(payload)
      toast.success(`Advance payment recorded — ${res.created} records created${res.skipped ? `, ${res.skipped} skipped` : ''}`)
      if (res.errors?.length) {
        res.errors.forEach(err => toast.error(err))
      }
      setAdvModal(false)
      setAdvSelected([])
      setAdvMonths([])
      setAdvAmount('')
      setAdvRemarks('')
      load()
    } catch (err) {
      const d = err.response?.data
      const msg = d?.detail || d?.non_field_errors?.[0]
        || (typeof d === 'object' ? Object.values(d).flat()[0] : null) || 'Failed'
      toast.error(Array.isArray(msg) ? msg[0] : String(msg))
    } finally {
      setAdvLoading(false)
    }
  }

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterMonth(''); setFilterYear('')
    setFilterClass(''); setFilterStudent('')
    setPage(1)
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)
  const hasFilters = search || filterStatus || filterClass || filterStudent
  const currentMonthLabel = MONTHS.find(m => m.v === Number(filterMonth))?.l ?? ''

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fee Records</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filterMonth && filterYear
              ? `${currentMonthLabel} ${filterYear} — ${count} records`
              : `${count} total records`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterMonth && filterYear && filterClass && (
            <>
              <button
                className="btn-secondary disabled:opacity-50"
                onClick={handleDownloadClassPdf}
                disabled={pdfLoading === 'class'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {pdfLoading === 'class' ? 'Downloading...' : 'Download Class PDF'}
              </button>
              <Link
                to={`/fees/invoice/class?class=${encodeURIComponent(filterClass)}&month=${filterMonth}&year=${filterYear}`}
                target="_blank"
                className="btn-secondary"
              >
                Print Class Sheet
              </Link>
            </>
          )}
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-2" onClick={() => setAdvModal(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Advance Payment
          </button>
          <button className="btn-primary" onClick={() => setCreateModal(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Record
          </button>
        </div>
      </div>

      {/* Period selector */}
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
          <select className="input w-52 bg-white" value={filterClass}
            onChange={e => { setFilterClass(e.target.value); setPage(1) }}>
            <option value="">All Classes</option>
            {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Extra filters */}
      <div className="flex flex-wrap gap-3">
        <input className="input flex-1 min-w-[200px]" placeholder="Search receipt, student name, admission #..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <select className="input w-36" value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        {hasFilters && <button className="btn-secondary" onClick={clearFilters}>Clear Filters</button>}
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
            <p className="text-gray-400 mb-3">No fee records found for this period.</p>
            <button className="btn-primary" onClick={() => setCreateModal(true)}>Create First Record</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px]">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="table-th">Receipt</th>
                  <th className="table-th">Student</th>
                  <th className="table-th">Class</th>
                  <th className="table-th">Period</th>
                  <th className="table-th">Prev Bal</th>
                  <th className="table-th">Fee</th>
                  <th className="table-th">Misc.</th>
                  <th className="table-th">Total</th>
                  <th className="table-th text-green-700">Paid</th>
                  <th className="table-th text-red-600">Balance</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.map(r => {
                  const isDefaulter = r.status === 'unpaid' || r.status === 'partial'
                  const isAdvance = r.status === 'advance' || r.is_advance
                  return (
                  <tr key={r.id} className={
                    isDefaulter
                      ? 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/80 dark:hover:bg-red-950/30 border-l-4 border-l-red-400'
                      : isAdvance
                        ? 'bg-purple-50/60 dark:bg-purple-950/20 hover:bg-purple-100/80 dark:hover:bg-purple-950/30 border-l-4 border-l-purple-400'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }>
                    <td className="table-td font-mono text-xs text-blue-700">{r.receipt_no}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        {isDefaulter && (
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" title="Defaulter" />
                        )}
                        <div>
                          <Link to={`/students/${r.student}`} className="font-medium hover:text-blue-600 block leading-tight">
                            {r.student_name}
                          </Link>
                          <span className="text-xs text-gray-400">#{r.admission_no}</span>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-sm">{r.current_class}</td>
                    <td className="table-td text-xs">{r.month_name} {r.year}</td>
                    <td className="table-td font-mono text-xs">
                      {Number(r.previous_balance) > 0
                        ? <span className="text-amber-600">Rs {Number(r.previous_balance).toLocaleString()}</span>
                        : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="table-td font-mono text-xs">Rs {Number(r.current_fee).toLocaleString()}</td>
                    <td className="table-td font-mono text-xs">
                      {Number(r.misc_charges) > 0
                        ? <span className="text-orange-600">Rs {Number(r.misc_charges).toLocaleString()}</span>
                        : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="table-td font-mono text-xs font-medium">Rs {Number(r.total_amount).toLocaleString()}</td>
                    <td className="table-td font-mono text-xs text-green-700">Rs {Number(r.amount_paid).toLocaleString()}</td>
                    <td className="table-td font-mono text-xs">
                      {Number(r.balance) > 0
                        ? <span className="text-red-600 font-bold">Rs {Number(r.balance).toLocaleString()}</span>
                        : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="table-td"><Badge value={r.status} /></td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 flex-wrap">
                        {r.status !== 'paid' && r.status !== 'waived' && (
                          <button className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                            onClick={() => { setPayModal(r); setPayAmount('') }}>
                            Pay
                          </button>
                        )}
                        <button className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded hover:bg-amber-100"
                          onClick={() => openEditModal(r)} title="Edit record">
                          Edit
                        </button>
                        <button className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100"
                          onClick={() => setDeleteConfirm(r)} title="Delete record">
                          Del
                        </button>
                        <button
                          className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 disabled:opacity-50"
                          onClick={() => handleDownloadPdf(r.id, r.receipt_no)}
                          disabled={pdfLoading === r.id}
                          title="Download PDF Invoice"
                        >
                          {pdfLoading === r.id ? '...' : 'PDF'}
                        </button>
                        <Link to={`/fees/invoice/${r.id}`} target="_blank"
                          className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded hover:bg-gray-100" title="Print">
                          Print
                        </Link>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 flex flex-wrap gap-6 text-sm">
            <span className="text-gray-500">
              Showing <strong className="text-gray-800">{data.length}</strong> of {count}
            </span>
            <span className="text-gray-500">
              Total Due: <strong className="text-gray-800">Rs {data.reduce((s, r) => s + Number(r.total_amount), 0).toLocaleString()}</strong>
            </span>
            <span className="text-green-700">
              Collected: <strong>Rs {data.reduce((s, r) => s + Number(r.amount_paid), 0).toLocaleString()}</strong>
            </span>
            <span className="text-red-600">
              Balance: <strong>Rs {data.reduce((s, r) => s + Number(r.balance), 0).toLocaleString()}</strong>
            </span>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-secondary">Previous</button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn-secondary">Next</button>
          </div>
        </div>
      )}

      {/* Create modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New Fee Record" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Student <span className="text-red-500">*</span></label>
            <input className="input" placeholder="Type name or admission # to search..."
              value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
            {studentOptions.length > 0 && studentSearch && (
              <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-sm">
                {studentOptions.map(s => (
                  <button key={s.id} type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
                    onClick={() => {
                      setCreateForm({ ...createForm, student: s.id })
                      setStudentSearch(`${s.student_name} (#${s.admission_no}) — ${s.current_class}`)
                      setStudentOptions([])
                    }}>
                    <span className="font-medium">{s.student_name}</span>
                    <span className="text-gray-400 text-xs">
                      #{s.admission_no} - {s.current_class}
                      {s.current_fee ? ` - Rs ${Number(s.current_fee).toLocaleString()}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {createForm.student && <p className="text-xs text-green-600 mt-1">Student selected</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Month <span className="text-red-500">*</span></label>
              <select className="input" value={createForm.month}
                onChange={e => setCreateForm({ ...createForm, month: e.target.value })} required>
                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year <span className="text-red-500">*</span></label>
              <input className="input" type="number" min="2020" max="2099"
                value={createForm.year} onChange={e => setCreateForm({ ...createForm, year: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Previous Balance (Rs)</label>
              <input className="input" type="number" min="0" placeholder="Auto from arrears"
                value={createForm.previous_balance}
                onChange={e => setCreateForm({ ...createForm, previous_balance: e.target.value })} />
            </div>
            <div>
              <label className="label">Current Fee (Rs)</label>
              <input className="input" type="number" min="0" placeholder="Auto from student/class"
                value={createForm.current_fee}
                onChange={e => setCreateForm({ ...createForm, current_fee: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount Paid Now (Rs)</label>
              <input className="input" type="number" min="0"
                value={createForm.amount_paid}
                onChange={e => setCreateForm({ ...createForm, amount_paid: e.target.value })} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="date" value={createForm.due_date}
                onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" disabled={creating || !createForm.student} className="btn-primary">
              {creating ? 'Creating...' : 'Create Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Record Payment" size="sm">
        {payModal && (
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-sm space-y-1">
              <p><span className="text-gray-500">Receipt:</span> <strong>{payModal.receipt_no}</strong></p>
              <p><span className="text-gray-500">Student:</span> <strong>{payModal.student_name}</strong></p>
              <p><span className="text-gray-500">Period:</span> {payModal.month_name} {payModal.year}</p>
              <p><span className="text-gray-500">Total Due:</span> Rs {Number(payModal.total_amount).toLocaleString()}</p>
              <p><span className="text-gray-500">Already Paid:</span> Rs {Number(payModal.amount_paid).toLocaleString()}</p>
              <p className="font-semibold">
                <span className="text-gray-500">Balance:</span>{' '}
                <span className="text-red-600">Rs {Number(payModal.balance).toLocaleString()}</span>
              </p>
            </div>
            <div>
              <label className="label">Amount to Record (Rs) <span className="text-red-500">*</span></label>
              <input className="input" type="number" min="1"
                placeholder={`Max Rs ${Number(payModal.balance).toLocaleString()}`}
                value={payAmount} onChange={e => setPayAmount(e.target.value)} required autoFocus />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button type="submit" disabled={paying} className="btn-success">
                {paying ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit record modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Fee Record" size="md">
        {editModal && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-gray-500">Receipt:</span> <strong>{editModal.receipt_no}</strong></p>
              <p><span className="text-gray-500">Student:</span> <strong>{editModal.student_name}</strong> (#{editModal.admission_no})</p>
              <p><span className="text-gray-500">Period:</span> {editModal.month_name} {editModal.year}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Previous Balance (Rs)</label>
                <input className="input" type="number" min="0"
                  value={editForm.previous_balance}
                  onChange={e => setEditForm({ ...editForm, previous_balance: e.target.value })} />
              </div>
              <div>
                <label className="label">Current Fee (Rs)</label>
                <input className="input" type="number" min="0"
                  value={editForm.current_fee}
                  onChange={e => setEditForm({ ...editForm, current_fee: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Amount Paid (Rs)</label>
                <input className="input" type="number" min="0"
                  value={editForm.amount_paid}
                  onChange={e => setEditForm({ ...editForm, amount_paid: e.target.value })} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Due Date</label>
                <input className="input" type="date" value={editForm.due_date || ''}
                  onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Payment Date</label>
                <input className="input" type="date" value={editForm.payment_date || ''}
                  onChange={e => setEditForm({ ...editForm, payment_date: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">Remarks</label>
              <textarea className="input" rows={2} value={editForm.remarks}
                onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              Total and balance will be auto-calculated. If you set status to "Waived", the balance becomes 0.
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button type="submit" disabled={editing} className="btn-primary">
                {editing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Fee Record" size="sm">
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg p-4 text-sm space-y-1">
              <p className="text-red-700 font-semibold">Are you sure you want to delete this record?</p>
              <p className="text-gray-600 mt-2">
                <span className="text-gray-500">Receipt:</span> <strong>{deleteConfirm.receipt_no}</strong>
              </p>
              <p className="text-gray-600">
                <span className="text-gray-500">Student:</span> <strong>{deleteConfirm.student_name}</strong>
              </p>
              <p className="text-gray-600">
                <span className="text-gray-500">Period:</span> {deleteConfirm.month_name} {deleteConfirm.year}
              </p>
              <p className="text-gray-600">
                <span className="text-gray-500">Amount:</span> Rs {Number(deleteConfirm.total_amount).toLocaleString()}
              </p>
              <p className="text-xs text-red-500 mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                onClick={handleDelete} disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Advance Payment modal */}
      <Modal open={advModal} onClose={() => setAdvModal(false)} title="Advance Fee Payment" size="lg">
        <form onSubmit={handleAdvancePayment} className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-sm text-purple-800 dark:text-purple-300">
            Record advance fee payment for one or more students across multiple months. Fee records will be created for each selected month marked as &quot;Paid in Advance&quot;.
          </div>

          {/* Student search */}
          <div>
            <label className="label">Select Students <span className="text-red-500">*</span></label>
            <input className="input" placeholder="Search by name or admission #..."
              value={advStudentSearch} onChange={e => setAdvStudentSearch(e.target.value)} />
            {advStudentOptions.length > 0 && advStudentSearch && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-sm">
                {advStudentOptions.map(s => (
                  <button key={s.id} type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center justify-between"
                    onClick={() => addAdvStudent(s)}>
                    <span className="font-medium">{s.student_name}</span>
                    <span className="text-gray-400 text-xs">#{s.admission_no} - {s.current_class}
                      {s.current_fee ? ` - Rs ${Number(s.current_fee).toLocaleString()}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {advSelected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {advSelected.map(s => (
                <span key={s.id} className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 text-xs px-2.5 py-1.5 rounded-full">
                  {s.student_name} <span className="text-purple-400">#{s.admission_no}</span>
                  <button type="button" onClick={() => removeAdvStudent(s.id)}
                    className="ml-1 text-purple-400 hover:text-purple-700">&times;</button>
                </span>
              ))}
            </div>
          )}

          {/* Year */}
          <div>
            <label className="label">Year <span className="text-red-500">*</span></label>
            <select className="input w-36" value={advYear} onChange={e => setAdvYear(e.target.value)}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month grid */}
          <div>
            <label className="label">Select Months <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {MONTHS.map(m => {
                const sel = advMonths.includes(m.v)
                return (
                  <button key={m.v} type="button"
                    onClick={() => toggleAdvMonth(m.v)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      sel
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-400'
                    }`}>
                    {m.l.substring(0, 3)}
                  </button>
                )
              })}
            </div>
            {advMonths.length > 0 && (
              <p className="text-xs text-purple-600 mt-1">
                {advMonths.length} month(s) selected: {advMonths.map(m => MONTHS.find(x => x.v === m)?.l.substring(0, 3)).join(', ')}
              </p>
            )}
          </div>

          {/* Amount override */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fee Per Month (Rs)</label>
              <input className="input" type="number" min="0" placeholder="Auto from student/class fee"
                value={advAmount} onChange={e => setAdvAmount(e.target.value)} />
              <p className="text-xs text-gray-400 mt-0.5">Leave blank to use each student&apos;s fee</p>
            </div>
            <div>
              <label className="label">Remarks</label>
              <input className="input" placeholder="e.g. Advance payment for Jul-Sep"
                value={advRemarks} onChange={e => setAdvRemarks(e.target.value)} />
            </div>
          </div>

          {/* Summary */}
          {advSelected.length > 0 && advMonths.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300">Summary</p>
              <p className="text-gray-500">
                <strong>{advSelected.length}</strong> student(s) &times; <strong>{advMonths.length}</strong> month(s) = <strong>{advSelected.length * advMonths.length}</strong> records to create
              </p>
              {advAmount && (
                <p className="text-gray-500">
                  Total: <strong className="text-purple-700">Rs {(Number(advAmount) * advSelected.length * advMonths.length).toLocaleString()}</strong>
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAdvModal(false)}>Cancel</button>
            <button type="submit"
              disabled={advLoading || !advSelected.length || !advMonths.length}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50">
              {advLoading ? 'Processing...' : 'Record Advance Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
