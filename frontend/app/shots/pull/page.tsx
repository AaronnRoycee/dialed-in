'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PhotoManager from '@/components/PhotoManager'

type Bean = {
  id: string
  roaster: string
  coffee_name: string
}

type Machine = { id: string; name: string }
type Grinder = { id: string; name: string }

const nowLocal = () => {
  const d = new Date()
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

export default function LogShotPage() {
  const router = useRouter()

  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)

  const [beans, setBeans] = useState<Bean[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [grinders, setGrinders] = useState<Grinder[]>([])

  const [selectedBean, setSelectedBean] = useState('')
  const [selectedMachine, setSelectedMachine] = useState('')
  const [selectedGrinder, setSelectedGrinder] = useState('')

  const [shotDate, setShotDate] = useState(nowLocal())
  const [dose, setDose] = useState('18')
  const [targetYield, setTargetYield] = useState('36')
  const [actualYield, setActualYield] = useState('')
  const [targetTime, setTargetTime] = useState('28')
  const [actualTime, setActualTime] = useState('')
  const [externalGrind, setExternalGrind] = useState('8')
  const [internalBurr, setInternalBurr] = useState('6')
  const [comments, setComments] = useState('')
  const [rating, setRating] = useState('')
  const [drinkType, setDrinkType] = useState('')

  const [shotId, setShotId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) {
        router.push('/auth/sign-in')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, household_id')
        .eq('user_id', session.user.id)
        .single()

      if (!profile?.household_id) {
        router.push('/setup')
        return
      }

      setHouseholdId(profile.household_id)
      setProfileId(profile.id)

      const [beanData, machineData, grinderData] = await Promise.all([
        supabase
          .from('beans')
          .select('id, roaster, coffee_name')
          .eq('household_id', profile.household_id)
          .eq('is_active', true)
          .eq('is_finished', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('machines')
          .select('id, name')
          .eq('household_id', profile.household_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('grinders')
          .select('id, name')
          .eq('household_id', profile.household_id)
          .order('created_at', { ascending: false }),
      ])

      const beanItems = (beanData.data as Bean[]) ?? []
      const machineItems = (machineData.data as Machine[]) ?? []
      const grinderItems = (grinderData.data as Grinder[]) ?? []

      setBeans(beanItems)
      setMachines(machineItems)
      setGrinders(grinderItems)

      if (beanItems[0]) setSelectedBean(beanItems[0].id)
      if (machineItems[0]) setSelectedMachine(machineItems[0].id)
      if (grinderItems[0]) setSelectedGrinder(grinderItems[0].id)
    }

    load()
  }, [router])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBean || !householdId || !profileId || shotId) return
    const confirmed = window.confirm('Are you sure you want to save this shot?')
    if (!confirmed) return
    setLoading(true)
    setError(null)

    const { data, error: insertErr } = await supabase
      .from('shots')
      .insert({
        household_id: householdId,
        bean_id: selectedBean,
        machine_id: selectedMachine || null,
        grinder_id: selectedGrinder || null,
        dose_g: Number(dose),
        target_yield_g: Number(targetYield),
        actual_yield_g: actualYield ? Number(actualYield) : null,
        target_time_s: Number(targetTime),
        actual_time_s: actualTime ? Number(actualTime) : null,
        external_grind_setting: Number(externalGrind) || null,
        internal_burr_setting: Number(internalBurr) || null,
        drink_type: drinkType || null,
        created_by: profileId,
        created_at: new Date(shotDate).toISOString(),
      })
      .select('id')
      .single()

    if (insertErr || !data) {
      setLoading(false)
      setError(insertErr?.message ?? 'Could not save shot')
      return
    }

    if (rating || comments.trim()) {
      await supabase.from('taste_reviews').insert({
        shot_id: data.id,
        household_id: householdId,
        overall_rating: rating ? Number(rating) : null,
        notes: comments.trim() || null,
        reviewed_by: profileId,
      })
    }

    setLoading(false)
    setShotId(data.id)
  }

  if (!householdId) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-espresso-300">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 pb-24 pt-16">
      <h1 className="text-2xl font-semibold text-espresso-100">Log a Shot</h1>

      <form onSubmit={save} className="mt-6 max-w-xl space-y-4">
        <div>
          <label className="text-sm text-espresso-300">Bean</label>
          <select
            value={selectedBean}
            onChange={(e) => setSelectedBean(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
            required
            disabled={!!shotId}
          >
            {beans.map((b) => (
              <option key={b.id} value={b.id}>
                {b.roaster} — {b.coffee_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-espresso-300">Date & time</label>
          <input
            type="datetime-local"
            value={shotDate}
            onChange={(e) => setShotDate(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
            required
            disabled={!!shotId}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-espresso-300">Machine</label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
              disabled={!!shotId}
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
              value={selectedGrinder}
              onChange={(e) => setSelectedGrinder(e.target.value)}
              className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
              disabled={!!shotId}
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
              disabled={!!shotId}
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
              disabled={!!shotId}
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
              disabled={!!shotId}
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
              disabled={!!shotId}
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
              disabled={!!shotId}
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
              disabled={!!shotId}
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
            disabled={!!shotId}
          />
        </div>

        <div>
          <label className="text-sm text-espresso-300">Rating</label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none"
            disabled={!!shotId}
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
            disabled={!!shotId}
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
            disabled={!!shotId}
          />
        </div>

        {error && <p className="text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!!shotId || loading}
          className="w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900 disabled:opacity-50"
        >
          {loading ? 'Saving...' : shotId ? 'Shot saved' : 'Save shot'}
        </button>
      </form>

      {shotId && (
        <>
          <div className="mt-8 max-w-xl">
            <h2 className="text-xl font-semibold text-espresso-100">Photos</h2>
            <p className="mt-1 text-sm text-espresso-300">
              Add photos of the pull, puck, or latte art.
            </p>
            <PhotoManager
              householdId={householdId}
              entityType="shot"
              entityId={shotId}
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
          <button
            onClick={() => router.push('/shots')}
            className="mt-6 w-full max-w-xl rounded-xl bg-espresso-800 py-3 font-semibold text-espresso-100"
          >
            Done
          </button>
        </>
      )}
    </main>
  )
}
