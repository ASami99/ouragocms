import { createAdminClient } from '@/lib/supabaseClient'

export async function GET(request, { params }) {
    const supabase = createAdminClient()
    const { id } = await params

    const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, items_json, total_qar, restaurant_name, status, created_at')
        .eq('id', id)
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!data) return Response.json({ error: 'Order not found' }, { status: 404 })

    return Response.json({ data })
}