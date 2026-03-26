import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

export default function DestinationsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const thumbFileRef = useRef<File | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['destinations'],
    queryFn: () => api.get('/destinations/?page_size=100').then(r => r.data),
  })

  const { register, handleSubmit, reset } = useForm()

  const save = useMutation({
    mutationFn: (formData: FormData) =>
      editing
        ? api.patch(`/destinations/${editing.slug}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        : api.post('/destinations/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      toast.success(editing ? 'Destination updated.' : 'Destination created.')
      qc.invalidateQueries({ queryKey: ['destinations'] })
      setShowForm(false); setEditing(null); setThumbPreview(null); thumbFileRef.current = null; reset()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Save failed.'),
  })

  const del = useMutation({
    mutationFn: (slug: string) => api.delete(`/destinations/${slug}/`),
    onSuccess: () => { toast.success('Deleted.'); qc.invalidateQueries({ queryKey: ['destinations'] }) },
  })

  const openEdit = (dest: any) => {
    setEditing(dest)
    setThumbPreview(dest.thumbnail || null)
    thumbFileRef.current = null
    reset({ name: dest.name, country: dest.country, location: dest.location, description: dest.description })
    setShowForm(true)
  }

  const onSubmit = (data: any) => {
    if (!editing && !thumbFileRef.current) {
      toast.error('Please select a thumbnail image.')
      return
    }
    const fd = new FormData()
    fd.append('name', data.name)
    fd.append('country', data.country)
    fd.append('location', data.location)
    fd.append('description', data.description)
    fd.append('is_active', 'true')
    if (thumbFileRef.current) fd.append('thumbnail', thumbFileRef.current)
    save.mutate(fd)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Destinations</h1>
        <button onClick={() => { setEditing(null); setThumbPreview(null); reset({}); setShowForm(true) }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Destination
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">{editing ? 'Edit' : 'New'} Destination</h2>
            <button onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Cox's Bazar" />
            </div>
            <div>
              <label className="label">Country *</label>
              <input {...register('country', { required: true })} className="input" defaultValue="Bangladesh" />
            </div>
            <div>
              <label className="label">Location *</label>
              <input {...register('location', { required: true })} className="input" placeholder="Chittagong Division" />
            </div>
            <div>
              <label className="label">Thumbnail Image *</label>
              <label className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-brand-teal transition">
                <Upload size={18} className="text-gray-400" />
                <span className="text-sm text-gray-500">
                  {thumbFileRef.current?.name || (editing ? 'Replace image (optional)' : 'Click to upload *')}
                </span>
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) { thumbFileRef.current = file; setThumbPreview(URL.createObjectURL(file)) }
                  }}
                />
              </label>
              {thumbPreview && (
                <img src={thumbPreview} alt="Preview" className="mt-2 h-28 w-full object-cover rounded-lg" />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="label">Description *</label>
              <textarea {...register('description', { required: true })} rows={4} className="input"
                placeholder="Describe this destination…" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={save.isPending} className="btn-primary">
                {save.isPending ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.results?.map((d: any) => (
            <div key={d.id} className="card hover:shadow-md transition p-0 overflow-hidden">
              {d.thumbnail
                ? <img src={d.thumbnail} alt={d.name} className="w-full h-36 object-cover" />
                : <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">No image</div>
              }
              <div className="p-4 flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{d.name}</h3>
                  <p className="text-xs text-gray-500">{d.location}, {d.country}</p>
                  <p className="text-xs mt-1" style={{ color: '#0CBDB5' }}>{d.tour_count} tours</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-gray-100 rounded"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm('Delete?')) del.mutate(d.slug) }}
                    className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
