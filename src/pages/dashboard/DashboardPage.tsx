import { useQuery } from '@tanstack/react-query'
import { Map, Globe, CalendarCheck, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '@/services/api'

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: bookings } = useQuery({ queryKey: ['bookings-all'], queryFn: () => api.get('/bookings/?page_size=100').then(r => r.data) })
  const { data: tours } = useQuery({ queryKey: ['tours-count'], queryFn: () => api.get('/tours/?page_size=1').then(r => r.data) })
  const { data: destinations } = useQuery({ queryKey: ['dest-count'], queryFn: () => api.get('/destinations/?page_size=1').then(r => r.data) })
  const { data: users } = useQuery({ queryKey: ['users-count'], queryFn: () => api.get('/auth/users/?page_size=1').then(r => r.data) })

  const allBookings = bookings?.results ?? []
  const revenue = allBookings
    .filter((b: any) => b.payment_status === 'paid')
    .reduce((sum: number, b: any) => sum + parseFloat(b.total_price), 0)

  // Simple monthly chart from bookings
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const month = d.toLocaleString('default', { month: 'short' })
    const count = allBookings.filter((b: any) => {
      const bd = new Date(b.created_at)
      return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear()
    }).length
    return { month, bookings: count }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome back — here's what's happening.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tours" value={tours?.count ?? '…'} icon={Map} color="#0CBDB5" />
        <StatCard label="Destinations" value={destinations?.count ?? '…'} icon={Globe} color="#FF6200" />
        <StatCard label="Total Bookings" value={allBookings.length} icon={CalendarCheck} color="#0A3D3A" />
        <StatCard label="Total Users" value={users?.count ?? '…'} icon={Users} color="#6366f1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-4">Bookings Last 6 Months</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#0CBDB5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Booking Status</h2>
          <div className="space-y-3">
            {['pending', 'confirmed', 'cancelled', 'completed'].map((s) => {
              const count = allBookings.filter((b: any) => b.status === s).length
              const pct = allBookings.length ? Math.round(count / allBookings.length * 100) : 0
              const colors: Record<string, string> = { pending: '#f59e0b', confirmed: '#10b981', cancelled: '#ef4444', completed: '#6366f1' }
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize">{s}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[s] }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">Total Revenue (paid)</p>
            <p className="text-xl font-bold text-[#0A3D3A]">৳{revenue.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
