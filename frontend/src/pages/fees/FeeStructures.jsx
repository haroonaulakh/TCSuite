import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
} from '../../api/feesApi'
import Modal from '../../components/Modal'
import Badge from '../../components/Badge'

const EMPTY = { class_name: '', monthly_fee: '', description: '', is_active: true }

export default function FeeStructures() {
  const [structures, setStructures] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null)   // null | 'add' | 'edit'
  const [form, setForm]             = useState(EMPTY)
  const [editId, setEditId]         = useState(null)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState(null)

  const load = () => {
    setLoading(true)
    getFeeStructures()
      .then(({ data }) => setStructures(data.results ?? data))
      .catch(() => toast.error('Failed to load fee structures'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal('edit') }
  const openEdit = (s) => { setForm({ ...s }); setEditId(s.id); setModal('edit') }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await updateFeeStructure(editId, form)
        toast.success('Fee structure updated')
      } else {
        await createFeeStructure(form)
        toast.success('Fee structure created')
      }
      setModal(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.detail
        || Object.values(err.response?.data ?? {})[0]
        || 'Failed to save'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteFeeStructure(deleteId)
      toast.success('Deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Cannot delete — fee records may reference this structure')
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-display tracking-tight">Fee Structures</h1>
          <p className="text-sm text-gray-500">Monthly fee per class</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Structure
        </button>
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
        ) : structures.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="mb-2">No fee structures yet.</p>
            <button className="btn-primary" onClick={openAdd}>Add First Structure</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Class</th>
                <th className="table-th">Monthly Fee</th>
                <th className="table-th">Description</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {structures.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-td font-semibold text-gray-800">{s.class_name}</td>
                  <td className="table-td font-mono text-green-700">
                    Rs {Number(s.monthly_fee).toLocaleString()}
                  </td>
                  <td className="table-td text-gray-500">{s.description || '—'}</td>
                  <td className="table-td">
                    <Badge value={s.is_active ? 'active' : 'inactive'} label={s.is_active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(s.id)}
                        className="text-sm text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={modal === 'edit'}
        onClose={() => setModal(null)}
        title={editId ? 'Edit Fee Structure' : 'Add Fee Structure'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Class Name <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="e.g. Class 5 or Nursery"
              value={form.class_name}
              onChange={(e) => setForm({ ...form, class_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Monthly Fee (Rs) <span className="text-red-500">*</span></label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="2500"
              value={form.monthly_fee}
              onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none min-h-[80px]"
              placeholder="Optional notes about this fee structure…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              className="rounded border-gray-300 text-blue-600"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Fee Structure" size="sm">
        <p className="text-gray-600 text-sm">
          Delete this fee structure? It cannot be deleted if fee records reference it.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
