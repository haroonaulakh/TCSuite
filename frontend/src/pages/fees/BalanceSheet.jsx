import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  getBalanceSheet, downloadBalanceSheetPdf,
  getSavedBalanceSheets, downloadSavedBalanceSheetPdf,
} from '../../api/feesApi'
import useYears from '../../hooks/useYears'

const NOW = new Date()

export default function BalanceSheet() {
  const yearOptions = useYears()
  const [year, setYear]       = useState(String(NOW.getFullYear()))
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const [savedSheets, setSavedSheets] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedPdfLoading, setSavedPdfLoading] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getBalanceSheet({ year })
      .then(({ data: res }) => {
        setData(res)
        loadSavedSheets()
      })
      .catch(() => toast.error('Failed to load balance sheet'))
      .finally(() => setLoading(false))
  }, [year])

  useEffect(() => { load() }, [load])

  const loadSavedSheets = () => {
    setSavedLoading(true)
    getSavedBalanceSheets()
      .then(({ data: res }) => setSavedSheets(res.results ?? res))
      .catch(() => {})
      .finally(() => setSavedLoading(false))
  }

  useEffect(() => { loadSavedSheets() }, [])

  const [pdfLoading, setPdfLoading] = useState(false)

  const fmt = (v) => `Rs ${Number(v || 0).toLocaleString()}`

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      const { data: blob } = await downloadBalanceSheetPdf({ year })
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Balance_Sheet_${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Balance sheet PDF downloaded')
    } catch {
      toast.error('Failed to download balance sheet PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownloadSavedPdf = async (sheet) => {
    setSavedPdfLoading(sheet.id)
    try {
      const { data: blob } = await downloadSavedBalanceSheetPdf(sheet.id)
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Balance_Sheet_${sheet.year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Balance sheet for ${sheet.year} downloaded`)
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setSavedPdfLoading(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Balance Sheet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Comprehensive annual financial overview — auto-saved for each year</p>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="label">Year</label>
            <select className="input w-32" value={year} onChange={e => setYear(e.target.value)}>
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading || loading || !data}
            className="btn-primary h-10 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfLoading ? 'Downloading...' : 'Download PDF'}
          </button>
          <button onClick={() => window.print()} className="btn-secondary h-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : !data ? (
        <div className="card py-16 text-center text-gray-400">No data available for {year}</div>
      ) : (
        <>
          {/* Yearly summary */}
          {data.yearly_summary && (() => {
            const ys = data.yearly_summary
            return (
              <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                <h2 className="font-semibold text-blue-800 dark:text-blue-300 mb-4 text-lg">Annual Summary — {year}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Students', value: ys.total_students, color: 'text-blue-700' },
                    { label: 'Records', value: ys.total_records, color: 'text-blue-700' },
                    { label: 'Total Fee', value: fmt(ys.total_fee), color: 'text-gray-800' },
                    { label: 'Total Due', value: fmt(ys.total_due), color: 'text-purple-700' },
                    { label: 'Collected', value: fmt(ys.total_collected), color: 'text-green-700' },
                    { label: 'Outstanding', value: fmt(ys.total_balance), color: 'text-red-600' },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                      <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{ width: `${ys.collection_rate}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-green-700">{ys.collection_rate}% collected</span>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span>Paid: <strong className="text-green-700">{ys.paid}</strong></span>
                  <span>Partial: <strong className="text-amber-600">{ys.partial}</strong></span>
                  <span>Unpaid: <strong className="text-red-600">{ys.unpaid}</strong></span>
                  <span>Arrears Carried: <strong className="text-gray-700">{fmt(ys.total_prev_balance)}</strong></span>
                </div>
              </div>
            )
          })()}

          {/* Monthly breakdown */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">Month-by-Month Breakdown</h2>
            </div>
            {data.monthly && data.monthly.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="table-th">Month</th>
                      <th className="table-th text-right">Records</th>
                      <th className="table-th text-right">Monthly Fee</th>
                      <th className="table-th text-right">Prev Balance</th>
                      <th className="table-th text-right">Total Due</th>
                      <th className="table-th text-right text-green-700">Collected</th>
                      <th className="table-th text-right text-red-600">Outstanding</th>
                      <th className="table-th text-center">Collection %</th>
                      <th className="table-th text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {data.monthly.map(m => {
                      const rate = m.total_due > 0 ? Math.round((m.total_collected / m.total_due) * 100) : 0
                      return (
                        <tr key={m.month} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="table-td font-medium text-gray-800 dark:text-gray-200">{m.month_name}</td>
                          <td className="table-td text-right font-mono text-sm">{m.records}</td>
                          <td className="table-td text-right font-mono text-sm">{fmt(m.total_fee)}</td>
                          <td className="table-td text-right font-mono text-sm">
                            {m.prev_balance > 0
                              ? <span className="text-amber-600">{fmt(m.prev_balance)}</span>
                              : <span className="text-gray-300">0</span>}
                          </td>
                          <td className="table-td text-right font-mono text-sm font-medium">{fmt(m.total_due)}</td>
                          <td className="table-td text-right font-mono text-sm text-green-700">{fmt(m.total_collected)}</td>
                          <td className="table-td text-right font-mono text-sm">
                            {m.total_balance > 0
                              ? <span className="text-red-600 font-medium">{fmt(m.total_balance)}</span>
                              : <span className="text-gray-400">0</span>}
                          </td>
                          <td className="table-td text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600">{rate}%</span>
                            </div>
                          </td>
                          <td className="table-td text-center">
                            <div className="flex items-center gap-1 justify-center text-xs">
                              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{m.paid}</span>
                              {m.partial > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{m.partial}</span>}
                              {m.unpaid > 0 && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{m.unpaid}</span>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold text-sm">
                      <td className="table-td">TOTAL</td>
                      <td className="table-td text-right font-mono">{data.monthly.reduce((s, m) => s + m.records, 0)}</td>
                      <td className="table-td text-right font-mono">{fmt(data.monthly.reduce((s, m) => s + m.total_fee, 0))}</td>
                      <td className="table-td text-right font-mono text-amber-600">{fmt(data.monthly.reduce((s, m) => s + m.prev_balance, 0))}</td>
                      <td className="table-td text-right font-mono">{fmt(data.monthly.reduce((s, m) => s + m.total_due, 0))}</td>
                      <td className="table-td text-right font-mono text-green-700">{fmt(data.monthly.reduce((s, m) => s + m.total_collected, 0))}</td>
                      <td className="table-td text-right font-mono text-red-600">{fmt(data.monthly.reduce((s, m) => s + m.total_balance, 0))}</td>
                      <td className="table-td text-center text-sm">
                        {data.yearly_summary ? `${data.yearly_summary.collection_rate}%` : '—'}
                      </td>
                      <td className="table-td"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="px-5 py-12 text-center text-gray-400">No monthly data for {year}</div>
            )}
          </div>

          {/* Class-wise breakdown */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">Class-wise Annual Summary</h2>
            </div>
            {data.class_wise && data.class_wise.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px]">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="table-th">Class</th>
                      <th className="table-th text-right">Students</th>
                      <th className="table-th text-right">Records</th>
                      <th className="table-th text-right">Total Due</th>
                      <th className="table-th text-right text-green-700">Collected</th>
                      <th className="table-th text-right text-red-600">Outstanding</th>
                      <th className="table-th text-center">Collection Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {data.class_wise.map(c => (
                      <tr key={c.class_name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {c.class_name.substring(0, 2)}
                            </div>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{c.class_name}</span>
                          </div>
                        </td>
                        <td className="table-td text-right font-mono text-sm">{c.student_count}</td>
                        <td className="table-td text-right font-mono text-sm">{c.records}</td>
                        <td className="table-td text-right font-mono text-sm font-medium">{fmt(c.total_due)}</td>
                        <td className="table-td text-right font-mono text-sm text-green-700">{fmt(c.total_collected)}</td>
                        <td className="table-td text-right font-mono text-sm">
                          {c.total_balance > 0
                            ? <span className="text-red-600 font-medium">{fmt(c.total_balance)}</span>
                            : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="table-td text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${c.collection_rate >= 80 ? 'bg-green-500' : c.collection_rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${c.collection_rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-10 text-right">{c.collection_rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold text-sm">
                      <td className="table-td">TOTAL</td>
                      <td className="table-td text-right font-mono">{data.class_wise.reduce((s, c) => s + c.student_count, 0)}</td>
                      <td className="table-td text-right font-mono">{data.class_wise.reduce((s, c) => s + c.records, 0)}</td>
                      <td className="table-td text-right font-mono">{fmt(data.class_wise.reduce((s, c) => s + c.total_due, 0))}</td>
                      <td className="table-td text-right font-mono text-green-700">{fmt(data.class_wise.reduce((s, c) => s + c.total_collected, 0))}</td>
                      <td className="table-td text-right font-mono text-red-600">{fmt(data.class_wise.reduce((s, c) => s + c.total_balance, 0))}</td>
                      <td className="table-td text-center text-sm">
                        {data.yearly_summary ? `${data.yearly_summary.collection_rate}%` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="px-5 py-12 text-center text-gray-400">No class-wise data for {year}</div>
            )}
          </div>
        </>
      )}

      {/* Saved Balance Sheets Archive */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">Saved Balance Sheets</h2>
            <p className="text-xs text-gray-400">Balance sheets are auto-saved each time you view a year. Download any past year.</p>
          </div>
        </div>
        {savedLoading ? (
          <div className="flex items-center justify-center py-10">
            <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : savedSheets.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400">
            No saved balance sheets yet. View a year above to auto-save it.
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {savedSheets.map(sheet => (
              <div key={sheet.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {sheet.year}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">Balance Sheet — {sheet.year}</p>
                    <p className="text-xs text-gray-400">
                      Last updated: {new Date(sheet.generated_at).toLocaleDateString()} {new Date(sheet.generated_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setYear(String(sheet.year))}
                    className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDownloadSavedPdf(sheet)}
                    disabled={savedPdfLoading === sheet.id}
                    className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50"
                  >
                    {savedPdfLoading === sheet.id ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
