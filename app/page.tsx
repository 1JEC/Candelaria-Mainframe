import { redirect } from 'next/navigation'

/**
 * Middleware already routes anonymous visitors to /login, so by the time this
 * renders the visitor is authenticated and belongs on the dashboard.
 */
export default function Home() {
  redirect('/dashboard')
}
