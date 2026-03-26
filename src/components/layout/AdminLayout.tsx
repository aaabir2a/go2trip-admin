import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, Globe, CalendarCheck, Users, BookOpen,
  LogOut, Menu, X, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import api from '@/services/api'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tours', icon: Map, label: 'Tours' },
  { to: '/destinations', icon: Globe, label: 'Destinations' },
  { to: '/bookings', icon: CalendarCheck, label: 'Bookings' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/blogs', icon: BookOpen, label: 'Blogs' },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, refreshToken, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout/', { refresh: refreshToken })
    } finally {
      logout()
      navigate('/login')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-[#0A3D3A] text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #0CBDB5, #FF6200)' }}>
            <span className="font-black text-sm">G</span>
          </div>
          {!collapsed && (
            <div className="leading-none">
              <p className="font-bold text-sm">Go2Trip</p>
              <p className="text-[10px] text-white/60 tracking-widest uppercase">Admin</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto p-1 hover:bg-white/10 rounded">
            {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="mb-2 px-1">
              <p className="text-xs font-semibold truncate">{user?.full_name}</p>
              <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
