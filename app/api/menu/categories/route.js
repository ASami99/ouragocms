import { createAdminClient } from '@/lib/supabaseClient'

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()

    const { data, error } = await supabase
        .from('menu_categories')
        .insert({
            restaurants_id: body.restaurants_id,
            name: body.name,
            description: body.description,
            position: body.position || 0,
            is_visible: true,
        })
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data })
}