import { createAdminClient } from '@/lib/supabaseClient'

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()

    const { data, error } = await supabase
        .from('modifier_groups')
        .insert({
            restaurants_id: body.restaurants_id,
            name: body.name,
            selection_type: body.selection_type || 'multiple',
            is_required: body.is_required ?? false,
            sort_order: body.sort_order || 0,
        })
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data })
}