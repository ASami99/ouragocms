'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import styles from './settings.module.scss'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
function CountdownTimer({ endTime, onExpire }) {
    const [remaining, setRemaining] = useState('')

    useEffect(() => {
        const tick = () => {
            const diff = new Date(endTime).getTime() - Date.now()
            if (diff <= 0) {
                setRemaining('')
                onExpire()
                return
            }
            const min = Math.floor(diff / 60000)
            const sec = Math.floor((diff % 60000) / 1000)
            setRemaining(`${min}:${String(sec).padStart(2, '0')}`)
        }
        tick()
        const interval = setInterval(tick, 1000)
        return () => clearInterval(interval)
    }, [endTime, onExpire])

    return remaining ? (
        <span className={styles.countdown}>Resumes in {remaining}</span>
    ) : null
}
export default function SettingsPage() {
    const [adminTheme, setAdminTheme] = useState('dark')
    const router = useRouter()
    const [restaurant, setRestaurant] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('success')

    // Form fields
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [address, setAddress] = useState('')
    const [logoUrl, setLogoUrl] = useState('')
    const [socialLinks, setSocialLinks] = useState({
        instagram: '',
        facebook: '',
        tiktok: '',
        website: '',
    })
    const [uploadingLogo, setUploadingLogo] = useState(false)

    // opening hours state
    const [isAcceptingOrders, setIsAcceptingOrders] = useState(true)
    const [openingHours, setOpeningHours] = useState({
        monday: { open: '10:00', close: '22:00' },
        tuesday: { open: '10:00', close: '22:00' },
        wednesday: { open: '10:00', close: '22:00' },
        thursday: { open: '10:00', close: '22:00' },
        friday: { open: '13:00', close: '23:00' },
        saturday: { open: '10:00', close: '22:00' },
        sunday: { open: '10:00', close: '22:00' },
    })
    const [pausedUntil, setPausedUntil] = useState(null)

    // Load restaurant data
    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/admin/login'); return }

            const { data: rpUser } = await supabase
                .from('rp_users')
                .select('restaurants_id')
                .eq('auth_user_id', user.id)
                .single()

            if (!rpUser) { router.push('/admin/login'); return }

            const { data: resData } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', rpUser.restaurants_id)
                .single()

            if (resData) {
                setRestaurant(resData)
                setName(resData.name || '')
                setPhone(resData.phone || '')
                setEmail(resData.email || '')
                setAddress(resData.address || '')
                setLogoUrl(resData.logo_url || '')
                if (resData.social_links) {
                    setSocialLinks(prev => ({ ...prev, ...resData.social_links }))
                }

                if (resData.is_accepting_orders !== undefined) {
                    setIsAcceptingOrders(resData.is_accepting_orders)
                }
                if (resData.orders_paused_until) {
                    setPausedUntil(new Date(resData.orders_paused_until))
                } else {
                    setPausedUntil(null)
                }
                if (resData.opening_hours) {
                    setOpeningHours(prev => ({ ...prev, ...resData.opening_hours }))
                }
            }

            const savedTheme = localStorage.getItem('ourago-admin-theme') || 'dark'
            setAdminTheme(savedTheme)
            document.documentElement.setAttribute('data-admin-theme', savedTheme)

            setLoading(false)
        }
        loadData()
    }, [router])

    const handleSocialChange = (platform, value) => {
        setSocialLinks(prev => ({ ...prev, [platform]: value }))
    }

    // Logo upload handler (using restaurant-logos bucket)
    const handleLogoUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setMessage('Only image files are allowed')
            setMessageType('error')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setMessage('File too large (max 5 MB)')
            setMessageType('error')
            return
        }

        setUploadingLogo(true)
        const filename = `${Date.now()}-${file.name}`

        const { data, error } = await supabase.storage
            .from('restaurant-logos')
            .upload(filename, file, { cacheControl: '3600', upsert: false })

        if (error) {
            setMessage('Upload failed')
            setMessageType('error')
            setUploadingLogo(false)
            return
        }

        const { data: urlData } = supabase.storage
            .from('restaurant-logos')
            .getPublicUrl(data.path)
        setLogoUrl(urlData.publicUrl)
        setUploadingLogo(false)
    }

    const handleThemeChange = (newTheme) => {
      setAdminTheme(newTheme)
      localStorage.setItem('ourago-admin-theme', newTheme)
      document.documentElement.setAttribute('data-admin-theme', newTheme)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')

        const res = await fetch(`/api/restaurants/${restaurant.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                phone,
                email,
                address,
                logo_url: logoUrl,
                social_links: socialLinks,
                is_accepting_orders: isAcceptingOrders,
                opening_hours: openingHours,
                orders_paused_until: pausedUntil ? new Date(pausedUntil).toISOString() : null,
            }),
        })

        if (res.ok) {
            setMessage('Settings saved successfully!')
            setMessageType('success')
        } else {
            const err = await res.json()
            setMessage(err.error || 'Failed to save settings.')
            setMessageType('error')
        }
        setSaving(false)
        setTimeout(() => setMessage(''), 3000)
    }

    if (loading) return <div className={styles.loading}>Loading...</div>

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Restaurant Settings</h1>

            {/* Pause Toggle */}
            <div className={styles.field}>
                <label className={styles.label}>Ordering Status</label>

                <div className={styles.toggleRow}>
                    <button
                        type="button"
                        className={`${styles.toggleSwitch} ${isAcceptingOrders ? styles.toggleOn : styles.toggleOff}`}
                        onClick={() => {
                            setIsAcceptingOrders(!isAcceptingOrders)
                            setPausedUntil(null)   // manual toggle clears any timed pause
                        }}
                    >
                        <span className={styles.toggleKnob} />
                    </button>
                    <span className={styles.toggleLabel}>
                        {isAcceptingOrders ? 'Orders are open' : 'Orders are paused'}
                    </span>
                </div>

                {/* Quick pause buttons */}
                <div className={styles.quickPauseRow}>
                    <span className={styles.quickPauseLabel}>Quick pause:</span>
                    <button
                        type="button"
                        className={styles.quickPauseBtn}
                        onClick={() => {
                            setIsAcceptingOrders(false)
                            const until = new Date(Date.now() + 5 * 60000)
                            setPausedUntil(until)
                        }}
                    >
                        5 min
                    </button>
                    <button
                        type="button"
                        className={styles.quickPauseBtn}
                        onClick={() => {
                            setIsAcceptingOrders(false)
                            const until = new Date(Date.now() + 15 * 60000)
                            setPausedUntil(until)
                        }}
                    >
                        15 min
                    </button>
                    <button
                        type="button"
                        className={styles.quickPauseBtn}
                        onClick={() => {
                            setIsAcceptingOrders(false)
                            const until = new Date(Date.now() + 30 * 60000)
                            setPausedUntil(until)
                        }}
                    >
                        30 min
                    </button>
                </div>

                {!isAcceptingOrders && pausedUntil && (
                    <CountdownTimer endTime={pausedUntil} onExpire={() => {
                        setIsAcceptingOrders(true)
                        setPausedUntil(null)
                    }} />
                )}
            </div>


            <form className={styles.form} onSubmit={handleSubmit}>
                <Field label="Restaurant Name" required>
                    <input
                        className={styles.input}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                </Field>

                <Field label="Phone">
                    <input
                        className={styles.input}
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                    />
                </Field>

                <Field label="Email">
                    <input
                        className={styles.input}
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </Field>

                <Field label="Address">
                    <textarea
                        className={styles.textarea}
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        rows={3}
                    />
                </Field>

                {/* Logo upload field */}
                <div className={styles.field}>
                    <label className={styles.label}>Logo</label>
                    <div className={styles.logoUploadRow}>
                        {logoUrl && (
                            <div className={styles.logoPreview}>
                                <img src={logoUrl} alt="Logo preview" />
                            </div>
                        )}

                        <label className={`${styles.uploadBtn} ${uploadingLogo ? styles.uploadBtnDisabled : ''}`}>
                            {uploadingLogo ? '⏳ Uploading...' : logoUrl ? '🔄 Change Logo' : '📁 Upload Logo'}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                disabled={uploadingLogo}
                                style={{ display: 'none' }}
                            />
                        </label>

                        {logoUrl && !uploadingLogo && (
                            <button type="button" className={styles.removeBtn} onClick={() => setLogoUrl('')}>
                                ✕ Remove
                            </button>
                        )}
                    </div>
                </div>



                {/* Opening Hours */}
                <h2 className={styles.sectionTitle}>Opening Hours</h2>
                {Object.entries(openingHours).map(([day, times]) => (
                    <div key={day} className={styles.hoursRow}>
                        <span className={styles.dayLabel}>{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                        <input
                            type="time"
                            value={times.open}
                            onChange={e => setOpeningHours(prev => ({
                                ...prev,
                                [day]: { ...prev[day], open: e.target.value }
                            }))}
                            className={styles.timeInput}
                        />
                        <span className={styles.timeSeparator}>to</span>
                        <input
                            type="time"
                            value={times.close}
                            onChange={e => setOpeningHours(prev => ({
                                ...prev,
                                [day]: { ...prev[day], close: e.target.value }
                            }))}
                            className={styles.timeInput}
                        />
                    </div>
                ))}

                <Field label="Admin Theme">
                  <select
                    className={styles.select}
                    value={adminTheme}
                    onChange={e => handleThemeChange(e.target.value)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </Field>

                <h2 className={styles.sectionTitle}>Social Media Links</h2>
                <Field label="Instagram URL">
                    <input
                        className={styles.input}
                        value={socialLinks.instagram}
                        onChange={e => handleSocialChange('instagram', e.target.value)}
                        placeholder="https://instagram.com/..."
                    />
                </Field>
                <Field label="Facebook URL">
                    <input
                        className={styles.input}
                        value={socialLinks.facebook}
                        onChange={e => handleSocialChange('facebook', e.target.value)}
                        placeholder="https://facebook.com/..."
                    />
                </Field>
                <Field label="TikTok URL">
                    <input
                        className={styles.input}
                        value={socialLinks.tiktok}
                        onChange={e => handleSocialChange('tiktok', e.target.value)}
                        placeholder="https://tiktok.com/@..."
                    />
                </Field>
                <Field label="Website">
                    <input
                        className={styles.input}
                        value={socialLinks.website}
                        onChange={e => handleSocialChange('website', e.target.value)}
                        placeholder="https://..."
                    />
                </Field>

                {message && (
                    <p className={`${styles.message} ${messageType === 'success' ? styles.success : styles.error}`}>
                        {message}
                    </p>
                )}

                <button className={styles.submitBtn} type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </div>
    )
}

// Reusable field wrapper
function Field({ label, required, children }) {
    return (
        <div className={styles.field}>
            <label className={styles.label}>
                {label}
                {required ? ' *' : ''}
            </label>
            {children}
        </div>
    )
}