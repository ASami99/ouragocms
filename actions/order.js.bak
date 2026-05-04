'use server'

import { createAdminClient } from '@/lib/supabaseClient'
import { Resend } from 'resend'
import { headers } from 'next/headers'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function submitOrder(formData) {
    const headersList = await headers()

    const restaurantId = headersList.get('x-restaurant-id')
    const restaurantName = headersList.get('x-restaurant-name')
    const restaurantEmail = headersList.get('x-restaurant-email')

    // Parse cart from form
    const cartRaw = formData.get('cart')
    if (!cartRaw) throw new Error('Cart is empty')

    const cartItems = JSON.parse(cartRaw)
    if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty')

    const customerName = formData.get('customer_name')?.trim()
    const customerPhone = formData.get('customer_phone')?.trim()

    if (!customerName || !customerPhone) {
        throw new Error('Name and phone are required')
    }

    // Calculate total
    const totalQar = cartItems.reduce(
        (sum, item) => sum + Number(item.price_qar) * item.qty,
        0
    )

    // Build human-readable item list
    const itemLines = cartItems
        .map(
            (i) =>
                `  • ${i.name} × ${i.qty}  —  QR ${(Number(i.price_qar) * i.qty).toFixed(2)}`
        )
        .join('\n')

    const orderSummary = `
NEW ORDER — ${restaurantName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Customer : ${customerName}
Phone    : ${customerPhone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL    : QR ${totalQar.toFixed(2)}
Payment  : Cash on Delivery
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim()

    // 1. Save order to Supabase
    const supabase = createAdminClient()
    const { data: order, error: dbError } = await supabase
        .from('orders')
        .insert({
            restaurant_id: restaurantId,
            customer_name: customerName,
            customer_phone: customerPhone,
            items_json: cartItems,
            total_qar: totalQar,
            status: 'new',
        })
        .select()
        .single()

    if (dbError) {
        console.error('Order DB error:', dbError)
        throw new Error('Could not save order. Please try again.')
    }

    // 2. Send email to restaurant via Resend
    if (restaurantEmail) {
        try {
            await resend.emails.send({
                from: 'OuraGo Orders <orders@ourago.qa>',
                to: restaurantEmail,
                subject: `🛎️ New Order — QR ${totalQar.toFixed(2)} from ${customerName}`,
                text: orderSummary,
                html: `
          <div style="font-family:monospace;white-space:pre;background:#f9f9f9;padding:24px;border-radius:8px;border:1px solid #eee">
${orderSummary}
          </div>
        `,
            })
        } catch (emailErr) {
            // Non-fatal — order is saved, email is best-effort
            console.error('Resend error:', emailErr)
        }
    }

    return {
        success: true,
        orderId: order.id,
        total: totalQar,
    }
}