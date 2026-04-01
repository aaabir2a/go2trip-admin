import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api, { apiErrorMsg } from '@/services/api'

export default function BlogFormPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const isEdit = !!slug

  const { data: blog } = useQuery({
    queryKey: ['blog', slug],
    queryFn: () => api.get(`/blogs/${slug}/`).then(r => r.data.data ?? r.data),
    enabled: isEdit,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/blogs/categories/?page_size=100').then(r => r.data.results ?? r.data),
  })

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (blog) reset({ ...blog, category_ids: blog.categories?.map((c: any) => c.id) })
  }, [blog, reset])

  const mutation = useMutation({
    mutationFn: (d: any) => isEdit ? api.patch(`/blogs/${slug}/`, d) : api.post('/blogs/', d),
    onSuccess: () => { toast.success(isEdit ? 'Updated.' : 'Created.'); navigate('/blogs') },
    onError: (e: any) => toast.error(apiErrorMsg(e, 'Save failed.')),
  })

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">{isEdit ? 'Edit Post' : 'New Blog Post'}</h1>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="card space-y-4">
        <div>
          <label className="label">Title</label>
          <input {...register('title', { required: true })} className="input" />
        </div>
        <div>
          <label className="label">Content</label>
          <textarea {...register('content', { required: true })} rows={12} className="input font-mono text-xs" />
        </div>
        <div>
          <label className="label">Categories</label>
          <select {...register('category_ids')} multiple className="input h-28">
            {(categories ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input {...register('is_published')} type="checkbox" />
          <span className="text-sm">Publish immediately</span>
        </label>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary">{isEdit ? 'Update' : 'Create'}</button>
          <button type="button" onClick={() => navigate('/blogs')} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}
