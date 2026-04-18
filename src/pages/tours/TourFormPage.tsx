import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Plus, Trash2, Upload, X, Calendar, Clock, Users, Image, List, Tag, Link, Pencil, Check, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { apiErrorMsg } from '@/services/api'

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
type AddMode = 'single' | 'range' | 'multi'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
  const [savedSchedules, setSavedSchedules] = useState<any[]>([])
  const [pendingSchedules, setPendingSchedules] = useState<ScheduleEntry[]>([])
  const [scheduleDate, setScheduleDate] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [multiDates, setMultiDates] = useState<string[]>([])
  const [multiDateInput, setMultiDateInput] = useState('')
  const [addMode, setAddMode] = useState<AddMode>('single')
  const [scheduleSlots, setScheduleSlots] = useState<SlotEntry[]>([])
  const [addPanelOpen, setAddPanelOpen] = useState(false)
  const [_tourId, setTourId] = useState<number | null>(null)
  // Edit state
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)
  const [editingSlots, setEditingSlots] = useState<SlotEntry[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [editingItineraryIdx, setEditingItineraryIdx] = useState<number | null>(null)

  const { data: destinations } = useQuery({
    queryKey: ['destinations-all'],
    queryFn: () => api.get('/destinations/?page_size=100').then(r => r.data.results ?? r.data),
  })

  const { register, handleSubmit, reset, control, watch } = useForm({
    defaultValues: {
      title: '', description: '', destination: '' as string | number,
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
      itinerary:  t.itinerary?.length
        ? t.itinerary.map((it: any) => ({ id: it.id ?? null, day: it.day, title: it.title, description: it.description ?? '' }))
        : [{ id: null, day: 1, title: '', description: '' }],
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
    toast.success('Date added — will save on submit.')
  }

  const addRangeToPending = () => {
    if (!rangeStart || !rangeEnd) return toast.error('Pick start and end dates.')
    if (scheduleSlots.length === 0) return toast.error('Add at least one time slot.')
    if (rangeStart > rangeEnd) return toast.error('Start date must be before end date.')
    const dates: string[] = []
    // Use local date parts to avoid UTC-shift when iterating days
    const [sy, sm, sd] = rangeStart.split('-').map(Number)
    const [ey, em, ed] = rangeEnd.split('-').map(Number)
    const cur = new Date(sy, sm - 1, sd)
    const end = new Date(ey, em - 1, ed)
    while (cur <= end) {
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      if (!pendingSchedules.some(s => s.date === iso)) dates.push(iso)
      cur.setDate(cur.getDate() + 1)
    }
    if (dates.length === 0) return toast.error('All dates in range are already staged.')
    setPendingSchedules(p => [...p, ...dates.map(d => ({ date: d, time_slots: scheduleSlots }))])
    setRangeStart(''); setRangeEnd('')
    toast.success(`${dates.length} date${dates.length > 1 ? 's' : ''} added — will save on submit.`)
  }

  const addMultiDatesToPending = () => {
    if (multiDates.length === 0) return toast.error('Add at least one date.')
    if (scheduleSlots.length === 0) return toast.error('Add at least one time slot.')
    const newDates = multiDates.filter(d => !pendingSchedules.some(s => s.date === d))
    if (newDates.length === 0) return toast.error('All selected dates are already staged.')
    setPendingSchedules(p => [...p, ...newDates.map(d => ({ date: d, time_slots: scheduleSlots }))])
    setMultiDates([])
    toast.success(`${newDates.length} date${newDates.length > 1 ? 's' : ''} added — will save on submit.`)
  }

  const addMultiDate = () => {
    if (!multiDateInput) return
    if (!multiDates.includes(multiDateInput)) setMultiDates(d => [...d, multiDateInput].sort())
    setMultiDateInput('')
  }

  const removePendingSchedule = (date: string) =>
    setPendingSchedules(p => p.filter(s => s.date !== date))

  const deleteSchedule = async (id: number) => {
    try {
      await api.delete(`/availability/schedules/${id}/`)
      setSavedSchedules(s => s.filter(s => s.id !== id))
      toast.success('Schedule removed.')
    } catch (e: any) {
      toast.error(apiErrorMsg(e, 'Could not delete schedule.'))
    }
  }

  // ── edit helpers ──────────────────────────────────────────────────────────
  const toHHmm = (t: string) => t.slice(0, 5) // "09:00:00" → "09:00"
  const fmt12 = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }
  const fmtDate = (ds: string) => {
    const d = new Date(ds + 'T00:00:00')
    return {
      mon: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: d.getDate(),
      dow: d.toLocaleDateString('en-US', { weekday: 'short' }),
      yr: d.getFullYear(),
    }
  }

  const startEdit = (sch: any) => {
    setEditingScheduleId(sch.id)
    setEditingSlots(sch.time_slots.map((s: any) => ({
      start_time: toHHmm(s.start_time),
      end_time:   toHHmm(s.end_time),
      capacity:   s.capacity,
    })))
  }
  const cancelEdit = () => { setEditingScheduleId(null); setEditingSlots([]) }

  const updateEditSlot = (i: number, key: keyof SlotEntry, val: string | number) =>
    setEditingSlots(s => s.map((sl, idx) => idx === i ? { ...sl, [key]: val } : sl))
  const removeEditSlot = (i: number) =>
    setEditingSlots(s => s.filter((_, idx) => idx !== i))
  const addEditSlot = () =>
    setEditingSlots(s => [...s, { start_time: '09:00', end_time: '17:00', capacity: 15 }])

  const saveEdit = async (sch: any) => {
    if (editingSlots.length === 0) return toast.error('Add at least one time slot.')
    setSavingEdit(true)
    try {
      // Try delete-and-recreate first (clean approach for schedules without bookings)
      let scheduleId = sch.id
      let deleteBlocked = false
      try {
        await api.delete(`/availability/schedules/${sch.id}/`)
        const res = await api.post('/availability/schedules/', { tour: sch.tour, date: sch.date })
        scheduleId = res.data.id ?? res.data.data?.id
      } catch (delErr: any) {
        if (delErr?.response?.status === 409) {
          // Schedule has bookings — update slots in-place instead
          deleteBlocked = true
        } else {
          throw delErr
        }
      }

      if (deleteBlocked) {
        // In-place update: patch existing slots, delete bookingless ones, add new ones
        const existingSlots: any[] = sch.time_slots ?? []
        // Delete existing slots that have no active bookings (server will block if protected)
        for (const existing of existingSlots) {
          try {
            await api.delete(`/availability/schedules/${sch.id}/time-slots/${existing.id}/delete`)
          } catch {
            // Slot is protected by a booking — skip (leave it)
          }
        }
        // Add the new slots
        for (const slot of editingSlots) {
          await api.post(`/availability/schedules/${sch.id}/time-slots/`, slot)
        }
        scheduleId = sch.id
        toast('Updated — some slots with active bookings were kept.', { icon: '⚠️' })
      } else {
        // Add fresh slots to the new schedule
        for (const slot of editingSlots) {
          await api.post(`/availability/schedules/${scheduleId}/time-slots/`, slot)
        }
        toast.success('Schedule updated.')
      }

      const refreshed = await api.get(`/availability/schedules/?tour=${sch.tour}&page_size=100`)
      setSavedSchedules(refreshed.data.results ?? [])
      setEditingScheduleId(null)
      setEditingSlots([])
    } catch (err: any) {
      toast.error(apiErrorMsg(err, 'Failed to update schedule.'))
    } finally {
      setSavingEdit(false)
    }
  }

  /* ── highlights / included / excluded quick-save ──────────────────── */
  const saveSectionField = async (field: 'highlights' | 'included' | 'excluded') => {
    if (!slug) return
    const values = (watch as any)(field) as { value: string }[]
    const arr = (values || []).map((v: any) => v.value).filter(Boolean)
    const fd = new FormData()
    fd.append(field, JSON.stringify(arr))
    setSavingSection(field)
    try {
      await api.patch(`/tours/${slug}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Saved.')
    } catch (e: any) {
      toast.error(apiErrorMsg(e, 'Save failed.'))
    } finally {
      setSavingSection(null)
    }
  }

  /* ── itinerary per-item save / delete ──────────────────────────────── */
  const saveItineraryItem = async (i: number) => {
    const item = (watch as any)(`itinerary.${i}`)
    if (!item.title?.trim()) return toast.error('Title is required.')
    const payload = { day: i + 1, title: item.title.trim(), description: item.description ?? '' }
    setSavingSection(`itinerary-${i}`)
    try {
      if (item.id) {
        await api.patch(`/tours/${slug}/itinerary/${item.id}/`, payload)
      } else {
        const res = await api.post(`/tours/${slug}/itinerary/`, payload)
        const newId = res.data.id ?? res.data.data?.id
        itinerary.update(i, { ...item, id: newId ?? null, ...payload })
      }
      toast.success('Item saved.')
      setEditingItineraryIdx(null)
    } catch (e: any) {
      toast.error(apiErrorMsg(e, 'Save failed.'))
    } finally {
      setSavingSection(null)
    }
  }

  const deleteItineraryItem = async (i: number) => {
    const item = (watch as any)(`itinerary.${i}`)
    if (item.id) {
      try {
        await api.delete(`/tours/${slug}/itinerary/${item.id}/`)
      } catch (e: any) {
        toast.error(apiErrorMsg(e, 'Delete failed.'))
        return
      }
    }
    itinerary.remove(i)
    if (editingItineraryIdx === i) setEditingItineraryIdx(null)
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

      // itinerary — only POST items without an id (new unsaved items)
      for (let i = 0; i < data.itinerary.length; i++) {
        const item = data.itinerary[i]
        if (!item.title || item.id) continue
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
    onError: (e: any) => toast.error(apiErrorMsg(e, 'Save failed.')),
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
            { label: 'Tour Highlights', arr: highlights, fname: 'highlights' as const },
            { label: "What's Included", arr: included,   fname: 'included'   as const },
            { label: "What's Excluded", arr: excluded,   fname: 'excluded'   as const },
          ]).map(({ label, arr, fname }) => (
            <div key={label} className="border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                {isEdit && (
                  <button type="button"
                    onClick={() => saveSectionField(fname)}
                    disabled={savingSection === fname}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-60 transition"
                    style={{ background: '#0CBDB5' }}>
                    <Check size={11} />
                    {savingSection === fname ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
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
          <div className="space-y-3">
            {itinerary.fields.map((field, i) => {
              const itemId = (field as any).id_saved ?? (watch as any)(`itinerary.${i}.id`)
              const isNew = !itemId
              const isEditingThis = editingItineraryIdx === i
              return (
                <div key={field.id}
                  className={`border rounded-xl overflow-hidden transition-all ${isEditingThis ? 'border-brand-teal shadow-sm' : isNew ? 'border-dashed border-amber-300' : 'border-gray-200'}`}>
                  {/* Card header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0 ${isNew ? 'bg-amber-400' : isEditingThis ? 'bg-brand-teal' : 'bg-gray-700'}`}
                      style={isEditingThis ? { background: '#0CBDB5' } : isNew ? {} : { background: '#0A3D3A' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {(watch as any)(`itinerary.${i}.title`) || <span className="text-gray-400 italic">Untitled day</span>}
                      </p>
                      {isNew && <p className="text-[10px] text-amber-500 font-medium">New — unsaved</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isEdit && !isEditingThis && (
                        <button type="button" onClick={() => setEditingItineraryIdx(i)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                      {isEdit && isEditingThis && (
                        <>
                          <button type="button" onClick={() => saveItineraryItem(i)}
                            disabled={savingSection === `itinerary-${i}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                            style={{ background: '#0CBDB5' }}>
                            <Check size={11} />
                            {savingSection === `itinerary-${i}` ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button" onClick={() => setEditingItineraryIdx(null)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {(!isEdit || itinerary.fields.length > 1) && (
                        <button type="button"
                          onClick={() => isEdit ? deleteItineraryItem(i) : itinerary.remove(i)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-100 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form — show when editing or on create */}
                  {(!isEdit || isEditingThis) && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50 space-y-3">
                      <Field label="Title">
                        <input {...register(`itinerary.${i}.title` as any)} className="input" placeholder="e.g. Beach Exploration" />
                      </Field>
                      <Field label="Description">
                        <textarea {...register(`itinerary.${i}.description` as any)} rows={3} className="input" placeholder="What happens on this day…" />
                      </Field>
                    </div>
                  )}
                </div>
              )
            })}
            <button type="button"
              onClick={() => itinerary.append({ id: null, day: itinerary.fields.length + 1, title: '', description: '' } as any)}
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

        {/* Availability */}
        <Section title="Availability & Time Slots" icon={Calendar}>

          {/* Booking cutoff */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Clock size={15} className="text-amber-600 shrink-0" />
            <label className="text-sm text-amber-800 font-medium whitespace-nowrap">Booking cutoff:</label>
            <input {...register('booking_cutoff_days')} type="number" min="0" className="input w-16 text-center" style={{ padding: '4px 8px' }} />
            <span className="text-sm text-amber-700">days before tour date</span>
          </div>

          {/* Stats bar */}
          {(savedSchedules.length > 0 || pendingSchedules.length > 0) && (
            <div className="flex items-center gap-3 text-sm">
              {savedSchedules.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {savedSchedules.length} saved
                </span>
              )}
              {pendingSchedules.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {pendingSchedules.length} pending
                </span>
              )}
            </div>
          )}

          {/* ── Saved dates ── */}
          {savedSchedules.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Saved Dates</p>
              {savedSchedules.map((sch: any) => {
                const { mon, day, dow, yr } = fmtDate(sch.date)
                const isEditing = editingScheduleId === sch.id
                return (
                  <div key={sch.id}
                    className={`rounded-xl border overflow-hidden transition-all ${isEditing ? 'border-brand-teal shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>

                    {/* Card header — always visible */}
                    <div className="flex items-center gap-4 px-4 py-3">
                      {/* Date badge */}
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0 text-white"
                        style={{ background: isEditing ? '#0CBDB5' : '#0A3D3A' }}>
                        <span className="text-[10px] font-bold leading-none">{mon}</span>
                        <span className="text-xl font-bold leading-none">{day}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-1">{dow} · {yr}</p>
                        {!isEditing && (
                          <div className="flex flex-wrap gap-1.5">
                            {sch.time_slots?.length > 0 ? sch.time_slots.map((s: any, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                <Clock size={10} className="text-gray-400" />
                                {fmt12(s.start_time)} – {fmt12(s.end_time)}
                                <span className="text-gray-400 ml-0.5">·</span>
                                <Users size={9} className="text-gray-400" />
                                {s.available_spots ?? s.capacity}/{s.capacity}
                              </span>
                            )) : (
                              <span className="text-xs text-gray-400 italic">No time slots</span>
                            )}
                            {sch.is_blocked && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-medium">Blocked</span>
                            )}
                          </div>
                        )}
                        {isEditing && (
                          <p className="text-xs font-medium" style={{ color: '#0CBDB5' }}>Editing time slots…</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!isEditing ? (
                          <>
                            <button type="button" onClick={() => startEdit(sch)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">
                              <Pencil size={12} /> Edit
                            </button>
                            <button type="button" onClick={() => deleteSchedule(sch.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-100 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={cancelEdit}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline edit form */}
                    {isEditing && (
                      <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50 space-y-3">
                        <div className="space-y-2">
                          {editingSlots.map((slot, i) => (
                            <div key={i} className="grid grid-cols-3 gap-2 items-end bg-white border border-gray-200 rounded-xl p-3">
                              <div>
                                <label className="label text-[11px]">Start</label>
                                <input type="time" className="input" value={slot.start_time}
                                  onChange={e => updateEditSlot(i, 'start_time', e.target.value)} />
                              </div>
                              <div>
                                <label className="label text-[11px]">End</label>
                                <input type="time" className="input" value={slot.end_time}
                                  onChange={e => updateEditSlot(i, 'end_time', e.target.value)} />
                              </div>
                              <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <label className="label text-[11px]">Capacity</label>
                                  <input type="number" min={1} className="input" value={slot.capacity}
                                    onChange={e => updateEditSlot(i, 'capacity', Number(e.target.value))} />
                                </div>
                                <button type="button" onClick={() => removeEditSlot(i)}
                                  className="p-2 hover:bg-red-50 rounded text-red-400 mb-0.5">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {editingSlots.length === 0 && (
                            <p className="text-xs text-gray-400 py-1">No time slots — add one below</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <button type="button" onClick={addEditSlot}
                            className="btn-ghost text-xs flex items-center gap-1">
                            <Plus size={12} /> Add Slot
                          </button>
                          <button type="button" onClick={() => saveEdit(sch)} disabled={savingEdit}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                            style={{ background: '#0CBDB5' }}>
                            <Check size={14} />
                            {savingEdit ? 'Saving…' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Pending dates ── */}
          {pendingSchedules.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Pending — saves on submit</p>
              <div className="space-y-1.5">
                {pendingSchedules.map((sched) => {
                  const { mon, day, dow, yr } = fmtDate(sched.date)
                  return (
                    <div key={sched.date} className="flex items-center gap-3 border border-dashed border-amber-300 rounded-xl px-3 py-2.5 bg-amber-50">
                      <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-amber-400 text-white shrink-0">
                        <span className="text-[9px] font-bold leading-none">{mon}</span>
                        <span className="text-base font-bold leading-none">{day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-amber-600">{dow} · {yr}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {sched.time_slots.map((s, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[11px]">
                              <Clock size={9} />{s.start_time} – {s.end_time} · {s.capacity} seats
                            </span>
                          ))}
                        </div>
                      </div>
                      <button type="button" onClick={() => removePendingSchedule(sched.date)}
                        className="p-1.5 text-amber-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Add dates accordion ── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button type="button"
              onClick={() => setAddPanelOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2"><Plus size={15} style={{ color: '#0CBDB5' }} /> Add Available Dates</span>
              {addPanelOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {addPanelOpen && (
              <div className="p-4 space-y-4">
                {/* Mode tabs */}
                <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium w-fit">
                  {(['single', 'range', 'multi'] as AddMode[]).map(m => (
                    <button key={m} type="button" onClick={() => setAddMode(m)}
                      className={`px-3 py-1.5 transition-colors ${addMode === m ? 'text-white' : 'text-gray-600 bg-white hover:bg-gray-50'}`}
                      style={addMode === m ? { background: '#0CBDB5' } : {}}>
                      {m === 'single' ? 'Single Date' : m === 'range' ? 'Date Range' : 'Pick Multiple'}
                    </button>
                  ))}
                </div>

                {addMode === 'single' && (
                  <div className="w-64">
                    <label className="label">Date</label>
                    <input type="date" className="input" value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      min={todayStr()} />
                  </div>
                )}

                {addMode === 'range' && (
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div>
                      <label className="label">Start Date</label>
                      <input type="date" className="input" value={rangeStart}
                        onChange={e => setRangeStart(e.target.value)}
                        min={todayStr()} />
                    </div>
                    <div>
                      <label className="label">End Date</label>
                      <input type="date" className="input" value={rangeEnd}
                        onChange={e => setRangeEnd(e.target.value)}
                        min={rangeStart || todayStr()} />
                    </div>
                    {rangeStart && rangeEnd && rangeStart <= rangeEnd && (
                      <p className="col-span-2 text-xs text-gray-500 -mt-2">
                        {Math.round((new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) / 86400000) + 1} days will be added
                      </p>
                    )}
                  </div>
                )}

                {addMode === 'multi' && (
                  <div className="space-y-2">
                    <div className="flex gap-2 max-w-sm">
                      <input type="date" className="input flex-1" value={multiDateInput}
                        onChange={e => setMultiDateInput(e.target.value)}
                        min={todayStr()} />
                      <button type="button" onClick={addMultiDate} className="btn-ghost text-sm flex items-center gap-1">
                        <Plus size={13} /> Add
                      </button>
                    </div>
                    {multiDates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {multiDates.map(d => (
                          <span key={d} className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-full">
                            {d}
                            <button type="button" onClick={() => setMultiDates(ds => ds.filter(x => x !== d))} className="hover:text-red-500">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Time slots */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0 text-[13px]">Time Slots for These Dates</label>
                    <button type="button" onClick={addSlot} className="btn-ghost text-xs flex items-center gap-1">
                      <Plus size={12} /> Add Slot
                    </button>
                  </div>
                  {scheduleSlots.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No slots yet — click "Add Slot"</p>
                  )}
                  {scheduleSlots.map((slot, i) => (
                    <div key={i} className="grid grid-cols-3 gap-3 items-end border border-gray-100 rounded-xl p-3 bg-gray-50">
                      <div><label className="label text-[11px]">Start</label>
                        <input type="time" className="input" value={slot.start_time}
                          onChange={e => updateSlot(i, 'start_time', e.target.value)} /></div>
                      <div><label className="label text-[11px]">End</label>
                        <input type="time" className="input" value={slot.end_time}
                          onChange={e => updateSlot(i, 'end_time', e.target.value)} /></div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1"><label className="label text-[11px]">Capacity</label>
                          <input type="number" min={1} className="input" value={slot.capacity}
                            onChange={e => updateSlot(i, 'capacity', Number(e.target.value))} /></div>
                        <button type="button" onClick={() => removeSlot(i)} className="p-2 hover:bg-red-50 rounded text-red-400 mb-0.5">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {scheduleSlots.length > 0 && (
                  <button type="button"
                    onClick={addMode === 'single' ? addScheduleToPending : addMode === 'range' ? addRangeToPending : addMultiDatesToPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ background: '#0CBDB5' }}>
                    <Calendar size={14} />
                    {addMode === 'single' ? 'Stage Date' : addMode === 'range' ? 'Stage All Dates in Range' : `Stage ${multiDates.length || '0'} Dates`}
                  </button>
                )}
              </div>
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
