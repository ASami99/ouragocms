import { createAdminClient } from '@/lib/supabaseClient'

export async function PATCH(request, { params }) {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true, data })
}