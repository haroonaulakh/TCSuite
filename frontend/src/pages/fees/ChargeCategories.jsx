import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  getChargeCategories, createChargeCategory,
  updateChargeCategory, deleteChargeCategory,
} from '../../api/feesApi'
import Modal from '../../components/Modal'

const EMPTY = { name: '', amount: '', description: '', is_active: true }

export default function ChargeCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [editId, setEditId]         = useState(null)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState(null)
  const [search, setSearch]         = useState('')

  const load = () => {
    setLoading(true)
    getChargeCategories()
      .then(({ data }) => setCategories(data.results ?? data))
      .catch(() => toast.error('Failed to load charge categories'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal('edit') }
  const openEdit = (c) => {
    setForm({ name: c.name, amount: c.amount, description: c.description ?? '', is_active: c.is_active })
    setEditId(c.id)
    setModal('edit')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await updateChargeCategory(editId, form)
        toast.success('Category updated')
      } else {
        await createChargeCategory(form)
        toast.success('Category created')
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
      await deleteChargeCategory(deleteId)
      toast.success('Category deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete category')
    }
  }

  const filtered = categories.filter((c) => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q)
      || (c.description ?? '').toLowerCase().includes(q)
  })

  const activeCount = categories.filter(c => c.is_active).length

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-display tracking-tight">Charge Categories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {categories.length} categories, {activeCount} active
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <input
          className="input"
          placeholder="Search categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">
            {search ? (
              <p>No categories match "{search}"</p>
            ) : (
              <>
                <p className="mb-2">No charge categories yet.</p>
                <button className="btn-primary" onClick={openAdd}>Add First Category</button>
              </>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th text-right">Amount (Rs)</th>
                <th className="table-th">Description</th>
                <th className="table-th text-center">Status</th>
                <th className="table-th text-center">Charges</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${c.is_active ? 'bg-blue-600' : 'bg-gray-400'} rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{c.name}</span>
                    </div>
                  </td>
                  <td className="table-td text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                    {Number(c.amount).toLocaleString()}
                  </td>
                  <td className="table-td text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {c.description || '—'}
                  </td>
                  <td className="table-td text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.is_active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-td text-center text-sm text-gray-600 dark:text-gray-400">
                    {c.charges_count ?? 0}
                  </td>
                  <td className="table-td text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openEdit(c)}
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400">Edit</button>
                      <button onClick={() => setDeleteId(c.id)}
                        className="text-sm text-red-500 hover:underline dark:text-red-400">Delete</button>
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
        title={editId ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input className="input" placeholder="e.g. Books, Notebooks, Diary"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Amount (Rs) <span className="text-red-500">*</span></label>
            <input className="input" type="number" min="0" step="any" placeholder="0"
              value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="Optional description"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input id="cc_active" type="checkbox" className="rounded border-gray-300 text-blue-600 dark:border-gray-600"
              checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            <label htmlFor="cc_active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Category" size="sm">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Delete this charge category? Any existing charges using this category will not be affected.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
