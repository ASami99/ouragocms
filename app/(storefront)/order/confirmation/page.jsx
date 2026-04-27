'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.scss'

export default function ConfirmationPage() {
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')
  const [restaurantColor, setRestaurantColor] = useState('#E63946')
  const [restaurantName, setRestaurantName] = useState('Restaurant')
  const [restaurantPhone, setRestaurantPhone] = useState('')

  useEffect(() => {
    // Generate order number
    const randomOrder = Math.random().toString(36).substring(2, 10).toUpperCase()
    setOrderNumber(randomOrder)

    // Get restaurant info from localStorage
    const savedColor = localStorage.getItem('ouragocms-restaurant-color')
    if (savedColor) setRestaurantColor(savedColor)

    const savedName = localStorage.getItem('ouragocms-restaurant-name')
    if (savedName) setRestaurantName(savedName)

    const savedPhone = localStorage.getItem('ouragocms-restaurant-phone')
    if (savedPhone) setRestaurantPhone(savedPhone)
  }, [])

  return (
    <div className={styles.confirmation}>
      <div className={styles.content} style={{ '--primary': restaurantColor }}>
        <div className={styles.icon}>✅</div>

        <h1>Order Confirmed!</h1>

        <p className={styles.message}>
          Thank you for ordering from {restaurantName}.
          Your order has been received.
        </p>

        <div className={styles.orderInfo}>
          <span>
            Order Number
            <strong className={styles.orderNumber}>#{orderNumber}</strong>
          </span>
          <span>
            Payment Method
            <strong>Cash on Delivery</strong>
          </span>
          <span>
            Estimated Time
            <strong>20-30 mins</strong>
          </span>
        </div>

        <p className={styles.eta}>
          The restaurant will call you to confirm your order.
        </p>

        <button
          className={styles.backBtn}
          onClick={() => router.push('/')}
          style={{ background: restaurantColor }}
        >
          ← Back to Menu
        </button>

        {restaurantPhone && (
          <div className={styles.contactInfo}>
            Questions? Call{' '}
            <a href={`tel:${restaurantPhone}`}>{restaurantPhone}</a>
          </div>
        )}
      </div>
    </div>
  )
}