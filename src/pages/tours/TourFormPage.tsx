import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Plus, Trash2, Upload, X, Calendar, Clock, Users, Image, List, Tag, Link } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

function toSlugPreview(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/* ── helpers ───────────────────────────────────────────────────────────── */
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold flex items-center gap-2 text-gray-800 border-b pb-3">
        <Icon size={17} className="text-brand-teal" /> {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

interface SlotEntry { start_time: string; end_time: string; capacity: number }
interface ScheduleEntry { date: string; time_slots: SlotEntry[] }

/* ── main component ────────────────────────────────────────────────────── */
export default function TourFormPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const isEdit = !!slug

  const [slugDisplay, setSlugDisplay] = useState<string>('')
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [galleryPreviews, setGalleryPreviews] = useState<{ file: File; url: string }[]>([])

  // Availability state
  const [savedSchedules, setSavedSchedules] = useState<any[]>([])       // already in DB
  const [pendingSchedules, setPendingSchedules] = useState<ScheduleEntry[]>([]) // staged
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleSlots, setScheduleSlots] = useState<SlotEntry[]>([])
  const [tourId, setTourId] = useState<number | null>(null)

  const { data: destinations } = useQuery({
    queryKey: ['destinations-all'],
    queryFn: () => api.get('/destinations/?page_size=100').then(r => r.data.results ?? r.data),
  })

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      currency: 'BDT', is_active: true, is_featured: false,
      duration_days: 1, duration_hours: 0, max_group_size: 15,
      languages: 'English, Bangla',
      price_adult: '', price_child: '0', price_infant: '0',
      booking_cutoff_days: 1,
      highlights: [{ value: '' }],
      included:   [{ value: '' }],
      excluded:   [{ value: '' }],
      itinerary:  [{ day: 1, title: '', description: '' }],
      cancellation_free_hours: 24,
      cancellation_partial_percent: 50,
      cancellation_partial_hours: 12,
    },
  })

  // Live slug preview on create
  const watchedTitle = watch('title' as any, '')
  useEffect(() => {
    if (!isEdit) setSlugDisplay(toSlugPreview(watchedTitle || ''))
  }, [watchedTitle, isEdit])

  const highlights = useFieldArray({ control, name: 'highlights' as any })
  const included   = useFieldArray({ control, name: 'included'   as any })
  const excluded   = useFieldArray({ control, name: 'excluded'   as any })
  const itinerary  = useFieldArray({ control, name: 'itinerary'  as any })

  /* load existing tour on edit */
  const { data: existingTour } = useQuery({
    queryKey: ['tour-edit', slug],
    queryFn: () => api.get(`/tours/${slug}/`).then(r => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (!existingTour) return
    const t = existingTour
    setTourId(t.id)
    setSlugDisplay(t.slug ?? '')
    setThumbPreview(t.thumbnail)
    reset({
      title: t.title, description: t.description,
      destination: t.destination,
      duration_days: t.duration_days, duration_hours: t.duration_hours,
      max_group_size: t.max_group_size, languages: t.languages,
      currency: t.currency,
      price_adult: t.price_adult, price_child: t.price_child, price_infant: t.price_infant,
      booking_cutoff_days: t.booking_cutoff_days ?? 1,
      is_active: t.is_active, is_featured: t.is_featured,
      highlights: (t.highlights?.length ? t.highlights : ['']).map((v: string) => ({ value: v })),
      included:   (t.included?.length   ? t.included   : ['']).map((v: string) => ({ value: v })),
      excluded:   (t.excluded?.length   ? t.excluded   : ['']).map((v: string) => ({ value: v })),
      itinerary:  t.itinerary?.length   ? t.itinerary  : [{ day: 1, title: '', description: '' }],
      cancellation_free_hours:      t.cancellation_policy?.free_cancellation_hours     ?? 24,
      cancellation_partial_percent: t.cancellation_policy?.partial_refund_percent      ?? 50,
      cancellation_partial_hours:   t.cancellation_policy?.partial_refund_hours        ?? 12,
    })
    if (t.id) {
      api.get(`/availability/schedules/?tour=${t.id}&page_size=100`).then(r => {
        setSavedSchedules(r.data.results ?? [])
      }).catch(() => {})
    }
  }, [existingTour, reset])

  /* ── availability helpers ──────────────────────────────────────────── */
  const addSlot = () => setScheduleSlots(s => [...s, { start_time: '09:00', end_time: '17:00', capacity: 15 }])
  const removeSlot = (i: number) => setScheduleSlots(s => s.filter((_, idx) => idx !== i))
  const updateSlot = (i: number, key: keyof SlotEntry, val: string | number) =>
    setScheduleSlots(s => s.map((sl, idx) => idx === i ? { ...sl, [key]: val } : sl))

  const addScheduleToPending = () => {
    if (!scheduleDate) return toast.error('Pick a date first.')
    if (scheduleSlots.length === 0) return toast.error('Add at least one time slot.')
    if (pendingSchedules.some(s => s.date === scheduleDate)) return toast.error('Date already staged.')
    setPendingSchedules(p => [...p, { date: scheduleDate, time_slots: scheduleSlots }])
    setScheduleDate('')
    setScheduleSlots([])
    toast.success('Date added — will save on submit.')
  }

  const removePendingSchedule = (date: string) =>
    setPendingSchedules(p => p.filter(s => s.date !== date))

  const deleteSchedule = async (id: number) => {
    await api.delete(`/availability/schedules/${id}/`).catch(() => {})
    setSavedSchedules(s => s.filter(s => s.id !== id))
    toast.success('Schedule removed.')
  }

  /* ── gallery ───────────────────────────────────────────────────────── */
  const addGalleryFiles = (files: FileList | null) => {
    if (!files) return
    setGalleryPreviews(p => [...p, ...Array.from(files).map(f => ({ file: f, url: URL.createObjectURL(f) }))])
  }

  /* ── submit ────────────────────────────────────────────────────────── */
  const saveTour = useMutation({
    mutationFn: async (data: any) => {
      const fd = new FormData()
      const simple = ['title', 'description', 'destination', 'duration_days', 'duration_hours',
        'max_group_size', 'languages', 'currency', 'price_adult', 'price_child', 'price_infant',
        'booking_cutoff_days']
      simple.forEach(k => fd.append(k, data[k]))
      fd.append('is_active',   data.is_active   ? 'true' : 'false')
      fd.append('is_featured', data.is_featured ? 'true' : 'false')
      fd.append('highlights', JSON.stringify(data.highlights.map((h: any) => h.value).filter(Boolean)))
      fd.append('included',   JSON.stringify(data.included.map((h: any)   => h.value).filter(Boolean)))
      fd.append('excluded',   JSON.stringify(data.excluded.map((h: any)   => h.value).filter(Boolean)))
      if (thumbFile) fd.append('thumbnail', thumbFile)

      const res = isEdit
        ? await api.patch(`/tours/${slug}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/tours/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })

      const savedTour = res.data
      const tid = savedTour.id
      const savedSlug = savedTour.slug ?? slug
      setTourId(tid)

      // itinerary
      for (let i = 0; i < data.itinerary.length; i++) {
        const item = data.itinerary[i]
        if (!item.title) continue
        await api.post(`/tours/${savedSlug}/itinerary/`, {
          day: i + 1, title: item.title, description: item.description,
        }).catch((e: any) => console.warn('itinerary:', e?.response?.data))
      }

      // gallery
      for (const g of galleryPreviews) {
        const gfd = new FormData()
        gfd.append('image', g.file)
        await api.post(`/tours/${savedSlug}/images/`, gfd, { headers: { 'Content-Type': 'multipart/form-data' } })
          .catch((e: any) => console.warn('gallery:', e?.response?.data))
      }

      // cancellation policy
      await api.post(`/tours/${savedSlug}/cancellation-policy/`, {
        free_cancellation_hours:   data.cancellation_free_hours,
        partial_refund_percent:    data.cancellation_partial_percent,
        partial_refund_hours:      data.cancellation_partial_hours,
      }).catch(() => {})

      // pending availability schedules
      for (const sched of pendingSchedules) {
        try {
          const schRes = await api.post('/availability/schedules/', { tour: tid, date: sched.date })
          const schId = schRes.data.id
          for (const slot of sched.time_slots) {
            await api.post(`/availability/schedules/${schId}/time-slots/`, slot)
          }
        } catch (e: any) {
          console.warn('schedule error:', e?.response?.data)
        }
      }
      setPendingSchedules([])
    },
    onSuccess: () => { toast.success(isEdit ? 'Tour updated.' : 'Tour created.'); navigate('/tours') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Save failed.'),
  })

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Tour' : 'New Tour'}</h1>
        <button onClick={() => navigate('/tours')} className="btn-ghost text-sm">← Back</button>
      </div>

      <form onSubmit={handleSubmit((d) => saveTour.mutate(d))} className="space-y-5">

        {/* Basic Info */}
        <Section title="Basic Information" icon={Tag}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Tour Title *">
                <input {...register('title', { required: true })} className="input" placeholder="e.g. Cox's Bazar Sunrise Beach Tour" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <label className="label">URL Slug {isEdit ? '(auto-generated, read-only)' : '(preview)'}</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
                <Link size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-500">/tours/</span>
                <span className="text-sm font-medium text-gray-700 flex-1 break-all">
                  {slugDisplay || <span className="text-gray-400 italic">will generate from title</span>}
                </span>
                {slugDisplay && (
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(slugDisplay); toast.success('Slug copied!') }}
                    className="text-xs text-brand-teal hover:underline shrink-0">
                    Copy
                  </button>
                )}
              </div>
            </div>
            <Field label="Destination *">
              <select {...register('destination', { required: true })} className="input">
                <option value="">Select destination…</option>
                {(destinations ?? []).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Languages">
              <input {...register('languages')} className="input" placeholder="English, Bangla" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description *">
                <textarea {...register('description', { required: true })} rows={5} className="input" placeholder="Full tour description…" />
              </Field>
            </div>
          </div>
        </Section>

        {/* Pricing & Capacity */}
        <Section title="Pricing & Capacity" icon={Users}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Currency">
              <select {...register('currency')} className="input">
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </Field>
            <Field label="Adult Price *">
              <input {...register('price_adult', { required: true })} type="number" step="0.01" min="0" className="input" />
            </Field>
            <Field label="Child Price">
              <input {...register('price_child')} type="number" step="0.01" min="0" className="input" />
            </Field>
            <Field label="Infant Price">
              <input {...register('price_infant')} type="number" step="0.01" min="0" className="input" />
            </Field>
            <Field label="Duration (days)">
              <input {...register('duration_days')} type="number" min="1" className="input" />
            </Field>
            <Field label="Duration (hours)">
              <input {...register('duration_hours')} type="number" min="0" max="23" className="input" />
            </Field>
            <Field label="Max Group Size">
              <input {...register('max_group_size')} type="number" min="1" className="input" />
            </Field>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input {...register('is_active')} type="checkbox" className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input {...register('is_featured')} type="checkbox" className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Featured</span>
              </label>
            </div>
          </div>
        </Section>

        {/* Thumbnail */}
        <Section title="Thumbnail Image" icon={Image}>
          <label className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-brand-teal transition">
            <Upload size={20} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500">
              {thumbFile ? thumbFile.name : (isEdit ? 'Replace thumbnail (optional)' : 'Click to upload thumbnail *')}
            </span>
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setThumbFile(f); setThumbPreview(URL.createObjectURL(f)) } }} />
          </label>
          {thumbPreview && <img src={thumbPreview} alt="Thumbnail" className="h-40 w-full object-cover rounded-xl" />}
        </Section>

        {/* Gallery */}
        <Section title="Gallery Images" icon={Image}>
          <label className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-brand-teal transition">
            <Upload size={20} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500">Click to add gallery photos (multiple)</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addGalleryFiles(e.target.files)} />
          </label>
          {galleryPreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {galleryPreviews.map((g, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden aspect-square">
                  <img src={g.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setGalleryPreviews(p => p.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {isEdit && existingTour?.images?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Existing gallery:</p>
              <div className="grid grid-cols-4 gap-2">
                {existingTour.images.map((img: any) => (
                  <div key={img.id} className="rounded-lg overflow-hidden aspect-square">
                    <img src={img.image} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Highlights / Included / Excluded */}
        <Section title="Highlights, Inclusions & Exclusions" icon={List}>
          {([
            { label: 'Tour Highlights', arr: highlights, fname: 'highlights' },
            { label: "What's Included", arr: included,   fname: 'included'   },
            { label: "What's Excluded", arr: excluded,   fname: 'excluded'   },
          ] as const).map(({ label, arr, fname }) => (
            <div key={label}>
              <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
              <div className="space-y-2">
                {arr.fields.map((field, i) => (
                  <div key={field.id} className="flex gap-2">
                    <input {...register(`${fname}.${i}.value` as any)} className="input flex-1" placeholder="Add item…" />
                    <button type="button" onClick={() => arr.remove(i)} className="p-2 hover:bg-red-50 rounded text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => arr.append({ value: '' } as any)}
                  className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: '#0CBDB5' }}>
                  <Plus size={13} /> Add item
                </button>
              </div>
            </div>
          ))}
        </Section>

        {/* Itinerary */}
        <Section title="Day-wise Itinerary" icon={List}>
          <div className="space-y-4">
            {itinerary.fields.map((field, i) => (
              <div key={field.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: '#0A3D3A' }}>Day {i + 1}</span>
                  {itinerary.fields.length > 1 && (
                    <button type="button" onClick={() => itinerary.remove(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <Field label="Title">
                  <input {...register(`itinerary.${i}.title` as any)} className="input" placeholder="e.g. Beach Exploration" />
                </Field>
                <Field label="Description">
                  <textarea {...register(`itinerary.${i}.description` as any)} rows={3} className="input" placeholder="What happens on this day…" />
                </Field>
              </div>
            ))}
            <button type="button"
              onClick={() => itinerary.append({ day: itinerary.fields.length + 1, title: '', description: '' } as any)}
              className="btn-ghost text-sm flex items-center gap-2">
              <Plus size={15} /> Add Day
            </button>
          </div>
        </Section>

        {/* Cancellation Policy */}
        <Section title="Cancellation Policy" icon={Clock}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Free cancellation (hours before)">
              <input {...register('cancellation_free_hours')} type="number" min="0" className="input" />
            </Field>
            <Field label="Partial refund %">
              <input {...register('cancellation_partial_percent')} type="number" min="0" max="100" className="input" />
            </Field>
            <Field label="Partial refund window (hours before)">
              <input {...register('cancellation_partial_hours')} type="number" min="0" className="input" />
            </Field>
          </div>
        </Section>

        {/* Availability Calendar — inline, saved on submit */}
        <Section title="Availability Calendar & Time Slots" icon={Calendar}>
          <div className="space-y-1 mb-1">
            <p className="text-xs text-gray-500">Add available dates with time slots. They will be saved when you submit the form.</p>
          </div>

          {/* Booking cutoff */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Clock size={16} className="text-amber-600 shrink-0" />
            <label className="text-sm text-amber-800 font-medium whitespace-nowrap">Booking cutoff:</label>
            <input {...register('booking_cutoff_days')} type="number" min="0" className="input w-20 text-center"
              style={{ padding: '4px 8px' }} />
            <span className="text-sm text-amber-700">days before tour date (dates within cutoff won't appear in search)</span>
          </div>

          {/* Saved schedules (already in DB) */}
          {savedSchedules.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Saved Dates</p>
              {savedSchedules.map((sch: any) => (
                <div key={sch.id} className="flex items-center justify-between border rounded-lg px-4 py-2.5 text-sm bg-gray-50">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{sch.date}</span>
                    {sch.is_blocked && <span className="text-xs text-red-500">(Blocked)</span>}
                    <span className="text-gray-400 text-xs">
                      {sch.time_slots?.map((s: any) => `${s.start_time}–${s.end_time} (${s.capacity} seats)`).join(' · ')}
                    </span>
                  </div>
                  <button type="button" onClick={() => deleteSchedule(sch.id)} className="text-red-400 hover:text-red-600 ml-2">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending (staged, not yet saved) */}
          {pendingSchedules.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-700">Pending (will save on submit)</p>
              {pendingSchedules.map((sched) => (
                <div key={sched.date} className="flex items-center justify-between border border-dashed border-amber-400 rounded-lg px-4 py-2.5 text-sm bg-amber-50">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{sched.date}</span>
                    <span className="text-gray-500 text-xs">
                      {sched.time_slots.map(s => `${s.start_time}–${s.end_time} (${s.capacity} seats)`).join(' · ')}
                    </span>
                  </div>
                  <button type="button" onClick={() => removePendingSchedule(sched.date)} className="text-red-400 hover:text-red-600 ml-2">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add a new date */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <p className="text-sm font-medium text-gray-700">Add Available Date</p>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="label">Date</label>
                <input type="date" className="input" value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
              <button type="button" onClick={addSlot}
                className="btn-ghost text-sm flex items-center gap-1 mb-0.5">
                <Plus size={14} /> Add Slot
              </button>
            </div>

            {/* Time slots for this date */}
            {scheduleSlots.length > 0 && (
              <div className="space-y-2">
                {scheduleSlots.map((slot, i) => (
                  <div key={i} className="grid grid-cols-3 gap-3 items-end border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <div>
                      <label className="label">Start Time</label>
                      <input type="time" className="input" value={slot.start_time}
                        onChange={e => updateSlot(i, 'start_time', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">End Time</label>
                      <input type="time" className="input" value={slot.end_time}
                        onChange={e => updateSlot(i, 'end_time', e.target.value)} />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="label">Capacity</label>
                        <input type="number" min={1} className="input" value={slot.capacity}
                          onChange={e => updateSlot(i, 'capacity', Number(e.target.value))} />
                      </div>
                      <button type="button" onClick={() => removeSlot(i)}
                        className="p-2 hover:bg-red-50 rounded text-red-400 mb-0.5">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {scheduleDate && scheduleSlots.length > 0 && (
              <button type="button" onClick={addScheduleToPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: '#0CBDB5' }}>
                <Calendar size={15} /> Stage Date
              </button>
            )}
          </div>
        </Section>

        {/* Submit */}
        <div className="flex gap-3 pb-4">
          <button type="submit" disabled={saveTour.isPending} className="btn-primary px-8">
            {saveTour.isPending ? 'Saving…' : isEdit ? 'Update Tour' : 'Create Tour'}
          </button>
          <button type="button" onClick={() => navigate('/tours')} className="btn-ghost">Cancel</button>
        </div>

      </form>
    </div>
  )
}
