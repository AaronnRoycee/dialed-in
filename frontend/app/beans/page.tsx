'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSignedUrls } from '@/lib/storage'
import BeanCard from '@/components/BeanCard'
import Link from 'next/link'

type Bean = {
  id: string
  roaster: string
  coffee_name: string
  roast_level: string | null
  roast_date: string | null
  is_active: boolean
  is_finished: boolean
}

type Media = { entity_id: string; storage_path: string }

export default function BeansPage() {
  const router = useRouter()
  const [beans, setBeans] = useState<Bean[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
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

      const { data: beanData } = await supabase
        .from('beans')
        .select('id, roaster, coffee_name, roast_level, roast_date, is_active, is_finished')
        .eq('household_id', profile.household_id)
        .order('created_at', { ascending: false })

      const items = (beanData as Bean[]) ?? []
      setBeans(items)

      if (items.length > 0) {
        const { data: mediaData } = await supabase
          .from('media')
          .select('entity_id, storage_path')
          .eq('entity_type', 'bean')
          .in(
            'entity_id',
            items.map((b) => b.id)
          )
          .eq('is_primary', true)

        const primary = (mediaData as Media[]) ?? []
        const urls = await getSignedUrls(
          supabase,
          primary.map((m) => m.storage_path)
        )
        setThumbs(
          Object.fromEntries(
            primary.map((m) => [m.entity_id, urls[m.storage_path]])
          )
        )
      }

      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-espresso-300">Loading beans...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-espresso-100">Bean Library</h1>
        <Link
          href="/beans/new"
          className="rounded-xl bg-espresso-300 px-4 py-2 font-semibold text-espresso-900"
        >
          Add bean
        </Link>
      </div>

      {beans.length === 0 ? (
        <p className="mt-8 text-espresso-400">
          No beans yet. Add your first bag to get started.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {beans.map((bean) => (
            <BeanCard key={bean.id} bean={bean} imageUrl={thumbs[bean.id] ?? null} />
          ))}
        </div>
      )}
    </main>
  )
}
