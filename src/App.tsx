import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import AdminLayout from '@/components/layout/AdminLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ToursPage from '@/pages/tours/ToursPage'
import TourFormPage from '@/pages/tours/TourFormPage'
import DestinationsPage from '@/pages/destinations/DestinationsPage'
import BookingsPage from '@/pages/bookings/BookingsPage'
import UsersPage from '@/pages/users/UsersPage'
import BlogsPage from '@/pages/blogs/BlogsPage'
import BlogFormPage from '@/pages/blogs/BlogFormPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tours" element={<ToursPage />} />
        <Route path="tours/new" element={<TourFormPage />} />
        <Route path="tours/:slug/edit" element={<TourFormPage />} />
        <Route path="destinations" element={<DestinationsPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="blogs/new" element={<BlogFormPage />} />
        <Route path="blogs/:slug/edit" element={<BlogFormPage />} />
      </Route>
    </Routes>
  )
}
