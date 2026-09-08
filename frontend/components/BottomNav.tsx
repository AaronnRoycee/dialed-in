'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Home' },
  { href: '/beans', label: 'Beans' },
  { href: '/shots', label: 'Shots' },
  { href: '/journal', label: 'Journal' },
  { href: '/profile', label: 'Profile' },
]

export default function BottomNav() {
  const path = usePathname()

  if (
    path?.startsWith('/auth') ||
    path?.startsWith('/setup') ||
    path === '/shots/pull' ||
    path === null
  ) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-espresso-800 bg-espresso-950 px-4 pb-safe">
      <ul className="flex justify-between overflow-x-auto py-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className={`block min-h-[44px] rounded-lg px-2 py-2 text-xs font-medium whitespace-nowrap ${
                path === l.href
                  ? 'bg-espresso-800 text-espresso-100'
                  : 'text-espresso-400'
              }`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
