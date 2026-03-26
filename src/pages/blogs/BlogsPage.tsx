import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

export default function BlogsPage() {
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['blogs-admin', page],
    queryFn: () => api.get(`/blogs/?page=${page}&page_size=10`).then(r => r.data),
  })

  const del = useMutation({
    mutationFn: (slug: string) => api.delete(`/blogs/${slug}/`),
    onSuccess: () => { toast.success('Deleted.'); qc.invalidateQueries({ queryKey: ['blogs-admin'] }) },
  })

  const togglePublish = useMutation({
    mutationFn: ({ slug, is_published }: { slug: string; is_published: boolean }) =>
      api.patch(`/blogs/${slug}/`, { is_published }),
    onSuccess: () => { toast.success('Updated.'); qc.invalidateQueries({ queryKey: ['blogs-admin'] }) },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blogs</h1>
        <Link to="/blogs/new" className="btn-primary flex items-center gap-2"><Plus size={16} /> New Post</Link>
      </div>

      <div className="card">
        {isLoading ? <p className="text-gray-400 text-sm">Loading…</p> : (
          <div className="space-y-3">
            {data?.results?.map((b: any) => (
              <div key={b.id} className="flex items-center gap-4 p-3 border rounded-xl hover:bg-gray-50">
                {b.thumbnail && <img src={b.thumbnail} alt={b.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-1">{b.title}</p>
                  <p className="text-xs text-gray-500">{b.author_name} · {new Date(b.created_at).toLocaleDateString()}</p>
                  <div className="flex gap-1 mt-1">
                    {b.categories?.map((c: any) => (
                      <span key={c.id} className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-xs rounded">{c.name}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.is_published ? 'Published' : 'Draft'}
                  </span>
                  <button onClick={() => togglePublish.mutate({ slug: b.slug, is_published: !b.is_published })} className="p-1.5 hover:bg-gray-100 rounded" title="Toggle publish">
                    {b.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <Link to={`/blogs/${b.slug}/edit`} className="p-1.5 hover:bg-gray-100 rounded"><Pencil size={15} /></Link>
                  <button onClick={() => { if (confirm('Delete?')) del.mutate(b.slug) }} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{data.count} posts</span>
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
