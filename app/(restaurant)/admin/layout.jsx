'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/admin/Sidebar'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminLayout({ children }) {
    const router = useRouter()
    const pathname = usePathname()
    const [checking, setChecking] = useState(true)
    const [restaurantName, setRestaurantName] = useState('')

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session && pathname !== '/admin/login') {
                router.replace('/admin/login')
                return
            }

            if (session) {
                // Fetch restaurant name for sidebar
                const { data: rpUser } = await supabase
                    .from('rp_users')
                    .select('restaurants_id')
                    .eq('auth_user_id', session.user.id)
                    .single()

                if (rpUser?.restaurants_id) {
                    const { data: restaurant } = await supabase
                        .from('restaurants')
                        .select('name')
                        .eq('id', rpUser.restaurants_id)
                        .single()
                    if (restaurant) setRestaurantName(restaurant.name)
                }

                if (pathname === '/admin/login') {
                    router.replace('/admin/dashboard')
                }
            }

            setChecking(false)
        }

        checkAuth()
    }, [pathname, router])

    if (checking) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: '#0a0a0a', color: '#fff',
                fontFamily: 'monospace', fontSize: '14px', letterSpacing: '0.1em'
            }}>
                LOADING...
            </div>
        )
    }

    // Login page: no sidebar
    if (pathname === '/admin/login') {
        return <>{children}</>
    }

    // All other admin pages: show sidebar + content
    return (
        <div style={{ display: 'flex' }}>
            <Sidebar restaurantName={restaurantName} />
            <main style={{ marginLeft: '200px', flex: 1, background: '#0a0a0a', minHeight: '100vh' }}>
                {children}
            </main>
        </div>
    )
}