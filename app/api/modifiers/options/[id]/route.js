import { createAdminClient } from '@/lib/supabaseClient'

export async function PATCH(request, { params }) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { id } = await params

    const { data, error } = await supabase
        .from('modifiers')
        .update({
            name: body.name,
            price: body.price,
            is_available: body.is_available,
            sort_order: body.sort_order,
        })
        .eq('id', id)
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data })
}

export async function DELETE(request, { params }) {
    const supabase = createAdminClient()
    const { id } = await params

    const { error } = await supabase
        .from('modifiers')
        .delete()
        .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
}