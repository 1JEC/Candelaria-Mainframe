import type { Metadata } from 'next'
import { Inter, Newsreader, JetBrains_Mono } from 'next/font/google'
import './globals.css'

/* Families and weights mirror brand-tokens.json → font.*
   next/font needs literal arguments, so they cannot be read from the JSON at
   build time. The CSS variable names below are what the Tailwind config consumes. */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Candelaria Mainframe',
  description: 'Klantportaal van Candelaria Agency.',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="nl"
      className={`${inter.variable} ${newsreader.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
