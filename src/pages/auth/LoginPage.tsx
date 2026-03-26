import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login/', data)
      const { access, refresh, user } = res.data
      if (user.role !== 'admin') {
        toast.error('Admin access required.')
        return
      }
      setAuth(user, access, refresh)
      navigate('/dashboard')
    } catch {
      toast.error('Invalid credentials.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A3D3A]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0CBDB5, #FF6200)' }}>
            <span className="font-black text-white text-lg">G</span>
          </div>
          <div>
            <p className="font-bold text-[#0A3D3A]">Go2Trip Holidays</p>
            <p className="text-xs text-gray-500">Admin Dashboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" placeholder="admin@go2tripholidays.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input {...register('password')} type="password" className="input" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
