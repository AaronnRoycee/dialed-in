'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PhotoManager from '@/components/PhotoManager'

type Bean = { id: string; roaster: string; coffee_name: string }
type Machine = { id: string; name: string }
type Grinder = { id: string; name: string }

type TasteReview = { id: string; notes: string | null; overall_rating: number | null }

type Shot = {
  id: string
  household_id: string
  bean_id: string
  beans: Bean
  machine_id: string | null
  grinder_id: string | null
  dose_g: number
  target_yield_g: number
  actual_yield_g: number | null
  target_time_s: number
  actual_time_s: number | null
  external_grind_setting: number | null
  internal_burr_setting: number | null
  drink_type: string | null
  created_at: string
  taste_reviews: TasteReview[]
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

export default function ShotDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [shot, setShot] = useState<Shot | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [grinders, setGrinders] = useState<Grinder[]>([])

  const [machineId, setMachineId] = useState('')
  const [grinderId, setGrinderId] = useState('')
  const [dose, setDose] = useState('')
  const [targetYield, setTargetYield] = useState('')
  const [actualYield, setActualYield] = useState('')
  const [targetTime, setTargetTime] = useState('')
  const [actualTime, setActualTime] = useState('')
  const [externalGrind, setExternalGrind] = useState('')
  const [internalBurr, setInternalBurr] = useState('')
  const [shotDate, setShotDate] = useState('')
  const [comments, setComments] = useState('')
  const [rating, setRating] = useState('')
  const [drinkType, setDrinkType] = useState('')

  useEffect(() => {
    if (!id) {
      router.push('/shots')
      return
    }

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) {
        router.push('/auth/sign-in')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('user_id', session.user.id)
        .single()

      if (!profile?.household_id) {
        router.push('/setup')
        return
      }

      const [shotData, machineData, grinderData] = await Promise.all([
        supabase
          .from('shots')
          .select(
            'id, household_id, bean_id, machine_id, grinder_id, dose_g, target_yield_g, actual_yield_g, target_time_s, actual_time_s, external_grind_setting, internal_burr_setting, drink_type, created_at, beans(id, roaster, coffee_name), taste_reviews(id, notes, overall_rating)'
          )
          .eq('id', id)
          .eq('household_id', profile.household_id)
          .single(),
        supabase
          .from('machines')
          .select('id, name')
          .eq('household_id', profile.household_id),
        supabase
          .from('grinders')
          .select('id, name')
          .eq('household_id', profile.household_id),
      ])

      if (shotData.error || !shotData.data) {
        router.push('/shots')
        return
      }

      const shotItem = shotData.data as unknown as Shot
      setShot(shotItem)
      setMachines((machineData.data as Machine[]) ?? [])
      setGrinders((grinderData.data as Grinder[]) ?? [])

      setMachineId(shotItem.machine_id ?? '')
      setGrinderId(shotItem.grinder_id ?? '')
      setDose(String(shotItem.dose_g))
      setTargetYield(String(shotItem.target_yield_g))
      setActualYield(shotItem.actual_yield_g !== null ? String(shotItem.actual_yield_g) : '')
      setTargetTime(String(shotItem.target_time_s))
      setActualTime(shotItem.actual_time_s !== null ? String(shotItem.actual_time_s) : '')
      setExternalGrind(shotItem.external_grind_setting !== null ? String(shotItem.external_grind_setting) : '')
      setInternalBurr(shotItem.internal_burr_setting !== null ? String(shotItem.internal_burr_setting) : '')
      setShotDate(toLocalInput(shotItem.created_at))
      setComments(shotItem.taste_reviews[0]?.notes ?? '')
      setRating(shotItem.taste_reviews[0]?.overall_rating !== null && shotItem.taste_reviews[0]?.overall_rating !== undefined ? String(shotItem.taste_reviews[0].overall_rating) : '')
      setDrinkType(shotItem.drink_type ?? '')

      setLoading(false)
    }

    load()
  }, [id, router])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shot) return

    const confirmed = window.confirm('Are you sure you want to save these changes?')
    if (!confirmed) return

    setSaving(true)
    setError(null)

    const { error: updateErr } = await supabase
      .from('shots')
      .update({
        machine_id: machineId || null,
        grinder_id: grinderId || null,
        dose_g: Number(dose),
        target_yield_g: Number(targetYield),
        actual_yield_g: actualYield ? Number(actualYield) : null,
        target_time_s: Number(targetTime),
        actual_time_s: actualTime ? Number(actualTime) : null,
        external_grind_setting: externalGrind ? Number(externalGrind) : null,
        internal_burr_setting: internalBurr ? Number(internalBurr) : null,
        drink_type: drinkType || null,
        created_at: new Date(shotDate).toISOString(),
      })
      .eq('id', shot.id)

    if (updateErr) {
      setSaving(false)
      setError(updateErr.message)
      return
    }

    const review = shot.taste_reviews[0]
    const nextRating = rating ? Number(rating) : null
    const nextNotes = comments.trim() || null
    if (review) {
      await supabase
        .from('taste_reviews')
        .update({ overall_rating: nextRating, notes: nextNotes })
        .eq('id', review.id)
    } else if (nextRating !== null || nextNotes) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id ?? '')
        .single()

      if (profile?.id) {
        await supabase.from('taste_reviews').insert({
          shot_id: shot.id,
          household_id: shot.household_id,
          overall_rating: nextRating,
          notes: nextNotes,
          reviewed_by: profile.id,
        })
      }
    }

    setSaving(false)
    window.location.reload()
  }

  const remove = async () => {
    if (!shot) return
    const confirmed = window.confirm(
      'Delete this shot and all its photos and reviews? This cannot be undone.'
    )
    if (!confirmed) return

    const { data: mediaData } = await supabase
      .from('media')
      .select('storage_path')
      .eq('entity_type', 'shot')
      .eq('entity_id', shot.id)

    const paths = ((mediaData as { storage_path: string }[]) ?? []).map(
      (m) => m.storage_path
    )
    if (paths.length > 0) {
      await supabase.storage.from('media').remove(paths)
      await supabase
        .from('media')
        .delete()
        .eq('entity_type', 'shot')
        .eq('entity_id', shot.id)
    }

    await supabase.from('taste_reviews').delete().eq('shot_id', shot.id)
    await supabase.from('shots').delete().eq('id', shot.id)

    router.push('/shots')
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-espresso-300">Loading shot...</p>
      </main>
    )
  }

  if (!shot) return null

  return (
    <main className="min-h-screen p-6 pb-24 pt-16">
      <h1 className="text-2xl font-semibold text-espresso-100">
        Edit shot — {shot.beans.roaster} {shot.beans.coffee_name}
      </h1>

      <form onSubmit={save} className="mt-6 max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-espresso-300">Machine</label>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
            >
              <option value="">None</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-espresso-300">Grinder</label>
            <select
              value={grinderId}
              onChange={(e) => setGrinderId(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
            >
              <option value="">N/A</option>
              {grinders.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm text-espresso-300">Date & time</label>
          <input
            type="datetime-local"
            value={shotDate}
            onChange={(e) => setShotDate(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-espresso-300">Dose in (g)</label>
            <input
              type="number"
              step="0.1"
              min={0.1}
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-sm text-espresso-300">Target yield (g)</label>
            <input
              type="number"
              step="0.1"
              min={0.1}
              value={targetYield}
              onChange={(e) => setTargetYield(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-espresso-300">Actual yield (g)</label>
            <input
              type="number"
              step="0.1"
              min={0.1}
              value={actualYield}
              onChange={(e) => setActualYield(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-espresso-300">Target time (s)</label>
            <input
              type="number"
              step="1"
              min={1}
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-espresso-300">Actual time (s)</label>
            <input
              type="number"
              step="0.1"
              min={0.1}
              value={actualTime}
              onChange={(e) => setActualTime(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-espresso-300">External grind</label>
            <input
              type="number"
              step="0.5"
              value={externalGrind}
              onChange={(e) => setExternalGrind(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-espresso-300">Internal burr setting</label>
          <input
            type="number"
            step="1"
            value={internalBurr}
            onChange={(e) => setInternalBurr(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-espresso-300">Rating</label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
          >
            <option value="">No rating</option>
            <option value="1">1 — Poor</option>
            <option value="2">2 — Fair</option>
            <option value="3">3 — Good</option>
            <option value="4">4 — Very good</option>
            <option value="5">5 — Excellent</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-espresso-300">Drink type</label>
          <input
            type="text"
            value={drinkType}
            onChange={(e) => setDrinkType(e.target.value)}
            placeholder="Espresso, Latte, etc."
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 placeholder-espresso-500 outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-espresso-300">Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Tasting notes, observations, etc."
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 placeholder-espresso-500 outline-none"
            rows={4}
          />
        </div>

        {error && <p className="text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>

        <button
          type="button"
          onClick={remove}
          className="min-h-[44px] w-full rounded-xl bg-red-900 py-3 font-semibold text-red-100"
        >
          Delete shot
        </button>
      </form>

      <div className="mt-8 max-w-xl">
        <h2 className="text-xl font-semibold text-espresso-100">Photos</h2>
        <PhotoManager
          householdId={shot.household_id}
          entityType="shot"
          entityId={shot.id}
          categories={[
            'espresso',
            'latte_art',
            'puck_before',
            'puck_after',
            'equipment',
            'other',
          ]}
        />
      </div>
    </main>
  )
}
