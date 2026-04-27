'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminLayout({ children }) {
    const router = useRouter()
    const pathname = usePathname()
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session && pathname !== '/admin/login') {
                router.replace('/admin/login')
            } else if (session && pathname === '/admin/login') {
                router.replace('/admin/dashboard')
            }
            setChecking(false)
        }

        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session && pathname !== '/admin/login') {
                router.replace('/admin/login')
            }
        })

        return () => subscription.unsubscribe()
    }, [pathname, router])

    if (checking) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#0a0a0a',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '14px',
                letterSpacing: '0.1em'
            }}>
                LOADING...
            </div>
        )
    }

    return <>{children}</>
}
