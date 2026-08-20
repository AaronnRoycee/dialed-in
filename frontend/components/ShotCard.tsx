'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Shot = {
  id: string
  bean_id: string
  household_id: string
  machine_id: string | null
  grinder_id: string | null
  dose_g: number
  target_yield_g: number
  actual_yield_g: number | null
  actual_time_s: number | null
  brew_ratio: number | null
  external_grind_setting: number | null
  internal_burr_setting: number | null
  drink_type: string | null
  created_at: string
  beans: { roaster: string; coffee_name: string }
  taste_reviews: { overall_rating: number | null }[]
}

export default function ShotCard({
  shot,
  imageUrl,
  isGolden,
  onLocked,
}: {
  shot: Shot
  imageUrl: string | null
  isGolden?: boolean
  onLocked?: () => void
}) {
  const [locking, setLocking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const getProfileId = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    return profile?.id ?? null
  }

  const lockRecipe = async () => {
    setLocking(true)
    setMessage(null)

    const profileId = await getProfileId()
    if (!profileId) {
      setLocking(false)
      return
    }

    const confirmed = window.confirm('Lock this shot as the Golden Recipe?')
    if (!confirmed) {
      setLocking(false)
      return
    }

    await supabase
      .from('golden_recipes')
      .update({ is_active: false })
      .eq('bean_id', shot.bean_id)
      .eq('household_id', shot.household_id)

    const { error } = await supabase.from('golden_recipes').insert({
      household_id: shot.household_id,
      bean_id: shot.bean_id,
      shot_id: shot.id,
      dose_g: shot.dose_g,
      yield_g: shot.actual_yield_g ?? shot.target_yield_g,
      brew_ratio: shot.brew_ratio,
      internal_burr_setting: shot.internal_burr_setting,
      external_grind_setting: shot.external_grind_setting,
      extraction_time_s: shot.actual_time_s,
      overall_rating: shot.taste_reviews[0]?.overall_rating ?? null,
      machine_id: shot.machine_id,
      grinder_id: shot.grinder_id,
      locked_by: profileId,
    })

    setLocking(false)
    if (error) {
      setMessage('Could not lock recipe')
      return
    }

    setMessage('Golden Recipe locked!')
    onLocked?.()
  }

  const unlockRecipe = async () => {
    setLocking(true)
    setMessage(null)

    const confirmed = window.confirm('Unlock this Golden Recipe?')
    if (!confirmed) {
      setLocking(false)
      return
    }

    await supabase
      .from('golden_recipes')
      .update({ is_active: false })
      .eq('bean_id', shot.bean_id)
      .eq('household_id', shot.household_id)
      .eq('shot_id', shot.id)

    setLocking(false)
    setMessage('Unlocked')
    onLocked?.()
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '—'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const beanName = `${shot.beans.roaster} — ${shot.beans.coffee_name}`
  const date = new Date(shot.created_at).toLocaleDateString()

  return (
    <div className="overflow-hidden rounded-2xl bg-espresso-800 shadow-xl">
      <div className="relative h-40 w-full bg-espresso-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={beanName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-espresso-500">
            No photo
          </div>
        )}
        {isGolden && (
          <span className="absolute right-2 top-2 rounded bg-yellow-600 px-2 py-1 text-xs font-semibold text-espresso-100">
            Golden Recipe
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm text-espresso-300">{beanName}</p>
        {shot.drink_type && (
          <p className="text-sm font-medium text-espresso-100">{shot.drink_type}</p>
        )}
        <p className="text-xs text-espresso-500">{date}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-espresso-500">Dose</p>
            <p className="text-espresso-100">{shot.dose_g}g</p>
          </div>
          <div>
            <p className="text-espresso-500">Time</p>
            <p className="text-espresso-100">{formatTime(shot.actual_time_s)}</p>
          </div>
          <div>
            <p className="text-espresso-500">Grind</p>
            <p className="text-espresso-100">
              Ext {shot.external_grind_setting ?? '—'} · Int {shot.internal_burr_setting ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-espresso-500">Rating</p>
            <p className="text-espresso-100">
              {shot.taste_reviews[0]?.overall_rating ?? '—'}/5
            </p>
          </div>
        </div>
        <button
          onClick={isGolden ? unlockRecipe : lockRecipe}
          disabled={locking}
          className={`mt-4 min-h-[44px] w-full rounded-xl py-3 font-semibold disabled:opacity-50 ${
            isGolden
              ? 'bg-yellow-900/50 text-yellow-100'
              : 'bg-espresso-300 text-espresso-900'
          }`}
        >
          {locking
            ? isGolden
              ? 'Unlocking...'
              : 'Locking...'
            : isGolden
              ? 'Unlock recipe'
              : 'Lock This Recipe'}
        </button>
        <Link
          href={`/shots/${shot.id}`}
          className="mt-2 block min-h-[44px] w-full rounded-xl bg-espresso-800 py-3 text-center font-semibold text-espresso-100"
        >
          Edit shot
        </Link>
        {message && (
          <p className="mt-2 text-center text-sm text-espresso-300">{message}</p>
        )}
      </div>
    </div>
  )
}
