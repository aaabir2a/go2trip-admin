import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

export default function ToursPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['tours', search, page],
    queryFn: () => api.get(`/tours/?search=${search}&page=${page}`).then(r => r.data),
  })

  const del = useMutation({
    mutationFn: (slug: string) => api.delete(`/tours/${slug}/`),
    onSuccess: () => { toast.success('Tour deleted.'); qc.invalidateQueries({ queryKey: ['tours'] }) },
    onError: () => toast.error('Delete failed.'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tours</h1>
        <Link to="/tours/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Tour
        </Link>
      </div>

      <div className="card">
        <input
          className="input max-w-xs mb-4"
          placeholder="Search tours…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />

        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Tour</th>
                  <th className="pb-2 pr-4">Destination</th>
                  <th className="pb-2 pr-4">Price (Adult)</th>
                  <th className="pb-2 pr-4">Rating</th>
                  <th className="pb-2 pr-4">Featured</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.results?.map((tour: any) => (
                  <tr key={tour.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <img src={tour.thumbnail} alt={tour.title} className="w-10 h-10 rounded-lg object-cover" />
                        <span className="font-medium line-clamp-1 max-w-[200px]">{tour.title}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{tour.destination_name}</td>
                    <td className="py-3 pr-4 font-semibold text-[#FF6200]">৳{Number(tour.price_adult).toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-1">
                        <Star size={13} className="text-yellow-400 fill-yellow-400" />
                        {tour.average_rating} ({tour.review_count})
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tour.is_featured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {tour.is_featured ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link to={`/tours/${tour.slug}/edit`} className="p-1.5 hover:bg-gray-100 rounded">
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => { if (confirm('Delete tour?')) del.mutate(tour.slug) }}
                          className="p-1.5 hover:bg-red-50 rounded text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{data.count} total tours</span>
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
