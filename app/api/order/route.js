import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
    try {
        const orderData = await request.json()

        // Save to Supabase — matched to real column names
        const { data, error } = await supabase
            .from('orders')
            .insert({
                restaurant_id: orderData.restaurantId,
                restaurant_name: orderData.restaurantName,
                customer_name: orderData.customerName,
                customer_phone: orderData.customerPhone,
                customer_address: orderData.customerAddress,
                items_json: orderData.items,
                total_qar: orderData.totalAmount,
                status: 'pending',
                notes: orderData.notes || null,
            })
            .select()
            .single()

        if (error) throw error

        // Get restaurant email from rp_users
        const { data: restaurant } = await supabase
            .from('rp_users')
            .select('email, restaurant_name')
            .eq('restaurant_id', orderData.restaurantId)
            .single()

        // Send email notification
        if (restaurant?.email) {
            await resend.emails.send({
                from: 'OuraGo <orders@ourago.qa>',
                to: restaurant.email,
                subject: `New Order #${data.id.slice(0, 8)}`,
                html: `
                    <h2>New Order from ${orderData.customerName}</h2>
                    <p><strong>Phone:</strong> ${orderData.customerPhone}</p>
                    <p><strong>Address:</strong> ${orderData.customerAddress}</p>
                    <p><strong>Notes:</strong> ${orderData.notes || 'None'}</p>
                    <hr/>
                    <p><strong>Total: QR ${orderData.totalAmount}</strong></p>
                `,
            })
        }

        return Response.json({ success: true, orderId: data.id })
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 })
    }
}