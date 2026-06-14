'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import styles from './modifiers.module.scss'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ModifiersPage() {
    const router = useRouter()
    const [restaurant, setRestaurant] = useState(null)
    const [groups, setGroups] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingGroup, setEditingGroup] = useState(null)
    const [showGroupForm, setShowGroupForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [expandedGroup, setExpandedGroup] = useState(null)

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/admin/login'); return }

            const { data: rpUser } = await supabase
                .from('rp_users')
                .select('restaurants_id, role')
                .eq('auth_user_id', user.id)
                .single()

            if (!rpUser) { router.push('/admin/login'); return }
            setRestaurant(rpUser)

            const { data: groupData, error: groupError } = await supabase
                .from('modifier_groups')
                .select('*, modifiers(*)')
                .eq('restaurants_id', rpUser.restaurants_id)
                .order('sort_order', { ascending: true })
            console.log('Groups:', groupData, 'Error:', groupError)
            setGroups(groupData || [])
            setLoading(false)
        }

        loadData()
    }, [router])

    const saveGroup = async (groupData) => {
        setSaving(true)
        const isNew = !groupData.id
        const url = isNew ? '/api/modifiers/groups' : `/api/modifiers/groups/${groupData.id}`
        const method = isNew ? 'POST' : 'PATCH'

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...groupData, restaurants_id: restaurant.restaurants_id }),
        })

        if (res.ok) {
            const saved = await res.json()
            if (isNew) {
                setGroups(prev => [...prev, { ...saved.data, modifiers: [] }])
            } else {
                setGroups(prev => prev.map(g => g.id === saved.data.id ? { ...g, ...saved.data } : g))
            }
            setShowGroupForm(false)
            setEditingGroup(null)
        }
        setSaving(false)
    }

    const deleteGroup = async (groupId) => {
        if (!confirm('Delete this modifier group and all its options?')) return
        const res = await fetch(`/api/modifiers/groups/${groupId}`, { method: 'DELETE' })
        if (res.ok) {
            setGroups(prev => prev.filter(g => g.id !== groupId))
        }
    }

    const saveModifier = async (groupId, modifierData) => {
        const isNew = !modifierData.id
        const url = isNew ? '/api/modifiers/options' : `/api/modifiers/options/${modifierData.id}`
        const method = isNew ? 'POST' : 'PATCH'

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...modifierData, group_id: groupId }),
        })

        if (res.ok) {
            const saved = await res.json()
            setGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g
                const modifiers = g.modifiers || []
                if (isNew) {
                    return { ...g, modifiers: [...modifiers, saved.data] }
                } else {
                    return { ...g, modifiers: modifiers.map(m => m.id === saved.data.id ? saved.data : m) }
                }
            }))
        }
    }

    const deleteModifier = async (groupId, modifierId) => {
        const res = await fetch(`/api/modifiers/options/${modifierId}`, { method: 'DELETE' })
        if (res.ok) {
            setGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g
                return { ...g, modifiers: (g.modifiers || []).filter(m => m.id !== modifierId) }
            }))
        }
    }

    if (loading) {
        return <div className={styles.loading}>Loading modifiers...</div>
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button onClick={() => router.push('/admin/dashboard')} className={styles.backBtn}>
                    ← Dashboard
                </button>
                <h1 className={styles.headerTitle}>Add-ons Groups</h1>
                <button
                    onClick={() => { setEditingGroup({}); setShowGroupForm(true) }}
                    className={styles.addBtn}
                >
                    + Add Add-ons Group
                </button>
            </header>

            <main className={styles.mainContent}>
                {groups.length === 0 && (
                    <p className={styles.emptyMessage}>No modifier groups yet. Create your first one.</p>
                )}

                {groups.map(group => (
                    <section key={group.id} className={styles.groupSection}>
                        <div className={styles.groupHeader}>
                            <div className={styles.groupInfo}>
                                <h3 className={styles.groupName}>{group.name}</h3>
                                <span className={styles.groupMeta}>
                                    {group.selection_type === 'single' ? 'Single choice' : 'Multiple choice'}
                                    {group.is_required ? ' • Required' : ''}
                                </span>
                            </div>
                            <div className={styles.groupActions}>
                                <button
                                    onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                                    className={styles.actionBtn}
                                >
                                    {expandedGroup === group.id ? 'Collapse' : 'Manage Options'}
                                </button>
                                <button
                                    onClick={() => { setEditingGroup(group); setShowGroupForm(true) }}
                                    className={styles.iconBtn}
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => deleteGroup(group.id)}
                                    className={styles.deleteBtn}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>

                        {expandedGroup === group.id && (
                            <div className={styles.expandedContent}>
                                {(group.modifiers || []).length === 0 && (
                                    <p className={styles.noOptions}>No options yet.</p>
                                )}

                                {(group.modifiers || []).map(mod => (
                                    <div key={mod.id} className={styles.modifierRow}>
                                        <div className={styles.modifierInfo}>
                                            <span className={styles.modifierName}>{mod.name}</span>
                                            <span className={`${styles.modifierPrice} ${mod.price > 0 ? styles.positive : styles.free}`}>
                                                {mod.price > 0 ? `+QR ${Number(mod.price).toFixed(2)}` : 'Free'}
                                            </span>
                                            {!mod.is_available && <span className={styles.unavailableBadge}>Unavailable</span>}
                                        </div>
                                        <div className={styles.modifierActions}>
                                            <button
                                                onClick={() => {
                                                    const newName = prompt('Modifier name:', mod.name)
                                                    if (newName) {
                                                        const newPrice = parseFloat(prompt('Price (QAR):', mod.price))
                                                        if (!isNaN(newPrice)) {
                                                            saveModifier(group.id, { id: mod.id, name: newName, price: newPrice, is_available: mod.is_available })
                                                        }
                                                    }
                                                }}
                                                className={styles.iconBtn}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this modifier?')) deleteModifier(group.id, mod.id)
                                                }}
                                                className={styles.deleteBtn}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        const name = prompt('Option name:')
                                        if (name) {
                                            const price = parseFloat(prompt('Price (QAR):', '0'))
                                            if (!isNaN(price)) {
                                                saveModifier(group.id, { name, price, is_available: true })
                                            }
                                        }
                                    }}
                                    className={styles.addOptionBtn}
                                >
                                    + Add Option
                                </button>
                            </div>
                        )}
                    </section>
                ))}
            </main>

            {/* Group Form Modal */}
            {showGroupForm && (
                <div className={styles.modalOverlay} onClick={() => { setShowGroupForm(false); setEditingGroup(null) }}>
                    <form className={styles.modalForm} onClick={e => e.stopPropagation()} onSubmit={e => {
                        e.preventDefault()
                        const form = e.target
                        saveGroup({
                            id: editingGroup?.id,
                            name: form.name.value,
                            selection_type: form.selection_type.value,
                            is_required: form.is_required.checked,
                            sort_order: parseInt(form.sort_order.value) || 0,
                        })
                    }}>
                        <h2 className={styles.modalTitle}>{editingGroup?.id ? 'Edit Group' : 'Add Group'}</h2>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>Group Name</label>
                            <input name="name" defaultValue={editingGroup?.name || ''} required className={styles.fieldInput} />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>Selection Type</label>
                            <select name="selection_type" defaultValue={editingGroup?.selection_type || 'multiple'} className={styles.fieldSelect}>
                                <option value="multiple">Multiple choice</option>
                                <option value="single">Single choice</option>
                            </select>
                        </div>

                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" name="is_required" defaultChecked={editingGroup?.is_required || false} />
                            Required
                        </label>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>Sort Order</label>
                            <input name="sort_order" type="number" defaultValue={editingGroup?.sort_order || 0} className={styles.fieldInput} />
                        </div>

                        <div className={styles.modalActions}>
                            <button type="button" onClick={() => { setShowGroupForm(false); setEditingGroup(null) }} className={styles.cancelBtn}>Cancel</button>
                            <button type="submit" disabled={saving} className={styles.saveBtn}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}