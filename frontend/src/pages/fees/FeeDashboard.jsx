import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getClassRoomsWithFeeStats,
  bulkGenerateFeeRecords,
  getFeeSummary,
  downloadClassInvoicePdf,
  downloadBulkInvoicesPdf,
  getClassStudentsFee,
} from '../../api/feesApi'
import Modal from '../../components/Modal'
import StatCard from '../../components/StatCard'
import Badge from '../../components/Badge'
import useYears from '../../hooks/useYears'

const MONTHS = [
  { v: 1,  l: 'January'  }, { v: 2,  l: 'February' }, { v: 3,  l: 'March'     },
  { v: 4,  l: 'April'    }, { v: 5,  l: 'May'       }, { v: 6,  l: 'June'      },
  { v: 7,  l: 'July'     }, { v: 8,  l: 'August'    }, { v: 9,  l: 'September' },
  { v: 10, l: 'October'  }, { v: 11, l: 'November'  }, { v: 12, l: 'December'  },
]
const NOW = new Date()

export default function FeeDashboard() {
  const yearOptions = useYears()
  const [month, setMonth]     = useState(String(NOW.getMonth() + 1))
  const [year, setYear]       = useState(String(NOW.getFullYear()))
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)

  const [bulkModal, setBulkModal]     = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult]   = useState(null)

  const [pdfLoading, setPdfLoading] = useState(null)
  const [bulkPdfLoading, setBulkPdfLoading] = useState(null)

  // Expanded class detail state
  const [expanded, setExpanded]       = useState({})
  const [classDetail, setClassDetail] = useState({})
  const [detailLoading, setDetailLoading] = useState({})

  const load = useCallback(() => {
    setLoading(true)
    setExpanded({})
    setClassDetail({})
    const params = {}
    if (month) params.month = month
    if (year)  params.year  = year

    Promise.all([
      getClassRoomsWithFeeStats(params),
      getFeeSummary(month && year ? { month, year } : {}),
    ])
      .then(([classRes, sumRes]) => {
        setClasses(classRes.data)
        setSummary(sumRes.data)
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [month, year])

  useEffect(() => { load() }, [load])

  const toggleClassDetail = async (classObj) => {
    const key = classObj.id
    if (expanded[key]) {
      setExpanded(prev => ({ ...prev, [key]: false }))
      return
    }
    setExpanded(prev => ({ ...prev, [key]: true }))

    if (classDetail[key]) return

    setDetailLoading(prev => ({ ...prev, [key]: true }))
    try {
      const params = {}
      if (month) params.month = month
      if (year)  params.year  = year
      const { data } = await getClassStudentsFee(classObj.id, params)
      setClassDetail(prev => ({ ...prev, [key]: data }))
    } catch {
      toast.error(`Failed to load students for ${classObj.name}`)
    } finally {
      setDetailLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleBulkGenerate = async () => {
    if (!bulkModal) return
    setBulkLoading(true)
    setBulkResult(null)
    try {
      const { data } = await bulkGenerateFeeRecords({
        current_class: bulkModal,
        month: Number(month),
        year:  Number(year),
      })
      setBulkResult(data)
      toast.success(`Created ${data.created} fee records`)
      setClassDetail({})
      load()
    } catch (err) {
      const msg = err.response?.data?.detail
        || err.response?.data?.non_field_errors?.[0]
        || (typeof err.response?.data === 'object' ? Object.values(err.response.data).flat()[0] : null)
        || 'Bulk generation failed'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDownloadClassPdf = async (className) => {
    if (!month || !year) { toast.error('Select month and year first'); return }
    setPdfLoading(className)
    try {
      const { data } = await downloadClassInvoicePdf({ current_class: className, month, year })
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Fee_Collection_${className}_${month}_${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  const handleDownloadBulkInvoices = async (className) => {
    if (!month || !year) { toast.error('Select month and year first'); return }
    setBulkPdfLoading(className)
    try {
      const { data } = await downloadBulkInvoicesPdf({ current_class: className, month, year })
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Bulk_Invoices_${className}_${month}_${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Bulk invoices PDF downloaded')
    } catch {
      toast.error('Failed to generate bulk invoices. Make sure fee records exist.')
    } finally {
      setBulkPdfLoading(null)
    }
  }

  const monthLabel = MONTHS.find(m => m.v === Number(month))?.l ?? ''

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fee Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Class-wise fee overview — click a class to see individual students</p>
        </div>
        <div className="flex gap-2">
          <Link to="/fees/records" className="btn-secondary">View All Records</Link>
          <Link to="/fees/structures" className="btn-secondary">Fee Structures</Link>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card p-4 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-3">Select Period</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-blue-800">Month</label>
            <select className="input w-44 bg-white" value={month} onChange={e => setMonth(e.target.value)}>
              <option value="">All Months</option>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-blue-800">Year</label>
            <select className="input w-32 bg-white" value={year} onChange={e => setYear(e.target.value)}>
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overall Summary Stats */}
      {summary && (() => {
        const collRate = summary.total_due > 0
          ? Math.round((summary.total_collected / summary.total_due) * 100) : 0
        const totalStudents = classes.reduce((s, c) => s + c.student_count, 0)
        const avgFeePerStudent = summary.total_records > 0
          ? Math.round(summary.total_due / summary.total_records) : 0

        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Total Records"
                value={summary.total_records}
                sub={month && year ? `${monthLabel} ${year}` : 'All time'}
                color="blue"
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              />
              <StatCard
                title="Total Due"
                value={`Rs ${Number(summary.total_due || 0).toLocaleString()}`}
                sub="Total amount billed"
                color="purple"
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              />
              <StatCard
                title="Collected"
                value={`Rs ${Number(summary.total_collected || 0).toLocaleString()}`}
                sub={`${summary.paid_count ?? 0} fully paid`}
                color="green"
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <StatCard
                title="Outstanding"
                value={`Rs ${Number(summary.total_balance || 0).toLocaleString()}`}
                sub={`${summary.unpaid_count ?? 0} unpaid, ${summary.partial_count ?? 0} partial`}
                color="red"
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
              />
            </div>

            {/* Analytics row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Collection Rate */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Collection Rate</h3>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={collRate >= 80 ? '#16a34a' : collRate >= 50 ? '#d97706' : '#dc2626'}
                        strokeWidth="3"
                        strokeDasharray={`${collRate}, 100`}
                        strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-800">
                      {collRate}%
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-500">
                      Collected <strong className="text-green-700">Rs {Number(summary.total_collected || 0).toLocaleString()}</strong>
                    </p>
                    <p className="text-gray-500">
                      out of <strong className="text-gray-800">Rs {Number(summary.total_due || 0).toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Status Distribution</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Paid', count: summary.paid_count || 0, color: 'bg-green-500', textColor: 'text-green-700' },
                    { label: 'Partial', count: summary.partial_count || 0, color: 'bg-amber-500', textColor: 'text-amber-700' },
                    { label: 'Unpaid', count: summary.unpaid_count || 0, color: 'bg-red-500', textColor: 'text-red-700' },
                  ].map(item => {
                    const pct = summary.total_records > 0 ? Math.round((item.count / summary.total_records) * 100) : 0
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`font-medium ${item.textColor}`}>{item.label}</span>
                          <span className="text-gray-500">{item.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${item.color} h-2 rounded-full transition-all`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quick Insights */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Insights</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Students</span>
                    <strong className="text-gray-800">{totalStudents}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Records Generated</span>
                    <strong className="text-gray-800">{summary.total_records} / {totalStudents}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg Fee/Student</span>
                    <strong className="text-gray-800">Rs {avgFeePerStudent.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Defaulters</span>
                    <strong className="text-red-600">{(summary.unpaid_count || 0) + (summary.partial_count || 0)}</strong>
                  </div>
                  <Link to="/balance-sheet" className="block text-center mt-2 text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 font-medium">
                    View Full Balance Sheet
                  </Link>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* Class-wise accordion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
            Class-wise Overview {month && year ? `— ${monthLabel} ${year}` : ''}
          </h2>
          <span className="text-sm text-gray-400">{classes.length} classes</span>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-20">
            <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : classes.length === 0 ? (
          <div className="card py-16 text-center text-gray-400">No classes found. Go to Classes page to add or sync classes.</div>
        ) : (
          <>
            {classes.map(c => {
              const fs = c.fee_stats || {}
              const hasStats = month && year && fs.records_count !== undefined
              const collectionRate = hasStats && fs.total_due > 0
                ? Math.round((fs.total_collected / fs.total_due) * 100) : null
              const isExpanded = expanded[c.id]
              const detail = classDetail[c.id]
              const isDetailLoading = detailLoading[c.id]

              return (
                <div key={c.id} className="card overflow-hidden">
                  {/* Class summary row — clickable */}
                  <button
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleClassDetail(c)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                      {/* Class name + icon */}
                      <div className="flex items-center gap-3 lg:w-48 flex-shrink-0">
                        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {c.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.student_count} students</p>
                        </div>
                      </div>

                      {/* Stats chips */}
                      {hasStats ? (
                        <div className="flex flex-wrap gap-x-5 gap-y-1 flex-1 text-sm">
                          <span className="text-gray-500">
                            Records: <strong className={fs.records_count < c.student_count ? 'text-amber-600' : 'text-gray-800'}>
                              {fs.records_count}{fs.records_count < c.student_count && <span className="text-xs text-amber-500">/{c.student_count}</span>}
                            </strong>
                          </span>
                          <span className="text-gray-500">
                            Due: <strong className="text-gray-800 font-mono">Rs {Number(fs.total_due).toLocaleString()}</strong>
                          </span>
                          <span className="text-gray-500">
                            Collected: <strong className="text-green-700 font-mono">Rs {Number(fs.total_collected).toLocaleString()}</strong>
                            {collectionRate !== null && <span className="text-xs text-gray-400 ml-1">({collectionRate}%)</span>}
                          </span>
                          {fs.total_balance > 0 && (
                            <span className="text-gray-500">
                              Balance: <strong className="text-red-600 font-mono">Rs {Number(fs.total_balance).toLocaleString()}</strong>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Badge value="paid" label={String(fs.paid_count)} />
                            {fs.unpaid_count > 0 && <Badge value="unpaid" label={String(fs.unpaid_count)} />}
                            {fs.partial_count > 0 && <Badge value="partial" label={String(fs.partial_count)} />}
                          </span>
                        </div>
                      ) : (
                        <div className="flex-1 text-sm text-gray-400">Select month & year to see fee stats</div>
                      )}

                      {/* Expand arrow */}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded: actions + student table */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {/* Action buttons */}
                      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 flex flex-wrap gap-2 items-center border-b border-gray-100 dark:border-gray-700">
                        {month && year && (
                          <>
                            <button
                              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                              onClick={(e) => { e.stopPropagation(); setBulkModal(c.name); setBulkResult(null) }}
                            >
                              Generate Fee Records
                            </button>
                            <button
                              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              onClick={(e) => { e.stopPropagation(); handleDownloadClassPdf(c.name) }}
                              disabled={pdfLoading === c.name}
                            >
                              {pdfLoading === c.name ? 'Downloading...' : 'Collection Sheet PDF'}
                            </button>
                            <button
                              className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                              onClick={(e) => { e.stopPropagation(); handleDownloadBulkInvoices(c.name) }}
                              disabled={bulkPdfLoading === c.name}
                            >
                              {bulkPdfLoading === c.name ? 'Downloading...' : 'Bulk Invoices PDF'}
                            </button>
                          </>
                        )}
                        <Link
                          to={`/fees/records?current_class=${encodeURIComponent(c.name)}${month ? `&month=${month}` : ''}${year ? `&year=${year}` : ''}`}
                          className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Fee Records
                        </Link>
                      </div>

                      {/* Student-level fee table */}
                      {isDetailLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span className="ml-2 text-sm text-gray-500">Loading students...</span>
                        </div>
                      ) : detail ? (
                        <>
                          {/* Class summary bar */}
                          <div className="px-5 py-2 bg-blue-50 dark:bg-blue-950/30 text-xs flex flex-wrap gap-x-5 gap-y-1">
                            <span className="text-blue-700">
                              <strong>{detail.total_students}</strong> students
                            </span>
                            <span className="text-blue-700">
                              <strong>{detail.records_generated}</strong> with records
                            </span>
                            {detail.without_records > 0 && (
                              <span className="text-amber-600">
                                <strong>{detail.without_records}</strong> without records
                              </span>
                            )}
                            <span className="text-gray-600">
                              Due: <strong className="font-mono">Rs {Number(detail.summary.total_due).toLocaleString()}</strong>
                            </span>
                            <span className="text-green-700">
                              Collected: <strong className="font-mono">Rs {Number(detail.summary.total_collected).toLocaleString()}</strong>
                            </span>
                            {detail.summary.total_balance > 0 && (
                              <span className="text-red-600">
                                Balance: <strong className="font-mono">Rs {Number(detail.summary.total_balance).toLocaleString()}</strong>
                              </span>
                            )}
                          </div>

                          {detail.students.length === 0 ? (
                            <div className="px-5 py-8 text-center text-gray-400 text-sm">No students in this class</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[900px]">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                  <tr>
                                    <th className="table-th">Adm #</th>
                                    <th className="table-th">Student Name</th>
                                    <th className="table-th">Guardian</th>
                                    <th className="table-th">Contact</th>
                                    <th className="table-th text-right">Prev Bal</th>
                                    <th className="table-th text-right">Fee</th>
                                    <th className="table-th text-right">Total</th>
                                    <th className="table-th text-right text-green-700">Paid</th>
                                    <th className="table-th text-right text-red-600">Balance</th>
                                    <th className="table-th text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                  {detail.students.map(s => {
                                    const r = s.fee_record
                                    const isDefaulter = r && (r.status === 'unpaid' || r.status === 'partial')
                                    const isAdvance = r && (r.status === 'advance' || r.is_advance)
                                    return (
                                      <tr key={s.id} className={
                                        isDefaulter
                                          ? 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/80 dark:hover:bg-red-950/30 border-l-4 border-l-red-400'
                                          : isAdvance
                                            ? 'bg-purple-50/60 dark:bg-purple-950/20 hover:bg-purple-100/80 dark:hover:bg-purple-950/30 border-l-4 border-l-purple-400'
                                            : !r
                                              ? 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-100/50'
                                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                      }>
                                        <td className="table-td font-mono text-blue-700 text-xs">
                                          <Link to={`/students/${s.id}`} className="hover:underline">{s.admission_no}</Link>
                                        </td>
                                        <td className="table-td font-medium text-sm">
                                          <div className="flex items-center gap-1.5">
                                            {isDefaulter && (
                                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" title="Defaulter" />
                                            )}
                                            {isAdvance && (
                                              <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" title="Paid in Advance" />
                                            )}
                                            <Link to={`/students/${s.id}`} className="hover:text-blue-600">{s.student_name}</Link>
                                          </div>
                                        </td>
                                        <td className="table-td text-sm text-gray-600">{s.f_g_name}</td>
                                        <td className="table-td text-sm text-gray-600">{s.f_g_contact}</td>
                                        {r ? (
                                          <>
                                            <td className="table-td text-right font-mono text-xs">
                                              {r.previous_balance > 0
                                                ? <span className="text-amber-600">Rs {Number(r.previous_balance).toLocaleString()}</span>
                                                : <span className="text-gray-300">0</span>}
                                            </td>
                                            <td className="table-td text-right font-mono text-xs">Rs {Number(r.current_fee).toLocaleString()}</td>
                                            <td className="table-td text-right font-mono text-xs font-medium">Rs {Number(r.total_amount).toLocaleString()}</td>
                                            <td className="table-td text-right font-mono text-xs text-green-700">Rs {Number(r.amount_paid).toLocaleString()}</td>
                                            <td className="table-td text-right font-mono text-xs">
                                              {r.balance > 0
                                                ? <span className="text-red-600 font-bold">Rs {Number(r.balance).toLocaleString()}</span>
                                                : <span className="text-gray-400">0</span>}
                                            </td>
                                            <td className="table-td text-center"><Badge value={r.status} /></td>
                                          </>
                                        ) : (
                                          <td colSpan={6} className="table-td text-center text-xs text-amber-500 italic">
                                            No fee record for this period
                                          </td>
                                        )}
                                      </tr>
                                    )
                                  })}
                                </tbody>
                                {/* Totals footer */}
                                {detail.students.some(s => s.fee_record) && (
                                  <tfoot>
                                    <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold text-xs">
                                      <td className="table-td" colSpan={4}>Totals</td>
                                      <td className="table-td text-right font-mono">
                                        Rs {detail.students.reduce((s, st) => s + (st.fee_record?.previous_balance || 0), 0).toLocaleString()}
                                      </td>
                                      <td className="table-td text-right font-mono">
                                        Rs {detail.students.reduce((s, st) => s + (st.fee_record?.current_fee || 0), 0).toLocaleString()}
                                      </td>
                                      <td className="table-td text-right font-mono">
                                        Rs {Number(detail.summary.total_due).toLocaleString()}
                                      </td>
                                      <td className="table-td text-right font-mono text-green-700">
                                        Rs {Number(detail.summary.total_collected).toLocaleString()}
                                      </td>
                                      <td className="table-td text-right font-mono text-red-600">
                                        Rs {Number(detail.summary.total_balance).toLocaleString()}
                                      </td>
                                      <td className="table-td"></td>
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="px-5 py-8 text-center text-gray-400 text-sm">Click to load student details</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Grand totals */}
            {month && year && classes.length > 0 && (
              <div className="card p-4 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="font-bold text-blue-800 dark:text-blue-300">
                    Grand Totals ({classes.reduce((s, c) => s + c.student_count, 0)} students)
                  </span>
                  <span className="text-gray-600">
                    Records: <strong className="font-mono">{classes.reduce((s, c) => s + (c.fee_stats?.records_count ?? 0), 0)}</strong>
                  </span>
                  <span className="text-gray-600">
                    Due: <strong className="font-mono">Rs {classes.reduce((s, c) => s + (c.fee_stats?.total_due ?? 0), 0).toLocaleString()}</strong>
                  </span>
                  <span className="text-green-700">
                    Collected: <strong className="font-mono">Rs {classes.reduce((s, c) => s + (c.fee_stats?.total_collected ?? 0), 0).toLocaleString()}</strong>
                  </span>
                  <span className="text-red-600">
                    Balance: <strong className="font-mono">Rs {classes.reduce((s, c) => s + (c.fee_stats?.total_balance ?? 0), 0).toLocaleString()}</strong>
                  </span>
                  <span className="text-gray-600">
                    Paid: <strong>{classes.reduce((s, c) => s + (c.fee_stats?.paid_count ?? 0), 0)}</strong>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bulk generate modal ─────────────────── */}
      <Modal
        open={!!bulkModal}
        onClose={() => { setBulkModal(null); setBulkResult(null) }}
        title={`Bulk Generate — ${bulkModal}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 text-sm space-y-1">
            <p><span className="text-gray-500">Class:</span> <strong>{bulkModal}</strong></p>
            <p><span className="text-gray-500">Period:</span> <strong>{monthLabel} {year}</strong></p>
            <p className="text-xs text-gray-400 mt-2">
              This will create fee records for all active students in this class
              who don't already have a record for this month/year.
              Each student's fee will be auto-filled from their individual fee override
              or the class fee structure.
            </p>
          </div>

          {bulkResult && (
            <div className={`rounded-lg p-4 text-sm ${bulkResult.errors?.length ? 'bg-amber-50' : 'bg-green-50'}`}>
              <p className="font-semibold">
                {bulkResult.created} records created, {bulkResult.skipped} skipped (already existed)
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Total students in class: {bulkResult.total_students}
              </p>
              {bulkResult.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-amber-700 font-medium text-xs">Issues:</p>
                  <ul className="text-xs text-amber-600 mt-1 space-y-0.5">
                    {bulkResult.errors.map((e, i) => <li key={i}>- {e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              className="btn-secondary"
              onClick={() => { setBulkModal(null); setBulkResult(null) }}
            >
              {bulkResult ? 'Close' : 'Cancel'}
            </button>
            {!bulkResult && (
              <button
                className="btn-primary"
                onClick={handleBulkGenerate}
                disabled={bulkLoading}
              >
                {bulkLoading ? 'Generating...' : 'Generate Fee Records'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
