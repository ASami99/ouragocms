import { createAdminClient } from '@/lib/supabaseClient'

export async function PATCH(request, { params }) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { id } = await params

    // Update base item
    const { data: item, error } = await supabase
        .from('menu_items')
        .update({
            name: body.name,
            description: body.description,
            price: body.price,
            category_id: body.category_id,
            image_url: body.image_url,
            is_available: body.is_available,
            has_variants: body.has_variants,
            variant_label: body.variant_label,
            position: body.position,
        })
        .eq('id', id)
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Sync variants: delete old ones, then insert new ones
    if (body.has_variants !== undefined) {
        await supabase.from('item_variants').delete().eq('item_id', id)

        if (body.has_variants && body.variants?.length > 0) {
            const variantRows = body.variants.map(v => ({
                item_id: id,
                name: v.name,
                price: v.price,
                is_available: v.is_available ?? true,
            }))
            await supabase.from('item_variants').insert(variantRows)
        }
    }

    // Sync modifier groups
    if (body.modifier_group_ids !== undefined) {
        await supabase.from('item_modifier_groups').delete().eq('item_id', id)
        if (body.modifier_group_ids.length > 0) {
            const assignments = body.modifier_group_ids.map(groupId => ({
                item_id: id,
                group_id: groupId,
            }))
            await supabase.from('item_modifier_groups').insert(assignments)
        }
    }

    // Return updated item 
    const { data: fullItem } = await supabase
        .from('menu_items')
        .select('*, item_variants(*), item_modifier_groups(group_id)')
        .eq('id', id)
        .single()

    return Response.json({ data: fullItem })
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