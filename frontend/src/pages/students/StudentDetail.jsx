import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getStudent, deleteStudent } from '../../api/studentsApi'
import { getStudentFeeHistory, downloadStudentInvoicePdf } from '../../api/feesApi'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

const STATUS_COLORS = {
  paid:      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  partial:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  unpaid:    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  advance:   'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  waived:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  no_record: 'bg-gray-50 text-gray-300 dark:bg-gray-800 dark:text-gray-600',
}

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent]     = useState(null)
  const [feeHistory, setFeeHistory] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [activeYear, setActiveYear] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(null)

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      toast.error('Invalid student ID')
      navigate('/students', { replace: true })
      return
    }
    Promise.all([
      getStudent(id),
      getStudentFeeHistory({ student: id }),
    ])
      .then(([sRes, fRes]) => {
        setStudent(sRes.data)
        setFeeHistory(fRes.data)
        if (fRes.data.years?.length) {
          setActiveYear(fRes.data.years[0].year)
        }
      })
      .catch(() => toast.error('Failed to load student'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleDelete = async () => {
    try {
      await deleteStudent(id)
      toast.success('Student deleted')
      navigate('/students')
    } catch {
      toast.error('Could not delete student')
    }
  }

  const handleDownloadPdf = async (recordId) => {
    setPdfLoading(recordId)
    try {
      const { data: blob } = await downloadStudentInvoicePdf(recordId)
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice_${recordId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  const fmt = (v) => `Rs ${Number(v || 0).toLocaleString()}`

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-6">
        <p className="text-red-600">Student not found.</p>
        <Link to="/students" className="btn-secondary mt-4">Back</Link>
      </div>
    )
  }

  const activeYearData = feeHistory?.years?.find(y => y.year === activeYear)

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <nav className="text-sm text-gray-400 mb-1">
            <Link to="/students" className="hover:text-blue-600">Students</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700 dark:text-gray-300">{student.student_name}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{student.student_name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Admission # {student.admission_no}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/students/${id}/edit`} className="btn-secondary">Edit</Link>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium" onClick={() => setShowDelete(true)}>Delete</button>
        </div>
      </div>

      {/* Student info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">Personal Information</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Full Name"        value={student.student_name} />
            <Field label="B-Form / CNIC"    value={student.b_form} />
            <Field label="Date of Birth"    value={student.dob} />
            <Field label="Religion"         value={student.religion} />
            <Field label="Tribe / Caste"    value={student.tribe_caste} />
            <Field label="Address"          value={student.address} />
            <Field label="Email"            value={student.email} />
          </dl>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">Guardian / Father</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Name"       value={student.f_g_name} />
              <Field label="CNIC"       value={student.f_g_cnic} />
              <Field label="Occupation" value={student.f_g_occupation} />
              <Field label="Contact"    value={student.f_g_contact} />
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">Academic</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Admission Class"    value={student.class_of_admission} />
              <Field label="Current Class"      value={student.current_class} />
              <Field label="Date of Admission"  value={student.date_of_admission} />
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</dt>
                <dd className="mt-1">
                  <Badge value={student.withdrawn} label={student.withdrawn === 'yes' ? 'Withdrawn' : 'Active'} />
                </dd>
              </div>
              {student.withdrawn === 'yes' && (
                <Field label="Class of Withdrawal" value={student.class_of_withdrawl} />
              )}
              <Field label="Monthly Fee"
                value={student.current_fee ? `Rs ${Number(student.current_fee).toLocaleString()}` : '— (class structure)'} />
              <Field label="Arrear Dues" value={Number(student.arrear_dues) > 0 ? `Rs ${Number(student.arrear_dues).toLocaleString()}` : '0'} />
            </dl>
            {student.remarks && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Remarks</dt>
                <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">{student.remarks}</dd>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lifetime Fee Summary ──────────────────────── */}
      {feeHistory?.lifetime && (
        <div className="card p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <h2 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">Lifetime Fee Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Records</p>
              <p className="text-xl font-bold text-blue-700">{feeHistory.lifetime.total_records}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Fee</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{fmt(feeHistory.lifetime.total_fee)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Paid</p>
              <p className="text-xl font-bold text-green-700">{fmt(feeHistory.lifetime.total_paid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Outstanding</p>
              <p className={`text-xl font-bold ${feeHistory.lifetime.total_balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {fmt(feeHistory.lifetime.total_balance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Year-by-Year Fee History ─────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">Fee History — Year by Year</h2>
            <p className="text-xs text-gray-400">Every month of every year is stored permanently in the database</p>
          </div>
          <Link to={`/fees/records?student=${id}`} className="text-sm text-blue-600 hover:underline">View All Records</Link>
        </div>

        {(!feeHistory?.years || feeHistory.years.length === 0) ? (
          <div className="px-5 py-16 text-center text-gray-400">No fee records found for this student</div>
        ) : (
          <>
            {/* Year tabs */}
            <div className="px-5 pt-4 flex flex-wrap gap-2">
              {feeHistory.years.map(yd => (
                <button
                  key={yd.year}
                  onClick={() => setActiveYear(yd.year)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeYear === yd.year
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {yd.year}
                  <span className="ml-1.5 text-xs opacity-75">({yd.records_count})</span>
                </button>
              ))}
            </div>

            {/* Year summary */}
            {activeYearData && (
              <div className="px-5 py-3">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="text-gray-500">
                    Year: <strong className="text-blue-700">{activeYearData.year}</strong>
                  </span>
                  <span className="text-gray-500">
                    Records: <strong className="text-gray-800 dark:text-gray-200">{activeYearData.records_count}/12</strong>
                  </span>
                  <span className="text-gray-500">
                    Fee: <strong className="text-gray-800 dark:text-gray-200">{fmt(activeYearData.total_fee)}</strong>
                  </span>
                  <span className="text-green-700">
                    Paid: <strong>{fmt(activeYearData.total_paid)}</strong>
                  </span>
                  {activeYearData.total_balance > 0 && (
                    <span className="text-red-600">
                      Balance: <strong>{fmt(activeYearData.total_balance)}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Month-by-month table */}
            {activeYearData && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="table-th">Month</th>
                      <th className="table-th text-center">Status</th>
                      <th className="table-th text-right">Prev Balance</th>
                      <th className="table-th text-right">Fee</th>
                      <th className="table-th text-right">Total Due</th>
                      <th className="table-th text-right text-green-700">Paid</th>
                      <th className="table-th text-right text-red-600">Balance</th>
                      <th className="table-th">Receipt</th>
                      <th className="table-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {activeYearData.months.map(m => {
                      const hasRecord = m.status !== 'no_record'
                      const isDefaulter = m.status === 'unpaid' || m.status === 'partial'
                      const isAdvance = m.status === 'advance'
                      return (
                        <tr key={m.month} className={
                          isDefaulter
                            ? 'bg-red-50/60 dark:bg-red-950/20 border-l-4 border-l-red-400'
                            : isAdvance
                              ? 'bg-purple-50/60 dark:bg-purple-950/20 border-l-4 border-l-purple-400'
                              : !hasRecord
                                ? 'bg-gray-50/50 dark:bg-gray-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }>
                          <td className="table-td font-medium text-gray-800 dark:text-gray-200">{m.month_name}</td>
                          <td className="table-td text-center">
                            <span className={`badge ${STATUS_COLORS[m.status] || STATUS_COLORS.no_record}`}>
                              {hasRecord ? m.status : '—'}
                            </span>
                          </td>
                          {hasRecord ? (
                            <>
                              <td className="table-td text-right font-mono text-xs">
                                {m.previous_balance > 0
                                  ? <span className="text-amber-600">{fmt(m.previous_balance)}</span>
                                  : <span className="text-gray-300">0</span>}
                              </td>
                              <td className="table-td text-right font-mono text-xs">{fmt(m.current_fee)}</td>
                              <td className="table-td text-right font-mono text-xs font-medium">{fmt(m.total_amount)}</td>
                              <td className="table-td text-right font-mono text-xs text-green-700">{fmt(m.amount_paid)}</td>
                              <td className="table-td text-right font-mono text-xs">
                                {m.balance > 0
                                  ? <span className="text-red-600 font-bold">{fmt(m.balance)}</span>
                                  : <span className="text-gray-400">0</span>}
                              </td>
                              <td className="table-td font-mono text-xs text-blue-600">{m.receipt_no}</td>
                              <td className="table-td text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded hover:bg-green-100 disabled:opacity-50"
                                    onClick={() => handleDownloadPdf(m.id)}
                                    disabled={pdfLoading === m.id}
                                  >
                                    {pdfLoading === m.id ? '...' : 'PDF'}
                                  </button>
                                  <Link
                                    to={`/fees/invoice/${m.id}`}
                                    target="_blank"
                                    className="text-xs bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-100"
                                  >
                                    Print
                                  </Link>
                                </div>
                              </td>
                            </>
                          ) : (
                            <td colSpan={7} className="table-td text-center text-xs text-gray-300 italic">
                              No record
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Year totals */}
                  <tfoot>
                    <tr className="bg-blue-50 dark:bg-blue-950/30 border-t-2 border-blue-200 dark:border-blue-800 font-bold text-xs">
                      <td className="table-td">TOTAL ({activeYearData.year})</td>
                      <td className="table-td text-center text-gray-500">{activeYearData.records_count} months</td>
                      <td className="table-td text-right font-mono">
                        {fmt(activeYearData.months.filter(m => m.status !== 'no_record').reduce((s, m) => s + (m.previous_balance || 0), 0))}
                      </td>
                      <td className="table-td text-right font-mono">{fmt(activeYearData.total_fee)}</td>
                      <td className="table-td text-right font-mono">
                        {fmt(activeYearData.months.filter(m => m.status !== 'no_record').reduce((s, m) => s + (m.total_amount || 0), 0))}
                      </td>
                      <td className="table-td text-right font-mono text-green-700">{fmt(activeYearData.total_paid)}</td>
                      <td className="table-td text-right font-mono text-red-600">{fmt(activeYearData.total_balance)}</td>
                      <td className="table-td" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete modal */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Student" size="sm">
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Permanently delete <strong>{student.student_name}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
