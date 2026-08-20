import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import BackButton from '@/components/BackButton'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'Dialed In',
  description: 'Personal espresso dial-in, shot tracking, and coffee journal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Dialed In',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#1c1614',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-espresso-950 text-espresso-100 antialiased min-h-screen">
        <BackButton />
        {children}
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
