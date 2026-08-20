'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Bean = {
  id: string
  roaster: string
  coffee_name: string
}

type Shot = {
  dose_g: number
  actual_yield_g: number | null
  brew_ratio: number | null
  created_at: string
  bean_id: string
  beans: Bean
  taste_reviews: { overall_rating: number | null }[]
}

export default function LabPage() {
  const router = useRouter()
  const [shots, setShots] = useState<Shot[]>([])
  const [loading, setLoading] = useState(true)

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
        .select('household_id')
        .eq('user_id', session.user.id)
        .single()

      if (!profile?.household_id) {
        router.push('/setup')
        return
      }

      const { data } = await supabase
        .from('shots')
        .select(
          'dose_g, actual_yield_g, brew_ratio, created_at, bean_id, beans(coffee_name, roaster), taste_reviews(overall_rating)'
        )
        .eq('household_id', profile.household_id)
        .order('created_at', { ascending: false })

      setShots((data as unknown as Shot[]) ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  const stats = useMemo(() => {
    const now = new Date()
    const total = shots.length
    const thisMonth = shots.filter((s) => {
      const d = new Date(s.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    const avgDose =
      total > 0 ? shots.reduce((a, s) => a + s.dose_g, 0) / total : null
    const yields = shots
      .map((s) => s.actual_yield_g)
      .filter((v): v is number => v !== null)
    const avgYield =
      yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : null
    const ratios = shots
      .map((s) => s.brew_ratio)
      .filter((v): v is number => v !== null)
    const avgRatio =
      ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null

    const ratings = shots
      .flatMap((s) => s.taste_reviews)
      .map((r) => r.overall_rating)
      .filter((v): v is number => v !== null)
    const avgRating =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

    const beanCounts: Record<string, { bean: Bean; count: number }> = {}
    const beanRatings: Record<string, { bean: Bean; total: number; count: number }> = {}

    shots.forEach((s) => {
      const bean = s.beans
      if (!beanCounts[bean.id]) beanCounts[bean.id] = { bean, count: 0 }
      beanCounts[bean.id].count += 1

      const rating = s.taste_reviews[0]?.overall_rating ?? null
      if (rating !== null) {
        if (!beanRatings[bean.id]) beanRatings[bean.id] = { bean, total: 0, count: 0 }
        beanRatings[bean.id].total += rating
        beanRatings[bean.id].count += 1
      }
    })

    const mostUsed = Object.values(beanCounts).sort((a, b) => b.count - a.count)[0]
    const highestRated = Object.values(beanRatings)
      .filter((b) => b.count > 0)
      .sort((a, b) => b.total / b.count - a.total / a.count)[0]

    return {
      total,
      thisMonth,
      avgDose,
      avgYield,
      avgRatio,
      avgRating,
      mostUsed,
      highestRated,
    }
  }, [shots])

  const fmt = (n: number | null, digits = 1) =>
    n === null ? '—' : n.toFixed(digits)

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-espresso-300">Loading dashboard...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 pb-28">
      <h1 className="text-2xl font-semibold text-espresso-100">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-espresso-800 p-4 text-center shadow-xl">
          <p className="text-3xl font-bold text-espresso-100">{stats.total}</p>
          <p className="text-xs text-espresso-500">Total shots</p>
        </div>
        <div className="rounded-2xl bg-espresso-800 p-4 text-center shadow-xl">
          <p className="text-3xl font-bold text-espresso-100">
            {stats.thisMonth}
          </p>
          <p className="text-xs text-espresso-500">Shots this month</p>
        </div>
        <div className="rounded-2xl bg-espresso-800 p-4 text-center shadow-xl">
          <p className="text-3xl font-bold text-espresso-100">
            {fmt(stats.avgDose)}
          </p>
          <p className="text-xs text-espresso-500">Avg dose (g)</p>
        </div>
        <div className="rounded-2xl bg-espresso-800 p-4 text-center shadow-xl">
          <p className="text-3xl font-bold text-espresso-100">
            {fmt(stats.avgYield)}
          </p>
          <p className="text-xs text-espresso-500">Avg yield (g)</p>
        </div>
        <div className="rounded-2xl bg-espresso-800 p-4 text-center shadow-xl">
          <p className="text-3xl font-bold text-espresso-100">
            {fmt(stats.avgRatio)}
          </p>
          <p className="text-xs text-espresso-500">Avg ratio</p>
        </div>
        <div className="rounded-2xl bg-espresso-800 p-4 text-center shadow-xl">
          <p className="text-3xl font-bold text-espresso-100">
            {fmt(stats.avgRating)}
          </p>
          <p className="text-xs text-espresso-500">Avg rating</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-espresso-800 p-5 shadow-xl">
          <p className="text-sm text-espresso-500">Most-used bean</p>
          <p className="text-xl font-semibold text-espresso-100">
            {stats.mostUsed
              ? `${stats.mostUsed.bean.roaster} — ${stats.mostUsed.bean.coffee_name}`
              : '—'}
          </p>
          <p className="text-sm text-espresso-400">
            {stats.mostUsed ? `${stats.mostUsed.count} shots` : ''}
          </p>
        </div>
        <div className="rounded-2xl bg-espresso-800 p-5 shadow-xl">
          <p className="text-sm text-espresso-500">Highest-rated bean</p>
          <p className="text-xl font-semibold text-espresso-100">
            {stats.highestRated
              ? `${stats.highestRated.bean.roaster} — ${stats.highestRated.bean.coffee_name}`
              : '—'}
          </p>
          <p className="text-sm text-espresso-400">
            {stats.highestRated
              ? `${(stats.highestRated.total / stats.highestRated.count).toFixed(1)} / 5`
              : ''}
          </p>
        </div>
      </div>
    </main>
  )
}
