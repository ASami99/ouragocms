'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import styles from './orders.module.scss'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const STATUSES = ['pending', 'preparing', 'ready_to_deliver', 'completed']
const STATUS_COLORS = {
    pending: '#E63946',
    preparing: '#F4A261',
    ready_to_deliver: '#2A9D8F',
    completed: '#4CAF50',
}

const STATUS_NEXT = {
    pending: 'preparing',
    preparing: 'ready_to_deliver',
    ready_to_deliver: 'completed',
}

const ORDERS_PER_PAGE = 20

export default function OrdersPage() {
    const router = useRouter()
    const [restaurant, setRestaurant] = useState(null)
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [updatingOrder, setUpdatingOrder] = useState(null)

    // Filters
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [page, setPage] = useState(1)

    // Load restaurant info
    useEffect(() => {
        const loadRestaurant = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/admin/login'); return }
            const { data: rpUser } = await supabase
                .from('rp_users')
                .select('restaurants_id, role')
                .eq('auth_user_id', user.id)
                .single()
            if (!rpUser) { router.push('/admin/login'); return }
            setRestaurant(rpUser)
            return rpUser
        }

        loadRestaurant().then(rpUser => {
            if (rpUser) loadOrders(rpUser)
        })
    }, [router])

    // Load all orders with filters
    const loadOrders = useCallback(async (rpUser) => {
        setLoading(true)

        let query = supabase
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('restaurants_id', rpUser.restaurants_id)
            .order('created_at', { ascending: false })

        if (search) {
            query = query.or(
                `customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
            )
        }
        if (statusFilter) {
            query = query.eq('status', statusFilter)
        }
        if (dateFrom) {
            query = query.gte('created_at', new Date(dateFrom).toISOString())
        }
        if (dateTo) {
            // Add one day to include the whole end date
            const end = new Date(dateTo)
            end.setDate(end.getDate() + 1)
            query = query.lt('created_at', end.toISOString())
        }

        const from = (page - 1) * ORDERS_PER_PAGE
        const to = from + ORDERS_PER_PAGE - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) {
            console.error('Orders fetch error:', error)
            setOrders([])
        } else {
            setOrders(data || [])
            setTotalCount(count || 0)
        }
        setLoading(false)
    }, [search, statusFilter, dateFrom, dateTo, page])

    const [totalCount, setTotalCount] = useState(0)
    const totalPages = Math.ceil(totalCount / ORDERS_PER_PAGE)

    // Re-fetch when filters change
    useEffect(() => {
        if (restaurant) loadOrders(restaurant)
    }, [loadOrders, restaurant, page])

    const updateOrderStatus = async (orderId, newStatus) => {
        setUpdatingOrder(orderId)
        try {
            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (res.ok) {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
            }
        } finally {
            setUpdatingOrder(null)
        }
    }

    const handleSearch = (e) => {
        e.preventDefault()
        setPage(1)   // reset to first page on new search
        if (restaurant) loadOrders(restaurant)
    }

    const clearFilters = () => {
        setSearch('')
        setStatusFilter('')
        setDateFrom('')
        setDateTo('')
        setPage(1)
    }

    // Summary calculation
    const filteredRevenue = orders.reduce((sum, o) => sum + Number(o.total_qar || 0), 0)

    if (!restaurant) return <div className={styles.loading}>Loading...</div>

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1>All Orders</h1>
                <button className={styles.backBtn} onClick={() => router.push('/admin/dashboard')}>
                    ← Dashboard
                </button>
            </header>

            {/* Filters */}
            <div className={styles.filters}>
                <form className={styles.searchForm} onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search by Order ID, Customer, or Phone"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                    <button type="submit" className={styles.searchBtn}>🔍</button>
                </form>

                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                    className={styles.statusSelect}
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                </select>

                <div className={styles.dateRange}>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                        className={styles.dateInput}
                    />
                    <span className={styles.dateSeparator}>–</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setPage(1) }}
                        className={styles.dateInput}
                    />
                </div>

                {(search || statusFilter || dateFrom || dateTo) && (
                    <button onClick={clearFilters} className={styles.clearBtn}>Clear</button>
                )}
            </div>

            {/* Summary bar */}
            <div className={styles.summary}>
                <span>Found {totalCount} orders</span>
                <span>Total revenue: <strong>QR {filteredRevenue.toFixed(2)}</strong></span>
            </div>

            {/* Orders table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order #</th>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 && !loading && (
                            <tr><td colSpan={8} className={styles.emptyRow}>No orders found.</td></tr>
                        )}
                        {orders.map(order => (
                            <tr key={order.id} className={styles.orderRow} onClick={() => setSelectedOrder(order)}>
                                <td className={styles.orderIdCell}>#{order.id.slice(0, 8).toUpperCase()}</td>
                                <td>{order.customer_name}</td>
                                <td>{order.customer_phone}</td>
                                <td>{order.items_json?.length || 0}</td>
                                <td className={styles.totalCell}>QR {Number(order.total_qar).toFixed(2)}</td>
                                <td>
                                    <span
                                        className={styles.statusBadge}
                                        style={{ background: STATUS_COLORS[order.status] || '#888' }}
                                    >
                                        {order.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className={styles.dateCell}>
                                    {new Date(order.created_at).toLocaleDateString('en-QA', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    <br />
                                    <span className={styles.timeText}>
                                        {new Date(order.created_at).toLocaleTimeString('en-QA', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </td>
                                <td>
                                    {STATUS_NEXT[order.status] && (
                                        <button
                                            className={styles.advanceBtn}
                                            onClick={e => {
                                                e.stopPropagation()
                                                updateOrderStatus(order.id, STATUS_NEXT[order.status])
                                            }}
                                            disabled={updatingOrder === order.id}
                                        >
                                            {updatingOrder === order.id ? '...' : '→'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button disabled={page === 1} onClick={() => setPage(page - 1)}>← Previous</button>
                    <span>Page {page} of {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                </div>
            )}

            {/* Order detail modal */}
            {selectedOrder && (
                <div className={styles.modalOverlay} onClick={() => setSelectedOrder(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</h2>
                            <button className={styles.closeBtn} onClick={() => setSelectedOrder(null)}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.customerInfo}>
                                <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
                                <p><strong>Phone:</strong> {selectedOrder.customer_phone}</p>
                                <p><strong>Address:</strong> {selectedOrder.customer_address || 'N/A'}</p>
                                <p><strong>Status:</strong> {selectedOrder.status}</p>
                                <p><strong>Placed:</strong> {new Date(selectedOrder.created_at).toLocaleString('en-QA')}</p>
                                {selectedOrder.notes && <p><strong>Notes:</strong> {selectedOrder.notes}</p>}
                            </div>
                            <div className={styles.itemsList}>
                                <h3>Items</h3>
                                {(selectedOrder.items_json || []).map((item, idx) => (
                                    <div key={idx} className={styles.modalItemRow}>
                                        <span className={styles.itemQty}>×{item.quantity}</span>
                                        <div className={styles.itemDetail}>
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
                                                <span className={styles.itemNotes}>📝 {item.specialInstructions}</span>
                                            )}
                                        </div>
                                        <span className={styles.itemTotal}>
                                            QR {(item.totalPrice || 0).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                                <div className={styles.modalTotal}>
                                    <span>Total</span>
                                    <strong>QR {Number(selectedOrder.total_qar).toFixed(2)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}