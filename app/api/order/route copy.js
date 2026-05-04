// import { createAdminClient } from '@/lib/supabaseClient'
// import { Resend } from 'resend'

// const resend = new Resend(process.env.RESEND_API_KEY)

// export async function POST(request) {
//     const supabase = createAdminClient()

//     try {
//         const orderData = await request.json()

//         // Save order — now uses restaurants_id (uuid FK to restaurants table)
//         // We also keep restaurant_id (text) for backward compat during transition
//         const { data, error } = await supabase
//             .from('orders')
//             .insert({
//                 restaurants_id: orderData.restaurantsId,       // new uuid FK
//                 restaurant_id: orderData.restaurantId,         // keep old text field during transition
//                 restaurant_name: orderData.restaurantName,
//                 customer_name: orderData.customerName,
//                 customer_phone: orderData.customerPhone,
//                 customer_address: orderData.customerAddress,
//                 items_json: orderData.items,
//                 total_qar: orderData.totalAmount,
//                 status: 'pending',
//                 notes: orderData.notes || null,
//                 order_type: orderData.orderType || 'delivery',
//                 payment_method: orderData.paymentMethod || 'cash',
//                 payment_status: 'pending',
//             })
//             .select()
//             .single()

//         if (error) throw error

//         // Get restaurant owner email via rp_users → linked to restaurants table
//         const { data: rpUser } = await supabase
//             .from('rp_users')
//             .select('auth_user_id')
//             .eq('restaurants_id', orderData.restaurantsId)
//             .single()

//         const { data: { user } } = await supabase.auth.admin.getUserById(rpUser.auth_user_id)

//         // Send email notification
//         if (user?.email) {
//             await resend.emails.send({
//                 from: 'OuraGo <orders@ourago.qa>',
//                 to: user.email,
//                 subject: `New Order #${data.id.slice(0, 8).toUpperCase()}`,
//                 html: `
//                     <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
//                         <h2 style="color: #E63946;">New Order Received 🔔</h2>
//                         <p><strong>Order ID:</strong> #${data.id.slice(0, 8).toUpperCase()}</p>
//                         <hr/>
//                         <p><strong>Customer:</strong> ${orderData.customerName}</p>
//                         <p><strong>Phone:</strong> ${orderData.customerPhone}</p>
//                         <p><strong>Address:</strong> ${orderData.customerAddress || 'Pickup'}</p>
//                         ${orderData.notes ? `<p><strong>Notes:</strong> ${orderData.notes}</p>` : ''}
//                         <hr/>
//                         <p style="font-size: 1.2rem;"><strong>Total: QR ${orderData.totalAmount}</strong></p>
//                         <a href="https://ourago.qa/admin/dashboard" 
//                            style="display:inline-block; margin-top:12px; padding:10px 20px; 
//                                   background:#E63946; color:white; border-radius:6px; 
//                                   text-decoration:none;">
//                             View Dashboard →
//                         </a>
//                     </div>
//                 `,
//             })
//         }

//         return Response.json({ success: true, orderId: data.id })
//     } catch (error) {
//         console.error('Order API error:', error)
//         return Response.json({ error: error.message }, { status: 500 })
//     }
// }