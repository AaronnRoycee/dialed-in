'use client'

import { useRouter } from 'next/navigation'

type Bean = {
  id: string
  roaster: string
  coffee_name: string
  roast_level: string | null
  roast_date: string | null
  is_active: boolean
  is_finished: boolean
}

const beanAge = (date: string | null) => {
  if (!date) return null
  const start = new Date(date)
  const now = new Date()
  const days = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (days < 0) return 'not yet roasted'
  if (days === 0) return 'today'
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function BeanCard({
  bean,
  imageUrl,
}: {
  bean: Bean
  imageUrl: string | null
}) {
  const router = useRouter()

  const status = bean.is_finished
    ? 'Finished'
    : bean.is_active
      ? 'Active'
      : 'Paused'

  const ageText = beanAge(bean.roast_date)

  return (
    <div
      onClick={() => router.push(`/beans/${bean.id}`)}
      className="cursor-pointer overflow-hidden rounded-2xl bg-espresso-800 shadow-xl"
    >
      <div className="relative h-40 w-full bg-espresso-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={bean.coffee_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-espresso-500">
            No photo
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-espresso-900/80 px-2 py-1 text-xs text-espresso-100">
          {status}
        </span>
      </div>
      <div className="p-4">
        <p className="text-sm text-espresso-300">{bean.roaster}</p>
        <h3 className="text-lg font-semibold text-espresso-100">
          {bean.coffee_name}
        </h3>
        {bean.roast_date && (
          <p className="mt-1 text-sm text-espresso-300">
            Roasted {new Date(bean.roast_date).toLocaleDateString()}
            {ageText ? ` · ${ageText}` : ''}
          </p>
        )}
        {bean.roast_level && (
          <p className="text-sm text-espresso-400">{bean.roast_level}</p>
        )}
      </div>
    </div>
  )
}
