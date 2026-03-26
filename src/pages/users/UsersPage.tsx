import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import api from '@/services/api'

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => api.get(`/auth/users/?page=${page}&search=${search}`).then(r => r.data),
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="card">
        <input className="input max-w-xs mb-4" placeholder="Search users…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />

        {isLoading ? <p className="text-gray-400 text-sm">Loading…</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Phone</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data?.results?.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium">{u.full_name || '—'}</td>
                  <td className="py-3 pr-4 text-gray-600">{u.email}</td>
                  <td className="py-3 pr-4 text-gray-500">{u.phone || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">{new Date(u.date_joined).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{data.count} users</span>
            <div className="flex gap-2">
              <button disabled={!data.previous} onClick={() => setPage(p => p - 1)} className="btn-ghost text-xs py-1 px-3 disabled:opacity-40">Prev</button>
              <span className="px-2 py-1">{data.current_page} / {data.total_pages}</span>
              <button disabled={!data.next} onClick={() => setPage(p => p + 1)} className="btn-ghost text-xs py-1 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
