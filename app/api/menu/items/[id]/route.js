import { createAdminClient } from '@/lib/supabaseClient'

export async function PATCH(request, { params }) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { id } = await params

    const { data, error } = await supabase
        .from('menu_items')
        .update({
            name: body.name,
            description: body.description,
            price: body.price,
            category_id: body.category_id,
            image_url: body.image_url,
            is_available: body.is_available,
            position: body.position,
        })
        .eq('id', id)
        .select('*, item_variants(*), item_addons(*)')
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data })
}

export async function DELETE(request, { params }) {
    const supabase = createAdminClient()
    const { id } = await params

    const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
}