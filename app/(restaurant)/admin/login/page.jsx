'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import styles from './login.module.scss'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminLoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError('Invalid email or password')
            setLoading(false)
            return
        }

        // Verify this user exists in rp_users
        const { data: rpUser, error: rpError } = await supabase
            .from('rp_users')
            .select('*')
            .eq('auth_user_id', data.user.id)
            .single()

        if (rpError || !rpUser) {
            await supabase.auth.signOut()
            setError('No restaurant account found for this user')
            setLoading(false)
            return
        }

        router.push('/admin/dashboard')
    }

    return (
        <div className={styles.page}>
            <div className={styles.grid} aria-hidden="true" />

            <div className={styles.container}>
                <div className={styles.brand}>
                    <div className={styles.logo}>⬡</div>
                    <h1 className={styles.brandName}>OuraGo</h1>
                    <p className={styles.brandSub}>Restaurant Portal</p>
                </div>

                <form className={styles.form} onSubmit={handleLogin}>
                    <div className={styles.formHeader}>
                        <h2 className={styles.formTitle}>Sign In</h2>
                        <p className={styles.formDesc}>Access your restaurant dashboard</p>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Email</label>
                        <input
                            className={styles.input}
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="restaurant@email.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Password</label>
                        <input
                            className={styles.input}
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className={styles.error}>
                            <span>⚠</span> {error}
                        </div>
                    )}

                    <button
                        className={styles.submitBtn}
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className={styles.spinner} />
                        ) : (
                            'Sign In →'
                        )}
                    </button>
                </form>

                <p className={styles.footer}>
                    Powered by OuraGo · Qatar
                </p>
            </div>
        </div>
    )
}
