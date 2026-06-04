import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]       = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.username, form.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{
        background:
          'radial-gradient(1200px 800px at 20% -10%, rgba(59,130,246,0.35), transparent 60%),' +
          'radial-gradient(900px 700px at 100% 20%, rgba(13,148,136,0.28), transparent 60%),' +
          'radial-gradient(800px 600px at 50% 110%, rgba(99,102,241,0.25), transparent 60%),' +
          'linear-gradient(180deg, #050816 0%, #0a0f1f 50%, #050816 100%)',
      }}
    >
      {/* Ambient orbs */}
      <div className="orb w-[500px] h-[500px] top-10 -left-32 bg-blue-500/30" />
      <div className="orb w-[450px] h-[450px] -bottom-32 -right-20 bg-teal-500/25" />
      <div className="orb w-[400px] h-[400px] top-1/3 right-1/4 bg-indigo-500/20" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-md animate-fade-up">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 10px 32px -8px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.18) inset',
            }}
          >
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 14l6.16-3.422A12.083 12.083 0 0121 12c0 2.485-.804 4.793-2.161 6.67L12 22l-6.839-3.33A11.935 11.935 0 013 12c0-.725.059-1.435.172-2.126L12 14z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white font-display tracking-tight">The Creative School</h1>
          <p className="text-slate-400 text-sm mt-2 tracking-wide">Management System</p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.10) inset, 0 30px 80px -20px rgba(0,0,0,0.55)',
          }}
        >
          <h2 className="text-xl font-semibold text-white mb-1 font-display tracking-tight">Sign in</h2>
          <p className="text-sm text-slate-400 mb-6">Welcome back. Enter your credentials.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-2 tracking-wider uppercase text-slate-300">Username</label>
              <input
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200
                           focus:outline-none placeholder-slate-500 text-white
                           bg-white/[0.04] border border-white/10
                           focus:bg-white/[0.07] focus:border-blue-400/60
                           focus:ring-2 focus:ring-blue-400/20"
                type="text"
                placeholder="admin"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 tracking-wider uppercase text-slate-300">Password</label>
              <input
                className="block w-full rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200
                           focus:outline-none placeholder-slate-500 text-white
                           bg-white/[0.04] border border-white/10
                           focus:bg-white/[0.07] focus:border-blue-400/60
                           focus:ring-2 focus:ring-blue-400/20"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base font-semibold"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6 tracking-wide">
          Staff &amp; Admin access only
        </p>
      </div>
    </div>
  )
}
