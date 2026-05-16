import { createAdminClient } from '@/lib/supabaseClient'

export async function PATCH(request, { params }) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { id } = await params

    const { data, error } = await supabase
        .from('modifier_groups')
        .update({
            name: body.name,
            selection_type: body.selection_type,
            is_required: body.is_required,
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
        .from('modifier_groups')
        .delete()
        .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
}