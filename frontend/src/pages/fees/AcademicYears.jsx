import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  getAcademicYears, createAcademicYear,
  updateAcademicYear, deleteAcademicYear,
} from '../../api/feesApi'
import Modal from '../../components/Modal'
import Badge from '../../components/Badge'

const EMPTY = { label: '', start_date: '', end_date: '', is_current: false }

export default function AcademicYears() {
  const [years, setYears]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const load = () => {
    setLoading(true)
    getAcademicYears()
      .then(({ data }) => setYears(data.results ?? data))
      .catch(() => toast.error('Failed to load academic years'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal('edit') }
  const openEdit = (y) => {
    setForm({ label: y.label, start_date: y.start_date, end_date: y.end_date, is_current: y.is_current })
    setEditId(y.id)
    setModal('edit')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await updateAcademicYear(editId, form)
        toast.success('Academic year updated')
      } else {
        await createAcademicYear(form)
        toast.success('Academic year created')
      }
      setModal(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.detail
        || err.response?.data?.label?.[0]
        || (typeof err.response?.data === 'object' ? Object.values(err.response.data).flat()[0] : null)
        || 'Failed to save'
      toast.error(Array.isArray(msg) ? msg[0] : String(msg))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAcademicYear(deleteId)
      toast.success('Academic year deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete academic year')
    }
  }

  const currentYear = years.find(y => y.is_current)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Years</h1>
          <p className="text-sm text-gray-500">
            {currentYear
              ? `Current: ${currentYear.label}`
              : 'No current academic year set'}
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Academic Year
        </button>
      </div>

      {/* Current year banner */}
      {currentYear && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Current Academic Year: {currentYear.label}
              </p>
              {(currentYear.start_date || currentYear.end_date) && (
                <p className="text-xs text-blue-600">
                  {currentYear.start_date || '?'} — {currentYear.end_date || '?'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : years.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="mb-2">No academic years yet.</p>
            <button className="btn-primary" onClick={openAdd}>Add First Year</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Label</th>
                <th className="table-th">Start Date</th>
                <th className="table-th">End Date</th>
                <th className="table-th text-center">Status</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {years.map((y) => (
                <tr key={y.id} className={`hover:bg-gray-50 ${y.is_current ? 'bg-blue-50/50' : ''}`}>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${y.is_current ? 'bg-blue-600' : 'bg-gray-400'} rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-800">{y.label}</span>
                    </div>
                  </td>
                  <td className="table-td text-sm text-gray-600">{y.start_date || '—'}</td>
                  <td className="table-td text-sm text-gray-600">{y.end_date || '—'}</td>
                  <td className="table-td text-center">
                    {y.is_current
                      ? <Badge value="paid" label="Current" />
                      : <span className="text-xs text-gray-400">Past</span>
                    }
                  </td>
                  <td className="table-td text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openEdit(y)}
                        className="text-sm text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => setDeleteId(y.id)}
                        className="text-sm text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)}
        title={editId ? 'Edit Academic Year' : 'Add Academic Year'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Label <span className="text-red-500">*</span></label>
            <input className="input" placeholder="e.g. 2025-2026"
              value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date"
                value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input className="input" type="date"
                value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="ay_current" type="checkbox" className="rounded border-gray-300 text-blue-600"
              checked={form.is_current} onChange={e => setForm({ ...form, is_current: e.target.checked })} />
            <label htmlFor="ay_current" className="text-sm text-gray-700">Mark as Current Year</label>
          </div>
          <p className="text-xs text-gray-400">
            Only one academic year can be current at a time. Enabling this will automatically deactivate the previous current year.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Academic Year" size="sm">
        <p className="text-gray-600 text-sm">
          Delete this academic year? This will not affect any fee records.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
