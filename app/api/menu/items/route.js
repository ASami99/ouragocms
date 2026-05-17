import { createAdminClient } from '@/lib/supabaseClient'

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()

    // Insert base item
    const { data: item, error } = await supabase
        .from('menu_items')
        .insert({
            restaurants_id: body.restaurants_id,
            category_id: body.category_id,
            name: body.name,
            description: body.description,
            price: body.price,
            image_url: body.image_url,
            is_available: body.is_available,
            has_variants: body.has_variants || false,
            variant_label: body.variant_label || null,
            position: body.position || 0,
        })
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Insert variants if provided
    if (body.has_variants && body.variants?.length > 0) {
        const variantRows = body.variants.map(v => ({
            item_id: item.id,
            name: v.name,
            price: v.price,
            is_available: v.is_available ?? true,
        }))
        await supabase.from('item_variants').insert(variantRows)
    }

    // Insert modifier group assignments
    if (body.modifier_group_ids?.length > 0) {
        const assignments = body.modifier_group_ids.map(groupId => ({
            item_id: item.id,
            group_id: groupId,
        }))
        await supabase.from('item_modifier_groups').insert(assignments)
    }

    // Return item with variants
    const { data: fullItem } = await supabase
        .from('menu_items')
        .select('*, item_variants(*), item_modifier_groups(group_id)')
        .eq('id', item.id)
        .single()

    return Response.json({ data: fullItem })
}