'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import styles from './Sidebar.module.scss'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const NAV_ITEMS = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { label: 'Orders', path: '/admin/orders', icon: '🛎️' },
    { label: 'Menu', path: '/admin/menu', icon: '📋' },
    { label: 'Add-ons', path: '/admin/modifiers', icon: '🧩' },
    { label: 'Settings', path: '/admin/settings', icon: '⚙️' },
]

export default function Sidebar({ restaurantName }) {
    const router = useRouter()
    const pathname = usePathname()

    const isActive = (path) => pathname === path

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/admin/login')
    }

    return (
        <aside className={styles.sidebar}>
            <div className={styles.brand}>
                <span className={styles.logo}>⬡</span>
                <span className={styles.brandName}>OuraGo</span>
                <span className={styles.restaurantName}>{restaurantName || 'Restaurant'}</span>
            </div>

            <nav className={styles.nav}>
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.path}
                        className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                        onClick={() => router.push(item.path)}
                    >
                        <span className={styles.navIcon}>{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className={styles.footer}>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                    ⏻ Sign Out
                </button>
            </div>
        </aside>
    )
}