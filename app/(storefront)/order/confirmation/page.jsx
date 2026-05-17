'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './page.module.scss'

export default function ConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id') || ''
  const [orderItems, setOrderItems] = useState([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantPhone, setRestaurantPhone] = useState('')

  useEffect(() => {
    const loadOrderData = async () => {
      // 1. Try localStorage first (fresh order)
      const savedItems = localStorage.getItem('ouragocms-last-order-items')
      if (savedItems) {
        try {
          const items = JSON.parse(savedItems)
          setOrderItems(items)
          const total = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
          setTotalAmount(total)
          // Clean up localStorage
          localStorage.removeItem('ouragocms-last-order-items')
          localStorage.removeItem('ouragocms-last-order-id')
        } catch (e) {
          console.error('Failed to parse saved items:', e)
        }
      }

      // 2. Fallback: fetch from API (refresh or new tab)
      if (orderId && (!savedItems || savedItems.length === 0)) {
        try {
          const res = await fetch(`/api/orders/${orderId}`)
          const json = await res.json()
          if (json.data) {
            const items = json.data.items_json || []
            setOrderItems(items)
            setTotalAmount(json.data.total_qar || 0)
            if (json.data.restaurant_name) {
              setRestaurantName(json.data.restaurant_name)
            }
          }
        } catch (err) {
          console.error('Failed to load order from API:', err)
        }
      }

      // 3. Restaurant info fallback
      setRestaurantName(prev => prev || localStorage.getItem('ouragocms-restaurant-name') || '')
      setRestaurantPhone(prev => prev || localStorage.getItem('ouragocms-restaurant-phone') || '')
    }

    loadOrderData()
  }, [orderId])

  return (
    <div className={styles.confirmation}>
      <div className={styles.content} style={{ '--primary': '#E63946' }}>
        <div className={styles.icon}>✅</div>
        <h1>Order Confirmed!</h1>
        <p className={styles.message}>
          Thank you for ordering from {restaurantName}.
        </p>

        {orderItems.length > 0 && (
          <div className={styles.orderItems}>
            <h3>Your Order</h3>
            {orderItems.map((item, idx) => (
              <div key={idx} className={styles.orderItem}>
                <div className={styles.orderItemMain}>
                  <span className={styles.orderItemQty}>×{item.quantity}</span>
                  <div>
                    <span className={styles.orderItemName}>{item.name}</span>
                    {item.selectedVariant && (
                      <span className={styles.orderItemVariant}>{item.selectedVariant.name}</span>
                    )}
                    {item.selectedAddons?.length > 0 && (
                      <span className={styles.orderItemAddons}>
                        + {item.selectedAddons.map(a => a.name).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <span className={styles.orderItemPrice}>
                  QR {(item.totalPrice || 0).toFixed(2)}
                </span>
              </div>
            ))}
            <div className={styles.orderTotal}>
              <span>Total</span>
              <strong>QR {totalAmount.toFixed(2)}</strong>
            </div>
          </div>

        )}
        <div className={styles.orderInfo}>
          <span>Order Number: <strong>#{orderId.slice(0, 8).toUpperCase()}</strong></span>
          <span>Payment: <strong>Cash on Delivery</strong></span>
        </div>

        <p className={styles.eta}>
          🕒 Estimated preparation time: 20‑30 minutes
        </p>

        <button className={styles.backBtn} onClick={() => router.push('/')}>
          ← Back to Menu
        </button>

        {restaurantPhone && (
          <div className={styles.contactInfo}>
            Questions? Call <a href={`tel:${restaurantPhone}`}>{restaurantPhone}</a>
          </div>
        )}
      </div>
    </div>
  )
}