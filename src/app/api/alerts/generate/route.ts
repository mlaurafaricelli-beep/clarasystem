import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const generated: string[] = []

    const { data: staleApprovals } = await supabase
      .from('approvals').select('*, client:clients(name)').eq('agency_id', user.id)
      .eq('status', 'pending').lt('created_at', new Date(Date.now() - 48 * 3600000).toISOString())

    for (const a of staleApprovals || []) {
      const hours = Math.round((Date.now() - new Date(a.created_at).getTime()) / 3600000)
      await supabase.from('alerts').insert({
        agency_id: user.id, client_id: a.client_id, type: 'urgent',
        message: `${(a.client as any)?.name} tiene contenido esperando aprobación hace ${hours}h: "${a.piece_name}"`,
        action_url: '/dashboard/approvals',
      })
      generated.push('stale_approval')
    }

    const { data: contracts } = await supabase.from('clients').select('*').eq('agency_id', user.id).eq('status', 'active')
      .gte('contract_ends_at', new Date().toISOString().split('T')[0])
      .lte('contract_ends_at', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])

    for (const c of contracts || []) {
      const days = Math.round((new Date(c.contract_ends_at!).getTime() - Date.now()) / 86400000)
      await supabase.from('alerts').insert({
        agency_id: user.id, client_id: c.id, type: days <= 10 ? 'urgent' : 'warning',
        message: `Contrato de ${c.name} vence en ${days} días`, action_url: '/dashboard/fichas',
      })
      generated.push('contract')
    }

    return NextResponse.json({ success: true, generated: generated.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
