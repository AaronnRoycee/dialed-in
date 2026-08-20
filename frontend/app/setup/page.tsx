'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Step = 1 | 2 | 3 | 4

export default function SetupPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [householdName, setHouseholdName] = useState('')

  const [machine, setMachine] = useState({
    name: 'Breville Barista Express',
    manufacturer: 'Breville',
    model: 'Barista Express',
  })

  const [grinder, setGrinder] = useState({
    name: 'Built-in Grinder',
    manufacturer: 'Breville',
    model: 'Barista Express',
    internalBurrSetting: 6,
  })

  const [bean, setBean] = useState({
    roaster: '',
    coffeeName: '',
    origin: '',
    roastLevel: '',
    roastDate: '',
    dateOpened: '',
    notes: '',
    skip: false,
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/auth/sign-in')
    })
  }, [router])

  const finish = async () => {
    setLoading(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not signed in')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const profileId = profile?.id
    if (!profileId) {
      setError('Profile not found')
      setLoading(false)
      return
    }

    const { data: household, error: hErr } = await supabase
      .from('households')
      .insert({ name: householdName, created_by: user.id })
      .select('id')
      .single()

    if (hErr || !household) {
      setError(hErr?.message ?? 'Could not create household')
      setLoading(false)
      return
    }

    const householdId = household.id

    await supabase.from('household_members').insert({
      household_id: householdId,
      user_id: user.id,
      role: 'owner',
    })

    await supabase
      .from('profiles')
      .update({ household_id: householdId })
      .eq('user_id', user.id)

    await supabase.from('machines').insert({
      household_id: householdId,
      name: machine.name,
      manufacturer: machine.manufacturer,
      model: machine.model,
      created_by: profileId,
    })

    await supabase.from('grinders').insert({
      household_id: householdId,
      name: grinder.name,
      manufacturer: grinder.manufacturer,
      model: grinder.model,
      internal_burr_setting: Number(grinder.internalBurrSetting),
      created_by: profileId,
    })

    if (!bean.skip) {
      await supabase.from('beans').insert({
        household_id: householdId,
        roaster: bean.roaster,
        coffee_name: bean.coffeeName,
        origin: bean.origin,
        roast_level: bean.roastLevel,
        roast_date: bean.roastDate || null,
        date_opened: bean.dateOpened || null,
        notes: bean.notes,
        created_by: profileId,
      })
    }

    setLoading(false)
    router.push('/')
  }

  const step1 = (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-espresso-100">1. Name your household</h2>
      <input
        type="text"
        placeholder="e.g. The Morning Grind"
        value={householdName}
        onChange={(e) => setHouseholdName(e.target.value)}
        className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
      />
      <button
        disabled={!householdName}
        onClick={() => setStep(2)}
        className="w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900 disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  )

  const step2 = (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-espresso-100">2. Add your espresso machine</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            setMachine({
              name: 'Breville Barista Express',
              manufacturer: 'Breville',
              model: 'Barista Express',
            })
          }
          className={`rounded-lg px-4 py-2 text-sm ${
            machine.manufacturer === 'Breville' && machine.model === 'Barista Express'
              ? 'bg-espresso-300 text-espresso-900'
              : 'bg-espresso-900 text-espresso-300'
          }`}
        >
          Breville Barista Express
        </button>
        <button
          type="button"
          onClick={() => setMachine({ name: '', manufacturer: '', model: '' })}
          className={`rounded-lg px-4 py-2 text-sm ${
            machine.manufacturer !== 'Breville'
              ? 'bg-espresso-300 text-espresso-900'
              : 'bg-espresso-900 text-espresso-300'
          }`}
        >
          Custom
        </button>
      </div>
      <input
        type="text"
        placeholder="Name"
        value={machine.name}
        onChange={(e) => setMachine({ ...machine, name: e.target.value })}
        className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
      />
      <input
        type="text"
        placeholder="Manufacturer"
        value={machine.manufacturer}
        onChange={(e) => setMachine({ ...machine, manufacturer: e.target.value })}
        className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
      />
      <input
        type="text"
        placeholder="Model"
        value={machine.model}
        onChange={(e) => setMachine({ ...machine, model: e.target.value })}
        className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
      />
      <button
        onClick={() => setStep(3)}
        className="w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900"
      >
        Continue
      </button>
    </div>
  )

  const step3 = (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-espresso-100">3. Add your grinder</h2>
      <input
        type="text"
        placeholder="Name"
        value={grinder.name}
        onChange={(e) => setGrinder({ ...grinder, name: e.target.value })}
        className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
      />
      <input
        type="text"
        placeholder="Manufacturer"
        value={grinder.manufacturer}
        onChange={(e) => setGrinder({ ...grinder, manufacturer: e.target.value })}
        className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
      />
      <input
        type="text"
        placeholder="Model"
        value={grinder.model}
        onChange={(e) => setGrinder({ ...grinder, model: e.target.value })}
        className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
      />
      <div>
        <label className="text-sm text-espresso-300">Internal burr setting</label>
        <input
          type="number"
          value={grinder.internalBurrSetting}
          onChange={(e) =>
            setGrinder({ ...grinder, internalBurrSetting: Number(e.target.value) })
          }
          className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none focus:ring-2 focus:ring-espresso-300"
        />
      </div>
      <button
        onClick={() => setStep(4)}
        className="w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900"
      >
        Continue
      </button>
    </div>
  )

  const step4 = (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-espresso-100">4. First bag of beans (optional)</h2>
      <label className="flex items-center gap-2 text-espresso-300">
        <input
          type="checkbox"
          checked={bean.skip}
          onChange={(e) => setBean({ ...bean, skip: e.target.checked })}
        />
        Skip for now
      </label>
      {!bean.skip && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Roaster"
            value={bean.roaster}
            onChange={(e) => setBean({ ...bean, roaster: e.target.value })}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
          />
          <input
            type="text"
            placeholder="Coffee name"
            value={bean.coffeeName}
            onChange={(e) => setBean({ ...bean, coffeeName: e.target.value })}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
          />
          <input
            type="text"
            placeholder="Origin"
            value={bean.origin}
            onChange={(e) => setBean({ ...bean, origin: e.target.value })}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
          />
          <select
            value={bean.roastLevel}
            onChange={(e) => setBean({ ...bean, roastLevel: e.target.value })}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none focus:ring-2 focus:ring-espresso-300"
          >
            <option value="">Roast level</option>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="medium-dark">Medium-dark</option>
            <option value="dark">Dark</option>
          </select>
          <input
            type="date"
            value={bean.roastDate}
            onChange={(e) => setBean({ ...bean, roastDate: e.target.value })}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none focus:ring-2 focus:ring-espresso-300"
          />
          <input
            type="date"
            value={bean.dateOpened}
            onChange={(e) => setBean({ ...bean, dateOpened: e.target.value })}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none focus:ring-2 focus:ring-espresso-300"
          />
          <textarea
            placeholder="Notes"
            value={bean.notes}
            onChange={(e) => setBean({ ...bean, notes: e.target.value })}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
            rows={3}
          />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={finish}
        disabled={loading}
        className="w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Finish setup'}
      </button>
    </div>
  )

  const renderStep = () => {
    switch (step) {
      case 1:
        return step1
      case 2:
        return step2
      case 3:
        return step3
      case 4:
        return step4
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-espresso-950">
      <div className="w-full max-w-md bg-espresso-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-espresso-100">Welcome to Dialed In</h1>
        <p className="mt-1 text-espresso-300">Let&apos;s set up your bench.</p>
        <div className="mt-6">{renderStep()}</div>
      </div>
    </div>
  )
}
