'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSignedUrl } from '@/lib/storage'
import PhotoManager from '@/components/PhotoManager'

type Bean = {
  id: string
  household_id: string
  roaster: string
  coffee_name: string
  origin: string | null
  roast_level: string | null
  roast_date: string | null
  date_opened: string | null
  notes: string | null
  is_active: boolean
  is_finished: boolean
  status: string | null
  created_at: string
}

type Media = {
  id: string
  storage_path: string
  is_primary: boolean
}

const beanAge = (date: string | null) => {
  if (!date) return '—'
  const start = new Date(date)
  const now = new Date()
  const days = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (days < 0) return 'not yet roasted'
  if (days === 0) return 'today'
  return `${days} day${days === 1 ? '' : 's'} old`
}

export default function BeanPassportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [bean, setBean] = useState<Bean | null>(null)
  const [primary, setPrimary] = useState<string | null>(null)
  const [shotCount, setShotCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [roaster, setRoaster] = useState('')
  const [coffeeName, setCoffeeName] = useState('')
  const [origin, setOrigin] = useState('')
  const [roastLevel, setRoastLevel] = useState('')
  const [roastDate, setRoastDate] = useState('')
  const [status, setStatus] = useState('Dialing In')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.push('/auth/sign-in')
        return
      }

      const { data } = await supabase
        .from('beans')
        .select('*')
        .eq('id', id)
        .single()

      if (!data) {
        router.push('/beans')
        return
      }

      const beanData = data as Bean
      setBean(beanData)
      setRoaster(beanData.roaster)
      setCoffeeName(beanData.coffee_name)
      setOrigin(beanData.origin ?? '')
      setRoastLevel(beanData.roast_level ?? '')
      setRoastDate(beanData.roast_date ?? '')
      setStatus(beanData.status ?? 'Dialing In')
      setNotes(beanData.notes ?? '')

      const { data: primaryMedia } = await supabase
        .from('media')
        .select('id, storage_path')
        .eq('entity_type', 'bean')
        .eq('entity_id', id)
        .eq('is_primary', true)
        .single()

      if (primaryMedia) {
        const url = await getSignedUrl(supabase, primaryMedia.storage_path)
        setPrimary(url)
      }

      const { count } = await supabase
        .from('shots')
        .select('*', { count: 'exact', head: true })
        .eq('bean_id', id)

      setShotCount(count ?? 0)
      setLoading(false)
    }

    load()
  }, [id, router])

  const refreshPrimary = async () => {
    if (!bean) return
    const { data } = await supabase
      .from('media')
      .select('id, storage_path')
      .eq('entity_type', 'bean')
      .eq('entity_id', bean.id)
      .eq('is_primary', true)
      .single()

    if (data) {
      const url = await getSignedUrl(supabase, data.storage_path)
      setPrimary(url)
    } else {
      setPrimary(null)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bean) return
    const confirmed = window.confirm('Are you sure you want to save these changes?')
    if (!confirmed) return
    setSaving(true)

    await supabase
      .from('beans')
      .update({
        roaster,
        coffee_name: coffeeName,
        origin: origin || null,
        roast_level: roastLevel || null,
        roast_date: roastDate || null,
        status: status || 'Dialing In',
        notes: notes || null,
      })
      .eq('id', bean.id)

    setSaving(false)
    window.location.reload()
  }

  const toggleFinished = async () => {
    if (!bean) return
    const confirmed = window.confirm('Are you sure you want to change the bag status?')
    if (!confirmed) return
    const next = !bean.is_finished
    await supabase
      .from('beans')
      .update({ is_finished: next, is_active: !next })
      .eq('id', bean.id)
    window.location.reload()
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-espresso-300">Loading passport...</p>
      </main>
    )
  }

  if (!bean) return null

  return (
    <main className="min-h-screen p-6 pb-24 pt-8">
      <div className="mx-auto max-w-2xl">
        <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-espresso-800 shadow-xl">
          {primary ? (
            <img
              src={primary}
              alt={bean.coffee_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-espresso-500">
              No primary photo
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-espresso-800 p-6 shadow-xl">
          {editing ? (
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-sm text-espresso-300">Roaster</label>
                <input
                  type="text"
                  value={roaster}
                  onChange={(e) => setRoaster(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-espresso-300">Bean name</label>
                <input
                  type="text"
                  value={coffeeName}
                  onChange={(e) => setCoffeeName(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-espresso-300">Origin</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-espresso-300">Roast level</label>
                <select
                  value={roastLevel}
                  onChange={(e) => setRoastLevel(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none"
                >
                  <option value="">Select</option>
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="medium-dark">Medium-dark</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-espresso-300">Roast date</label>
                <input
                  type="date"
                  value={roastDate}
                  onChange={(e) => setRoastDate(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-espresso-300">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none"
                >
                  <option value="Dialing In">Dialing In</option>
                  <option value="Dialed In">Dialed In</option>
                  <option value="Almost Empty">Almost Empty</option>
                  <option value="Finished">Finished</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-espresso-300">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none"
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl bg-espresso-900 px-4 py-3 font-semibold text-espresso-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm uppercase tracking-wide text-espresso-300">
                {bean.roaster}
              </p>
              <h1 className="text-3xl font-semibold text-espresso-100">
                {bean.coffee_name}
              </h1>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-espresso-500">Origin</p>
                  <p className="text-espresso-100">{bean.origin ?? '—'}</p>
                </div>
                <div>
                  <p className="text-espresso-500">Roast level</p>
                  <p className="text-espresso-100">{bean.roast_level ?? '—'}</p>
                </div>
                <div>
                  <p className="text-espresso-500">Roast date</p>
                  <p className="text-espresso-100">
                    {bean.roast_date ? new Date(bean.roast_date).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-espresso-500">Bean age</p>
                  <p className="text-espresso-100">{beanAge(bean.roast_date)}</p>
                </div>
                <div>
                  <p className="text-espresso-500">Status</p>
                  <p className="text-espresso-100">{bean.status ?? '—'}</p>
                </div>
                <div>
                  <p className="text-espresso-500">Shots</p>
                  <p className="text-espresso-100">{shotCount}</p>
                </div>
              </div>

              {bean.notes && (
                <p className="mt-4 text-espresso-300">{bean.notes}</p>
              )}

              <button
                onClick={() => setEditing(true)}
                className="mt-6 w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900"
              >
                Edit bean
              </button>

              <button
                onClick={toggleFinished}
                className={`mt-3 w-full rounded-xl py-3 font-semibold ${
                  bean.is_finished
                    ? 'bg-espresso-700 text-espresso-100'
                    : 'bg-espresso-900 text-espresso-100'
                }`}
              >
                {bean.is_finished ? 'Reopen this bag' : 'Mark as finished'}
              </button>
            </>
          )}
        </div>

        <PhotoManager
          householdId={bean.household_id}
          entityType="bean"
          entityId={bean.id}
          categories={['bean_bag', 'beans', 'other']}
          onUpdate={refreshPrimary}
        />
      </div>
    </main>
  )
}
