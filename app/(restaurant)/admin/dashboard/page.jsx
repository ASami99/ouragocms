'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import styles from './dashboard.module.scss'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STATUSES = [
    { key: 'pending', label: 'New Orders', emoji: '🔔', color: '#E63946' },
    { key: 'preparing', label: 'Preparing', emoji: '🍳', color: '#F4A261' },
    { key: 'ready_to_deliver', label: 'Ready to Deliver', emoji: '🛵', color: '#2A9D8F' },
    { key: 'completed', label: 'Completed', emoji: '✅', color: '#4CAF50' },
]

const STATUS_NEXT = {
    pending: 'preparing',
    preparing: 'ready_to_deliver',
    ready_to_deliver: 'completed',
}

const STATUS_NEXT_LABEL = {
    pending: '→ Start Preparing',
    preparing: '→ Ready to Deliver',
    ready_to_deliver: '→ Mark Completed',
}

export default function DashboardPage() {
    const router = useRouter()
    const [restaurant, setRestaurant] = useState(null)
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedOrder, setExpandedOrder] = useState(null)
    const [updatingOrder, setUpdatingOrder] = useState(null)
    const prevOrderIdsRef = useRef(new Set())

    // const playNotification = useCallback(() => {
    //     try {
    //         const ctx = new (window.AudioContext || window.webkitAudioContext)()
    //         const times = [0, 0.15, 0.3]
    //         times.forEach(time => {
    //             const osc = ctx.createOscillator()
    //             const gain = ctx.createGain()
    //             osc.connect(gain)
    //             gain.connect(ctx.destination)
    //             osc.frequency.value = 880
    //             osc.type = 'sine'
    //             gain.gain.setValueAtTime(0.3, ctx.currentTime + time)
    //             gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.2)
    //             osc.start(ctx.currentTime + time)
    //             osc.stop(ctx.currentTime + time + 0.2)
    //         })
    //     } catch (e) {
    //         console.log('Audio not available')
    //     }
    // }, [])

    const playNotification = useCallback(() => {
        const audio = new Audio('/sounds/order-alert.wav')
        audio.play().catch(() => {
        })
    }, [])

    const showBrowserNotification = useCallback((order) => {
        if (Notification.permission === 'granted') {
            new Notification('🔔 New Order!', {
                body: `${order.customer_name} — QR ${order.total_qar}`,
                icon: '/favicon.ico',
            })
        }
    }, [])

    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }, [])

    // Load restaurant profile
    useEffect(() => {
        const loadRestaurant = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/admin/login'); return }

            const { data: rpUser } = await supabase
                .from('rp_users')
                .select('*')
                .eq('auth_user_id', user.id)
                .single()

            if (!rpUser) { router.push('/admin/login'); return }

            // Fetch the real restaurant name from restaurants table
            const { data: restaurantData } = await supabase
                .from('restaurants')
                .select('name')
                .eq('id', rpUser.restaurants_id)
                .single()

            setRestaurant({
                ...rpUser,
                restaurant_name: restaurantData?.name || 'Restaurant'
            })

            // setRestaurant(rpUser)
            return rpUser
        }

        loadRestaurant().then(rpUser => {
            if (rpUser) loadOrders(rpUser)
        })
    }, [router])

    const loadOrders = async (rpUser) => {
        // Use restaurants_id (uuid FK) if available, fall back to old restaurant_id
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('restaurants_id', rpUser.restaurants_id)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setOrders(data)
            prevOrderIdsRef.current = new Set(data.map(o => o.id))
        }
        setLoading(false)
    }

    // Real-time subscription — uses restaurants_id when available
    useEffect(() => {
        if (!restaurant) return

        const filterField = restaurant.restaurants_id ? 'restaurants_id' : 'restaurant_id'
        const filterValue = restaurant.restaurants_id || restaurant.restaurant_id

        const channel = supabase
            .channel('orders-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    // filter: `${filterField}=eq.${filterValue}`,
                    filter: `restaurants_id=eq.${restaurant.restaurants_id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newOrder = payload.new
                        setOrders(prev => [newOrder, ...prev])
                        if (!prevOrderIdsRef.current.has(newOrder.id)) {
                            prevOrderIdsRef.current.add(newOrder.id)
                            playNotification()
                            showBrowserNotification(newOrder)
                        }
                    }
                    if (payload.eventType === 'UPDATE') {
                        setOrders(prev =>
                            prev.map(o => o.id === payload.new.id ? payload.new : o)
                        )
                    }
                    if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [restaurant, playNotification, showBrowserNotification])

    const updateOrderStatus = async (orderId, newStatus) => {
        setUpdatingOrder(orderId)
        try {
            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) {
                const err = await res.json()
                console.error('Failed to update order:', err)
            }
        } finally {
            setUpdatingOrder(null)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/admin/login')
    }

    const getOrdersByStatus = (status) => orders.filter(o => o.status === status)

    const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-QA', {
        hour: '2-digit', minute: '2-digit'
    })

    const formatDate = (ts) => {
        const date = new Date(ts)
        return date.toDateString() === new Date().toDateString()
            ? 'Today'
            : date.toLocaleDateString('en-QA', { day: 'numeric', month: 'short' })
    }

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.loadingDot} />
                <span>Loading dashboard...</span>
            </div>
        )
    }

    return (
        <div className={styles.page}>

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.headerTitle}>Dashboard</h1>
                    <p className={styles.headerSub}>Real‑time orders</p>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.orderCount}>
                        <span className={styles.orderCountNum}>{getOrdersByStatus('pending').length}</span>
                        <span className={styles.orderCountLabel}>New</span>
                    </div>
                </div>
            </header>

            <main className={styles.kanban}>
                {STATUSES.map(status => (
                    <div key={status.key} className={styles.column}>
                        <div className={styles.columnHeader} style={{ '--col-color': status.color }}>
                            <span className={styles.columnEmoji}>{status.emoji}</span>
                            <span className={styles.columnLabel}>{status.label}</span>
                            <span className={styles.columnCount}>
                                {getOrdersByStatus(status.key).length}
                            </span>
                        </div>

                        <div className={styles.columnBody}>
                            {getOrdersByStatus(status.key).length === 0 && (
                                <div className={styles.emptyColumn}><span>No orders</span></div>
                            )}

                            {getOrdersByStatus(status.key).map(order => (
                                <div
                                    key={order.id}
                                    className={`${styles.orderCard} ${status.key === 'pending' ? styles.newCard : ''}`}
                                    style={{ '--col-color': status.color }}
                                >
                                    <div className={styles.cardHeader}>
                                        <span className={styles.orderId}>
                                            Order Id #{order.id.slice(0, 8).toUpperCase()}
                                        </span>
                                        <span className={styles.orderTime}>
                                            {formatDate(order.created_at)} {formatTime(order.created_at)}
                                        </span>
                                    </div>

                                    <div className={styles.customerInfo}>
                                        <p className={styles.customerName}>{order.customer_name}</p>
                                        <p className={styles.customerPhone}>{order.customer_phone}</p>
                                        {order.customer_address && (
                                            <p className={styles.customerAddress}>📍 {order.customer_address}</p>
                                        )}
                                    </div>

                                    <button
                                        className={styles.itemsToggle}
                                        onClick={() => setExpandedOrder(
                                            expandedOrder === order.id ? null : order.id
                                        )}
                                    >
                                        {order.items_json?.length || 0} item(s)
                                        <span>{expandedOrder === order.id ? '▲' : '▼'}</span>
                                    </button>

                                    {expandedOrder === order.id && (
                                        <div className={styles.itemsList}>
                                            {(order.items_json || []).map((item, idx) => (
                                                <div key={idx} className={styles.itemRow}>
                                                    <span className={styles.itemQty}>×{item.quantity}</span>
                                                    <span className={styles.itemName}>{item.name}</span>
                                                    <span className={styles.itemPrice}>
                                                        QR {(item.totalPrice || item.unitPrice * item.quantity || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                            {order.notes && (
                                                <div className={styles.orderNotes}>💬 {order.notes}</div>
                                            )}
                                        </div>
                                    )}

                                    <div className={styles.cardFooter}>
                                        <span className={styles.totalAmount}>
                                            QR {Number(order.total_qar).toFixed(2)}
                                        </span>
                                        {STATUS_NEXT[order.status] && (
                                            <button
                                                className={styles.advanceBtn}
                                                style={{ '--col-color': status.color }}
                                                onClick={() => updateOrderStatus(order.id, STATUS_NEXT[order.status])}
                                                disabled={updatingOrder === order.id}
                                            >
                                                {updatingOrder === order.id ? '...' : STATUS_NEXT_LABEL[order.status]}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </main>
        </div>
    )
}