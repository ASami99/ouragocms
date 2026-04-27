'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.scss'

export default function CartPage() {
    const router = useRouter()
    const [cart, setCart] = useState([])
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [customerAddress, setCustomerAddress] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('ouragocms-cart')
        if (savedCart) {
            setCart(JSON.parse(savedCart))
        }
    }, [])

    // Save cart to localStorage when updated
    const updateCart = (newCart) => {
        setCart(newCart)
        localStorage.setItem('ouragocms-cart', JSON.stringify(newCart))
    }

    const updateQuantity = (cartKey, newQuantity) => {
        if (newQuantity < 1) {
            removeItem(cartKey)
        } else {
            const updated = cart.map(item => {
                if (item.cartKey === cartKey) {
                    const newTotal = (item.unitPrice + (item.selectedAddons?.reduce((s, a) => s + a.priceQar, 0) || 0)) * newQuantity
                    return { ...item, quantity: newQuantity, totalPrice: newTotal }
                }
                return item
            })
            updateCart(updated)
        }
    }

    const removeItem = (cartKey) => {
        const updated = cart.filter(item => item.cartKey !== cartKey)
        updateCart(updated)
    }

    const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0)
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        const orderData = {
            customerName,
            customerPhone,
            customerAddress,
            items: cart,
            totalAmount,
            totalItems,
            restaurantId: cart[0]?.restaurant?._ref || cart[0]?.restaurantId,
            restaurantName: localStorage.getItem('ouragocms-restaurant-name') || 'Restaurant',
            orderDate: new Date().toISOString(),
        }

        // TODO: Submit to Supabase + Send notifications
        console.log('Order submitted:', orderData)

        // Clear cart and redirect
        localStorage.removeItem('ouragocms-cart')
        router.push('/order/confirmation')
    }

    if (cart.length === 0) {
        return (
            <div className={styles.emptyCart}>
                <h2>Your cart is empty</h2>
                <button onClick={() => router.back()}>← Back to Menu</button>
            </div>
        )
    }

    return (
        <div className={styles.cartPage}>
            <h1>Your Order</h1>

            <div className={styles.cartItems}>
                {cart.map((item) => (
                    <div key={item.cartKey} className={styles.cartItem}>
                        <div className={styles.itemInfo}>
                            <span className={styles.itemQuantity}>{item.quantity}×</span>
                            <div className={styles.itemDetails}>
                                <span className={styles.itemName}>{item.name}</span>
                                {item.selectedVariant && (
                                    <span className={styles.itemVariant}>{item.selectedVariant.name}</span>
                                )}
                                {item.selectedAddons?.length > 0 && (
                                    <span className={styles.itemAddons}>
                                        + {item.selectedAddons.map(a => a.name).join(', ')}
                                    </span>
                                )}
                                {item.specialInstructions && (
                                    <span className={styles.itemNote}>📝 {item.specialInstructions}</span>
                                )}
                            </div>
                        </div>
                        <div className={styles.itemActions}>
                            <span className={styles.itemPrice}>QR {item.totalPrice.toFixed(2)}</span>
                            <div className={styles.quantityControl}>
                                <button onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}>−</button>
                                <span>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}>+</button>
                            </div>
                            <button className={styles.removeBtn} onClick={() => removeItem(item.cartKey)}>
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <form className={styles.checkoutForm} onSubmit={handleSubmit}>
                <h2>Delivery Details</h2>

                <input
                    type="text"
                    placeholder="Your Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                />

                <input
                    type="tel"
                    placeholder="Phone Number (+974 XXXXXXXX)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    pattern="[+]?[0-9]{8,15}"
                    required
                />

                <textarea
                    placeholder="Delivery Address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    rows={3}
                    required
                />

                <div className={styles.orderSummary}>
                    <span>Total ({totalItems} items):</span>
                    <strong>QR {totalAmount.toFixed(2)}</strong>
                </div>

                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Placing Order...' : 'Place Order (Cash on Delivery)'}
                </button>
            </form>
        </div>
    )
}