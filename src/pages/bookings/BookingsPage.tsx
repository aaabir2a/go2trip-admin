import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-pending',
  confirmed: 'badge-confirmed',
  cancelled: 'badge-cancelled',
  completed: 'badge-completed',
}

export default function BookingsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', status, page],
    queryFn: () => api.get(`/bookings/?status=${status}&page=${page}`).then(r => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status: s, payment_status }: { id: number; status: string; payment_status?: string }) =>
      api.post(`/bookings/${id}/update-status/`, { status: s, payment_status }),
    onSuccess: () => { toast.success('Booking updated.'); qc.invalidateQueries({ queryKey: ['bookings'] }) },
    onError: () => toast.error('Update failed.'),
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Bookings</h1>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <Filter size={16} className="text-gray-400 mt-2.5" />
          {['', 'pending', 'confirmed', 'cancelled', 'completed'].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${status === s ? 'bg-[#0A3D3A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {isLoading ? <p className="text-gray-400 text-sm">Loading…</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Ref</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4">Tour</th>
                  <th className="pb-2 pr-4">People</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Payment</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.results?.map((b: any) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{String(b.reference).slice(0, 8)}…</td>
                    <td className="py-3 pr-4">{b.user_email ?? '—'}</td>
                    <td className="py-3 pr-4 max-w-[180px]"><span className="line-clamp-1">{b.tour?.title}</span></td>
                    <td className="py-3 pr-4">{b.total_people}</td>
                    <td className="py-3 pr-4 font-semibold text-[#FF6200]">৳{Number(b.total_price).toLocaleString()}</td>
                    <td className="py-3 pr-4"><span className={STATUS_COLORS[b.status]}>{b.status}</span></td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="py-3">
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={b.status}
                        onChange={(e) => updateStatus.mutate({ id: b.id, status: e.target.value })}
                      >
                        {['pending', 'confirmed', 'cancelled', 'completed'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{data.count} bookings</span>
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
