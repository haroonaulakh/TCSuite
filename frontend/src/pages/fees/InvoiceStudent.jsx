import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import client from '../../api/client'

const MONTHS = [
  '', 'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function InvoiceStudent() {
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [error, setError]   = useState(null)
  const printed = useRef(false)

  useEffect(() => {
    client.get(`/fees/records/${id}/invoice/`)
      .then(({ data }) => {
        setRecord(data)
      })
      .catch(() => setError('Could not load invoice'))
  }, [id])

  useEffect(() => {
    if (record && !printed.current) {
      printed.current = true
      setTimeout(() => window.print(), 600)
    }
  }, [record])

  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!record) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  const s = record.student

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { size: A5; margin: 12mm; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; }
        .invoice { background: white; max-width: 600px; margin: 20px auto; padding: 32px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
        .header { text-align: center; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; }
        .school-name { font-size: 22px; font-weight: 800; color: #1d4ed8; letter-spacing: 0.5px; }
        .school-sub  { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .invoice-title { font-size: 14px; font-weight: 700; color: #374151; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .receipt-no { font-size: 13px; color: #6b7280; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        td { padding: 6px 8px; font-size: 13px; }
        .label { color: #6b7280; width: 44%; }
        .value { color: #111827; font-weight: 500; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px;
          color: #6b7280; padding: 14px 8px 4px; border-top: 1px solid #e5e7eb; }
        .amount-row td { font-size: 14px; padding: 8px; }
        .total-row td { font-size: 15px; font-weight: 700; border-top: 2px solid #e5e7eb; padding-top: 10px; }
        .balance-row td { color: #dc2626; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
        .status-paid    { background: #dcfce7; color: #166534; }
        .status-partial { background: #fef9c3; color: #854d0e; }
        .status-unpaid  { background: #fee2e2; color: #991b1b; }
        .status-waived  { background: #f3f4f6; color: #4b5563; }
        .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 36px; }
        .sig-box { text-align: center; font-size: 11px; color: #6b7280; }
        .sig-line { border-top: 1px solid #9ca3af; width: 120px; margin: 0 auto 6px; }
      `}</style>

      {/* Print button (hidden on print) */}
      <div className="no-print text-center py-4">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          🖨 Print Invoice
        </button>
      </div>

      <div className="invoice">
        {/* Header */}
        <div className="header">
          <div className="school-name">The Creative School</div>
          <div className="school-sub">Fee Payment Invoice</div>
          <div className="invoice-title">Monthly Fee Receipt</div>
          <div className="receipt-no">Receipt No: <strong>{record.receipt_no}</strong> &nbsp;·&nbsp; Date: {record.receipt_date}</div>
        </div>

        {/* Student info */}
        <table>
          <tbody>
            <tr><td colSpan={2} className="section-title">Student Information</td></tr>
            <tr><td className="label">Student Name</td><td className="value">{s.student_name}</td></tr>
            <tr><td className="label">Admission No</td><td className="value">{s.admission_no}</td></tr>
            <tr><td className="label">Class</td><td className="value">{s.current_class}</td></tr>
            <tr><td className="label">Father / Guardian</td><td className="value">{s.f_g_name}</td></tr>
            <tr><td className="label">Contact</td><td className="value">{s.f_g_contact}</td></tr>
          </tbody>
        </table>

        {/* Fee details */}
        <table>
          <tbody>
            <tr><td colSpan={2} className="section-title">Fee Details — {MONTHS[record.month]} {record.year}</td></tr>
            <tr className="amount-row">
              <td className="label">Previous Balance</td>
              <td className="value">Rs {Number(record.previous_balance).toLocaleString()}</td>
            </tr>
            <tr className="amount-row">
              <td className="label">Monthly Fee</td>
              <td className="value">Rs {Number(record.current_fee).toLocaleString()}</td>
            </tr>
            <tr className="total-row">
              <td className="label">Total Amount</td>
              <td className="value">Rs {Number(record.total_amount).toLocaleString()}</td>
            </tr>
            <tr className="amount-row">
              <td className="label">Amount Paid</td>
              <td className="value" style={{ color: '#16a34a' }}>Rs {Number(record.amount_paid).toLocaleString()}</td>
            </tr>
            {Number(record.balance) > 0 && (
              <tr className="balance-row amount-row">
                <td className="label">Balance Due</td>
                <td className="value">Rs {Number(record.balance).toLocaleString()}</td>
              </tr>
            )}
            <tr>
              <td className="label">Due Date</td>
              <td className="value">{record.due_date}</td>
            </tr>
            {record.payment_date && (
              <tr>
                <td className="label">Payment Date</td>
                <td className="value">{record.payment_date}</td>
              </tr>
            )}
            <tr>
              <td className="label">Status</td>
              <td className="value">
                <span className={`status-badge status-${record.status}`}>
                  {record.status.toUpperCase()}
                </span>
              </td>
            </tr>
            {record.remarks && (
              <tr>
                <td className="label">Remarks</td>
                <td className="value">{record.remarks}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="sig-row">
          <div className="sig-box">
            <div className="sig-line" />
            Parent / Guardian Signature
          </div>
          <div className="sig-box">
            <div className="sig-line" />
            Accounts Officer
          </div>
        </div>

        <div className="footer">
          This is a computer-generated receipt. — The Creative School
        </div>
      </div>
    </>
  )
}
