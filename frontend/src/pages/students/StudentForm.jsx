import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getStudent, createStudent, updateStudent } from '../../api/studentsApi'
import { getClassRooms } from '../../api/feesApi'

const INITIAL = {
  admission_no: '', date_of_admission: '',
  student_name: '',
  b_form: '', dob: '', religion: '', tribe_caste: '', address: '',
  f_g_name: '', f_g_cnic: '', f_g_occupation: '', f_g_contact: '',
  class_of_admission: '', current_class: '',
  current_fee: '',
  withdrawn: 'no', class_of_withdrawl: '',
  arrear_dues: '', remarks: '',
  email: '', password: '',
}

function FieldGroup({ children, title }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children, span }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function StudentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm]         = useState(INITIAL)
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [classOptions, setClassOptions] = useState([])

  useEffect(() => {
    getClassRooms()
      .then(({ data }) => setClassOptions((data.results ?? data).map(c => c.name)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    getStudent(id)
      .then(({ data }) => {
        const vals = { ...INITIAL }
        Object.keys(INITIAL).forEach((k) => { if (data[k] !== undefined) vals[k] = data[k] ?? '' })
        vals.password = ''
        setForm(vals)
      })
      .catch(() => toast.error('Failed to load student'))
      .finally(() => setFetching(false))
  }, [id, isEdit])

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const payload = { ...form }
      if (!payload.current_fee) payload.current_fee = null
      // date fields are now CharField — send empty string when blank, never null
      if (!payload.date_of_admission) payload.date_of_admission = ''
      if (!payload.dob) payload.dob = ''
      if (isEdit && !payload.password) delete payload.password
      if (isEdit) {
        await updateStudent(id, payload)
        toast.success('Student updated')
        navigate(`/students/${id}`)
      } else {
        const { data } = await createStudent(payload)
        toast.success('Student enrolled')
        navigate(`/students/${data.id}`)
      }
    } catch (err) {
      if (err.response?.data && typeof err.response.data === 'object') {
        setErrors(err.response.data)
        toast.error('Please fix the errors below')
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  const inp = (field, props = {}) => (
    <>
      <input
        className={`input ${errors[field] ? 'border-red-400 focus:ring-red-400' : ''}`}
        value={form[field]}
        onChange={set(field)}
        {...props}
      />
      {errors[field] && <p className="text-xs text-red-600 mt-1">{errors[field]}</p>}
    </>
  )

  const sel = (field, options) => (
    <>
      <select
        className={`input ${errors[field] ? 'border-red-400' : ''}`}
        value={form[field]}
        onChange={set(field)}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      {errors[field] && <p className="text-xs text-red-600 mt-1">{errors[field]}</p>}
    </>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <nav className="text-sm text-gray-400 mb-1">
          <Link to="/students" className="hover:text-blue-600">Students</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{isEdit ? 'Edit' : 'Enrol New Student'}</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Student' : 'Enrol New Student'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Admission */}
        <FieldGroup title="Admission Information">
          <Field label="Admission Number" required>
            {inp('admission_no', { placeholder: 'e.g. 1525' })}
          </Field>
          <Field label="Date of Admission">
            {inp('date_of_admission', { type: 'date' })}
          </Field>
        </FieldGroup>

        {/* Personal */}
        <FieldGroup title="Student Personal Information">
          <Field label="Full Name" required span>
            {inp('student_name', { placeholder: 'Muhammad Ali' })}
          </Field>
          <Field label="B-Form / CNIC" required>
            {inp('b_form', { placeholder: '35201-XXXXXXX-X' })}
          </Field>
          <Field label="Date of Birth">
            {inp('dob', { type: 'date' })}
          </Field>
          <Field label="Religion">
            {inp('religion', { placeholder: 'Islam' })}
          </Field>
          <Field label="Tribe / Caste">
            {inp('tribe_caste')}
          </Field>
          <Field label="Address" span>
            <textarea
              className="input min-h-[80px] resize-none"
              value={form.address}
              onChange={set('address')}
              placeholder="Full address…"
            />
          </Field>
        </FieldGroup>

        {/* Guardian */}
        <FieldGroup title="Father / Guardian Information">
          <Field label="Name" required>
            {inp('f_g_name')}
          </Field>
          <Field label="CNIC (13 digits)" required>
            {inp('f_g_cnic', { placeholder: '3520112345671' })}
          </Field>
          <Field label="Occupation">
            {inp('f_g_occupation')}
          </Field>
          <Field label="Contact Number" required>
            {inp('f_g_contact', { placeholder: '03001234567' })}
          </Field>
        </FieldGroup>

        {/* Academic */}
        <FieldGroup title="Academic & Financial Information">
          <Field label="Class of Admission" required>
            {sel('class_of_admission', classOptions)}
          </Field>
          <Field label="Current Class" required>
            {sel('current_class', classOptions)}
          </Field>
          <Field label="Individual Monthly Fee (Rs)">
            {inp('current_fee', {
              type: 'number', min: 0, step: '0.01',
              placeholder: 'Leave blank to use class Fee Structure',
            })}
            <p className="text-xs text-gray-400 mt-1">
              Overrides the class-level fee structure for this student.
            </p>
          </Field>
          <Field label="Arrear Dues (Rs)">
            {inp('arrear_dues', { placeholder: '0' })}
          </Field>
          <Field label="Withdrawn">
            {sel('withdrawn', [{ value: 'no', label: 'No (Active)' }, { value: 'yes', label: 'Yes' }])}
          </Field>
          {form.withdrawn === 'yes' && (
            <Field label="Class of Withdrawal">
              {sel('class_of_withdrawl', classOptions)}
            </Field>
          )}
          <Field label="Remarks" span>
            <textarea className="input min-h-[80px] resize-none" value={form.remarks} onChange={set('remarks')} />
          </Field>
        </FieldGroup>

        {/* Credentials */}
        <FieldGroup title="Login Credentials">
          <Field label="Email" required={!isEdit}>
            {inp('email', { type: 'email', placeholder: 'student@example.com' })}
          </Field>
          <Field label={isEdit ? 'New Password (leave blank to keep)' : 'Password'} required={!isEdit}>
            {inp('password', { type: 'password', placeholder: isEdit ? 'Leave blank to keep current' : '••••••••' })}
          </Field>
        </FieldGroup>

        <div className="flex items-center gap-3 justify-end">
          <Link to={isEdit ? `/students/${id}` : '/students'} className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </>
            ) : isEdit ? 'Save Changes' : 'Enrol Student'}
          </button>
        </div>
      </form>
    </div>
  )
}
