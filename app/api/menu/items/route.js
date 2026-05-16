import { createAdminClient } from '@/lib/supabaseClient'

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()

    const { data, error } = await supabase
        .from('menu_items')
        .insert({
            restaurants_id: body.restaurants_id,
            category_id: body.category_id,
            name: body.name,
            description: body.description,
            price: body.price,
            image_url: body.image_url,
            is_available: body.is_available,
            position: body.position || 0,
        })
        .select('*, item_variants(*), item_addons(*)')
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data })
}