import { createAdminClient } from '@/lib/supabaseClient'

export async function PATCH(request, { params }) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { id } = await params

    // Only allow editing of these specific fields
    const { data, error } = await supabase
        .from('restaurants')
        .update({
            name: body.name,
            phone: body.phone,
            email: body.email,
            address: body.address,
            logo_url: body.logo_url,
            social_links: body.social_links,
            is_accepting_orders: body.is_accepting_orders,
            opening_hours: body.opening_hours,
        })
        .eq('id', id)
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data })
}