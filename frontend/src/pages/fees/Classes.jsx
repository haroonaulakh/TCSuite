import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getClassRooms, createClassRoom, updateClassRoom,
  deleteClassRoom, syncClassRooms,
} from '../../api/feesApi'
import Modal from '../../components/Modal'
import Badge from '../../components/Badge'

const EMPTY = { name: '', sort_order: 0, is_active: true }

export default function Classes() {
  const [classes, setClasses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [syncing, setSyncing]   = useState(false)

  const load = () => {
    setLoading(true)
    getClassRooms()
      .then(({ data }) => setClasses(data.results ?? data))
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal('edit') }
  const openEdit = (c) => {
    setForm({ name: c.name, sort_order: c.sort_order, is_active: c.is_active })
    setEditId(c.id)
    setModal('edit')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await updateClassRoom(editId, form)
        toast.success('Class updated')
      } else {
        await createClassRoom(form)
        toast.success('Class created')
      }
      setModal(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.detail
        || err.response?.data?.name?.[0]
        || (typeof err.response?.data === 'object' ? Object.values(err.response.data).flat()[0] : null)
        || 'Failed to save'
      toast.error(Array.isArray(msg) ? msg[0] : String(msg))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteClassRoom(deleteId)
      toast.success('Class deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete class')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { data } = await syncClassRooms()
      toast.success(`Synced: ${data.created} new classes added (${data.total} total)`)
      load()
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const totalStudents = classes.reduce((s, c) => s + (c.student_count || 0), 0)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500">{classes.length} classes, {totalStudents} active students</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync from Students'}
          </button>
          <button className="btn-primary" onClick={openAdd}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Class
          </button>
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
        ) : classes.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="mb-2">No classes yet.</p>
            <div className="flex gap-2 justify-center">
              <button className="btn-secondary" onClick={handleSync}>Sync from Students</button>
              <button className="btn-primary" onClick={openAdd}>Add First Class</button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Class Name</th>
                <th className="table-th text-center">Students</th>
                <th className="table-th text-center">Sort Order</th>
                <th className="table-th text-center">Status</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.name.substring(0, 2)}
                      </div>
                      <span className="font-semibold text-gray-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="table-td text-center">
                    <Link to={`/students?current_class=${encodeURIComponent(c.name)}`}
                      className="text-blue-600 hover:underline font-medium">
                      {c.student_count}
                    </Link>
                  </td>
                  <td className="table-td text-center font-mono text-sm text-gray-500">{c.sort_order}</td>
                  <td className="table-td text-center">
                    <Badge value={c.is_active ? 'active' : 'inactive'}
                      label={c.is_active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="table-td text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openEdit(c)}
                        className="text-sm text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => setDeleteId(c.id)}
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
        title={editId ? 'Edit Class' : 'Add New Class'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Class Name <span className="text-red-500">*</span></label>
            <input className="input" placeholder="e.g. One (A), PG, Ten (Boys)"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Sort Order</label>
            <input className="input" type="number" min="0"
              value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
            <p className="text-xs text-gray-400 mt-1">Lower numbers appear first. Classes with the same order are sorted alphabetically.</p>
          </div>
          <div className="flex items-center gap-2">
            <input id="cls_active" type="checkbox" className="rounded border-gray-300 text-blue-600"
              checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            <label htmlFor="cls_active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Class" size="sm">
        <p className="text-gray-600 text-sm">
          Delete this class? This only removes the class entry — student records referencing this class name are not affected.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
