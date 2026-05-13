export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase-server'

export default async function RootPage() {
  try {
    const user = await getUser()
    if (user) redirect('/dashboard')
    else redirect('/auth')
  } catch {
    redirect('/auth')
  }
}
