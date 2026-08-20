'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  const pathname = usePathname()

  if (
    pathname?.startsWith('/auth') ||
    pathname === '/setup' ||
    pathname === '/'
  ) {
    return null
  }

  return (
    <button
      onClick={() => router.back()}
      aria-label="Back"
      className="fixed left-4 top-4 z-40 min-h-[44px] min-w-[44px] rounded-full bg-espresso-800/80 p-3 text-espresso-100 shadow-lg backdrop-blur"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 19.5 8.25 12l7.5-7.5"
        />
      </svg>
    </button>
  )
}
