import { createAdminClient } from '@/lib/supabaseClient'

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()

    const { data, error } = await supabase
        .from('modifiers')
        .insert({
            group_id: body.group_id,
            name: body.name,
            price: body.price ?? 0,
            is_available: body.is_available ?? true,
            sort_order: body.sort_order || 0,
        })
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data })
}