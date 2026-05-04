import { createAdminClient } from '@/lib/supabaseClient'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  const supabase = createAdminClient()

  try {
    const orderData = await request.json()

    // 1. Save order
    const { data, error } = await supabase
      .from('orders')
      .insert({
        restaurants_id: orderData.restaurantsId,
        restaurant_name: orderData.restaurantName,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_address: orderData.customerAddress,
        items_json: orderData.items,
        total_qar: orderData.totalAmount,
        status: 'pending',
        notes: orderData.notes || null,
        order_type: orderData.orderType || 'delivery',
        payment_method: orderData.paymentMethod || 'cash',
        payment_status: 'pending',
      })
      .select('id, restaurant_name, items_json, total_qar, customer_name, customer_phone, customer_address')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // 2. Try to send email (best‑effort, never blocks)
    try {
      // Fetch restaurant email from the restaurants table
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('email')
        .eq('id', orderData.restaurantsId)
        .single()

      if (restaurant?.email) {
        const orderId = data.id
        const shortId = orderId.slice(0, 8).toUpperCase()
        const items = data.items_json // already parsed as array
        const itemsList = items
          .map(
            (item) =>
              `<li>${item.quantity}x ${item.name}${
                item.selectedVariant ? ` (${item.selectedVariant.name})` : ''
              }${
                item.selectedAddons?.length
                  ? ` + ${item.selectedAddons.map((a) => a.name).join(', ')}`
                  : ''
              } — QR ${item.totalPrice?.toFixed(2)}</li>`
          )
          .join('')
// to: restaurant.email, on line 66

        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: 'samirafiq.sohail@gmail.com',
          subject: `🛎️ New Order #${shortId} — QR ${data.total_qar}`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #E63946;">New Order Received 🔔</h2>
              <p><strong>Order ID:</strong> #${shortId}</p>
              <hr/>
              <p><strong>Customer:</strong> ${data.customer_name}</p>
              <p><strong>Phone:</strong> ${data.customer_phone}</p>
              <p><strong>Address:</strong> ${data.customer_address || 'Pickup'}</p>
              <hr/>
              <p><strong>Items:</strong></p>
              <ul>${itemsList}</ul>
              <hr/>
              <p style="font-size: 1.2rem;"><strong>Total: QR ${data.total_qar}</strong></p>
              <a href="https://ourago.qa/admin/dashboard" 
                 style="display:inline-block; margin-top:12px; padding:10px 20px; 
                        background:#E63946; color:white; border-radius:6px; 
                        text-decoration:none;">
                View Dashboard →
              </a>
            </div>
          `,
        })
      }
    } catch (emailError) {
      // Non‑fatal: log but don't fail the order
      console.error('Email notification failed:', emailError)
    }

    return Response.json({ success: true, orderId: data.id })
  } catch (error) {
    console.error('Order API error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}