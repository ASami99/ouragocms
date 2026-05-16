'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

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

    // Load restaurant + modifier data
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

    // Save group (create or update)
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

    // Delete group
    const deleteGroup = async (groupId) => {
        if (!confirm('Delete this modifier group and all its options?')) return
        const res = await fetch(`/api/modifiers/groups/${groupId}`, { method: 'DELETE' })
        if (res.ok) {
            setGroups(prev => prev.filter(g => g.id !== groupId))
        }
    }

    // Save modifier option inside a group
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

    // Delete modifier option
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
        return <div style={{ color: '#888', textAlign: 'center', padding: 60 }}>Loading modifiers...</div>
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e0e0e0', fontFamily: 'system-ui' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderBottom: '1px solid #1a1a1a' }}>
                <button onClick={() => router.push('/admin/menu')} style={{ padding: '8px 16px', border: '1px solid #2a2a2a', borderRadius: 8, background: '#111', color: '#ccc', cursor: 'pointer' }}>
                    ← Menu
                </button>
                <h1 style={{ flex: 1, margin: 0, fontSize: '1.3rem' }}>Modifier Groups</h1>
                <button
                    onClick={() => { setEditingGroup({}); setShowGroupForm(true) }}
                    style={{ padding: '8px 16px', border: '1px dashed #3a3a3a', borderRadius: 8, background: 'transparent', color: '#999', cursor: 'pointer' }}
                >
                    + Add Group
                </button>
            </header>

            <main style={{ padding: 24 }}>
                {groups.length === 0 && (
                    <p style={{ color: '#666', textAlign: 'center' }}>No modifier groups yet. Create your first one.</p>
                )}

                {groups.map(group => (
                    <section key={group.id} style={{ marginBottom: 24, background: '#111', borderRadius: 12, border: '1px solid #1a1a1a', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#0d0d0d' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff' }}>{group.name}</h3>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                    {group.selection_type === 'single' ? 'Single choice' : 'Multiple choice'}
                                    {group.is_required ? ' • Required' : ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                                    style={{ padding: '6px 12px', border: '1px solid #2a2a2a', borderRadius: 6, background: '#111', color: '#ccc', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    {expandedGroup === group.id ? 'Collapse' : 'Manage Options'}
                                </button>
                                <button
                                    onClick={() => { setEditingGroup(group); setShowGroupForm(true) }}
                                    style={{ padding: '6px 10px', border: 'none', borderRadius: 6, background: 'transparent', color: '#ccc', cursor: 'pointer' }}
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => deleteGroup(group.id)}
                                    style={{ padding: '6px 10px', border: 'none', borderRadius: 6, background: 'transparent', color: '#E63946', cursor: 'pointer' }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>

                        {expandedGroup === group.id && (
                            <div style={{ padding: '16px 20px' }}>
                                {(group.modifiers || []).length === 0 && (
                                    <p style={{ color: '#666', fontSize: '0.85rem' }}>No options yet.</p>
                                )}

                                {(group.modifiers || []).map(mod => (
                                    <div key={mod.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                                        <div>
                                            <span style={{ color: '#e0e0e0' }}>{mod.name}</span>
                                            <span style={{ marginLeft: 8, color: mod.price > 0 ? '#4CAF50' : '#888', fontSize: '0.85rem' }}>
                                                {mod.price > 0 ? `+QR ${Number(mod.price).toFixed(2)}` : 'Free'}
                                            </span>
                                            {!mod.is_available && <span style={{ marginLeft: 8, color: '#E63946', fontSize: '0.8rem' }}>Unavailable</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
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
                                                style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.9rem' }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this modifier?')) deleteModifier(group.id, mod.id)
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#E63946', cursor: 'pointer', fontSize: '0.9rem' }}
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
                                    style={{ marginTop: 12, padding: '8px 16px', border: '1px dashed #3a3a3a', borderRadius: 8, background: 'transparent', color: '#999', cursor: 'pointer', fontSize: '0.85rem' }}
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setShowGroupForm(false); setEditingGroup(null) }}>
                    <form style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: '90%', maxWidth: 450 }} onClick={e => e.stopPropagation()} onSubmit={e => {
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
                        <h2 style={{ margin: '0 0 20px', color: '#fff' }}>{editingGroup?.id ? 'Edit Group' : 'Add Group'}</h2>

                        <label style={{ display: 'block', margin: '12px 0 4px', color: '#999', fontSize: '0.85rem' }}>Group Name</label>
                        <input name="name" defaultValue={editingGroup?.name || ''} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: 8, background: '#0a0a0a', color: '#e0e0e0', fontSize: '0.95rem' }} />

                        <label style={{ display: 'block', margin: '12px 0 4px', color: '#999', fontSize: '0.85rem' }}>Selection Type</label>
                        <select name="selection_type" defaultValue={editingGroup?.selection_type || 'multiple'} style={{ width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: 8, background: '#0a0a0a', color: '#e0e0e0', fontSize: '0.95rem' }}>
                            <option value="multiple">Multiple choice</option>
                            <option value="single">Single choice</option>
                        </select>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', color: '#ccc', fontSize: '0.9rem' }}>
                            <input type="checkbox" name="is_required" defaultChecked={editingGroup?.is_required || false} />
                            Required
                        </label>

                        <label style={{ display: 'block', margin: '12px 0 4px', color: '#999', fontSize: '0.85rem' }}>Sort Order</label>
                        <input name="sort_order" type="number" defaultValue={editingGroup?.sort_order || 0} style={{ width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: 8, background: '#0a0a0a', color: '#e0e0e0', fontSize: '0.95rem' }} />

                        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => { setShowGroupForm(false); setEditingGroup(null) }} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: '#ccc', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#E63946', color: '#fff', cursor: 'pointer' }}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}