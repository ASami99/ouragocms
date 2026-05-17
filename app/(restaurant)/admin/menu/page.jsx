'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import styles from './menu.module.scss'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function MenuPage() {
    const router = useRouter()
    const [restaurant, setRestaurant] = useState(null)
    const [categories, setCategories] = useState([])
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingItem, setEditingItem] = useState(null)
    const [editingCategory, setEditingCategory] = useState(null)
    const [showItemForm, setShowItemForm] = useState(false)
    const [showCategoryForm, setShowCategoryForm] = useState(false)
    const [saving, setSaving] = useState(false)

    // Load restaurant + menu data
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

            const [{ data: cats }, { data: allItems }] = await Promise.all([
                supabase
                    .from('menu_categories')
                    .select('*')
                    .eq('restaurants_id', rpUser.restaurants_id)
                    .order('position', { ascending: true }),
                supabase
                    .from('menu_items')
                    .select('*, item_variants(*), variant_label, item_modifier_groups(group_id)')
                    .eq('restaurants_id', rpUser.restaurants_id)
                    .order('position', { ascending: true }),
            ])

            setCategories(cats || [])
            const itemsWithModifiers = (allItems || []).map(item => ({
                ...item,
                item_modifier_groups: item.item_modifier_groups || [],
            }))
            setItems(itemsWithModifiers)

            setLoading(false)
        }

        loadData()
    }, [router])

    // Toggle item availability
    const toggleAvailability = async (itemId, currentValue) => {
        const res = await fetch(`/api/menu/items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_available: !currentValue }),
        })

        if (res.ok) {
            const { data } = await res.json()
            setItems(prev => prev.map(i => i.id === itemId ? data : i))
        }
    }

    // Delete item
    const deleteItem = async (itemId) => {
        if (!confirm('Delete this item?')) return

        const res = await fetch(`/api/menu/items/${itemId}`, { method: 'DELETE' })
        if (res.ok) {
            setItems(prev => prev.filter(i => i.id !== itemId))
        }
    }

    // Save item (create or update)
    const saveItem = async (itemData) => {
        setSaving(true)
        const isNew = !itemData.id
        const url = isNew ? '/api/menu/items' : `/api/menu/items/${itemData.id}`
        const method = isNew ? 'POST' : 'PATCH'

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...itemData, restaurants_id: restaurant.restaurants_id }),
        })

        if (res.ok) {
            const saved = await res.json()
            if (isNew) {
                setItems(prev => [...prev, saved.data])
            } else {
                setItems(prev => prev.map(i => i.id === saved.data.id ? saved.data : i))
            }
            setShowItemForm(false)
            setEditingItem(null)
        }
        setSaving(false)
    }

    // Save category
    const saveCategory = async (catData) => {
        setSaving(true)
        const isNew = !catData.id
        const url = isNew ? '/api/menu/categories' : `/api/menu/categories/${catData.id}`
        const method = isNew ? 'POST' : 'PATCH'

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...catData, restaurants_id: restaurant.restaurants_id }),
        })

        if (res.ok) {
            const saved = await res.json()
            if (isNew) {
                setCategories(prev => [...prev, saved.data])
            } else {
                setCategories(prev => prev.map(c => c.id === saved.data.id ? saved.data : c))
            }
            setShowCategoryForm(false)
            setEditingCategory(null)
        }
        setSaving(false)
    }

    const getItemsForCategory = (categoryId) => items.filter(i => i.category_id === categoryId)

    if (loading) {
        return <div className={styles.loading}>Loading menu...</div>
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button onClick={() => router.push('/admin/dashboard')} className={styles.backBtn}>
                    ← Dashboard
                </button>
                <h1>Menu Management</h1>
                <button
                    className={styles.addCategoryBtn}
                    onClick={() => { setEditingCategory({}); setShowCategoryForm(true) }}
                >
                    + Add Category
                </button>
            </header>

            <div className={styles.content}>
                {categories.map(category => (
                    <section key={category.id} className={styles.categorySection}>
                        <div className={styles.categoryHeader}>
                            <h2>{category.name}</h2>
                            <div className={styles.categoryActions}>
                                <button
                                    className={styles.editBtn}
                                    onClick={() => { setEditingCategory(category); setShowCategoryForm(true) }}
                                >
                                    ✏️
                                </button>
                                <button
                                    className={styles.addItemBtn}
                                    onClick={() => {
                                        setEditingItem({ category_id: category.id })
                                        setShowItemForm(true)
                                    }}
                                >
                                    + Add Item
                                </button>
                            </div>
                        </div>

                        <div className={styles.itemsGrid}>
                            {getItemsForCategory(category.id).map(item => (
                                <div key={item.id} className={`${styles.itemCard} ${!item.is_available ? styles.soldOut : ''}`}>
                                    <div className={styles.itemInfo}>
                                        <h3>{item.name}</h3>
                                        {item.description && <p>{item.description}</p>}
                                        <span className={styles.itemPrice}>QR {Number(item.price).toFixed(2)}</span>
                                    </div>

                                    <div className={styles.itemActions}>
                                        <label className={styles.toggle}>
                                            <input
                                                type="checkbox"
                                                checked={item.is_available}
                                                onChange={() => toggleAvailability(item.id, item.is_available)}
                                            />
                                            <span className={styles.toggleLabel}>
                                                {item.is_available ? 'Available' : 'Sold Out'}
                                            </span>
                                        </label>

                                        <button
                                            className={styles.editBtn}
                                            onClick={() => { setEditingItem(item); setShowItemForm(true) }}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => deleteItem(item.id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {getItemsForCategory(category.id).length === 0 && (
                                <p className={styles.emptyMessage}>No items in this category</p>
                            )}
                        </div>
                    </section>
                ))}

                {categories.length === 0 && (
                    <p className={styles.emptyMessage}>No categories yet. Add your first category above.</p>
                )}
            </div>

            {/* Item Form Modal */}
            {showItemForm && (
                <ItemFormModal
                    item={editingItem}
                    categories={categories}
                    onSave={saveItem}
                    onClose={() => { setShowItemForm(false); setEditingItem(null) }}
                    saving={saving}
                />
            )}

            {/* Category Form Modal */}
            {showCategoryForm && (
                <CategoryFormModal
                    category={editingCategory}
                    onSave={saveCategory}
                    onClose={() => { setShowCategoryForm(false); setEditingCategory(null) }}
                    saving={saving}
                />
            )}
        </div>
    )
}

// ─── Item Form Modal ─────────────────────────────────────────
function ItemFormModal({ item, categories, onSave, onClose, saving }) {
    const [name, setName] = useState(item?.name || '')
    const [description, setDescription] = useState(item?.description || '')
    const [price, setPrice] = useState(item?.price || '')
    const [categoryId, setCategoryId] = useState(item?.category_id || '')
    const [imageUrl, setImageUrl] = useState(item?.image_url || '')
    const [hasVariants, setHasVariants] = useState(
        item?.has_variants || (item?.item_variants && item.item_variants.length > 0) || false
    )
    const [variantLabel, setVariantLabel] = useState(item?.variant_label || '')
    const [variants, setVariants] = useState(item?.item_variants || [])

    const [selectedGroupIds, setSelectedGroupIds] = useState(
        item?.item_modifier_groups?.map(g => g.group_id) || []
    )
    const [availableGroups, setAvailableGroups] = useState([])
    const [uploading, setUploading] = useState(false)


    useEffect(() => {
        const fetchGroups = async () => {
            const { data } = await supabase
                .from('modifier_groups')
                .select('id, name')
                .order('sort_order')
            if (data) setAvailableGroups(data)
        }
        fetchGroups()
    }, [])

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        const filename = `${Date.now()}-${file.name}`

        const { data, error } = await supabase.storage
            .from('menu-images')
            .upload(filename, file, { cacheControl: '3600', upsert: false })

        if (error) {
            console.error('Upload error:', error)
            setUploading(false)
            return
        }

        const { data: urlData } = supabase.storage
            .from('menu-images')
            .getPublicUrl(data.path)

        setImageUrl(urlData.publicUrl)
        setUploading(false)
    }


    const handleSubmit = (e) => {
        e.preventDefault()
        onSave({
            id: item?.id,
            name,
            description,
            price: parseFloat(price),
            category_id: categoryId,
            image_url: imageUrl || null,
            is_available: item?.is_available ?? true,
            has_variants: hasVariants,
            variant_label: variantLabel || 'Choose Option',
            variants: hasVariants ? variants : [],
            modifier_group_ids: selectedGroupIds,
        })
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <h2>{item?.id ? 'Edit Item' : 'Add Item'}</h2>

                <label>Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required />

                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} />

                <label>Price (QAR)</label>
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />

                <label>Category</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <label>Item Image</label>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Upload button */}
                    <label
                        style={{
                            padding: '10px 18px',
                            background: '#1a1a1a',
                            border: '1px solid #2a2a2a',
                            borderRadius: 8,
                            color: '#ccc',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: uploading ? 0.5 : 1,
                        }}
                    >
                        {uploading ? '⏳ Uploading...' : '📁 Upload Image'}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </label>

                    {/* Clear / remove image */}
                    {imageUrl && !uploading && (
                        <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            style={{
                                background: 'none',
                                border: '1px solid #3a3a3a',
                                borderRadius: 6,
                                color: '#999',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                            }}
                        >
                            ✕ Remove
                        </button>
                    )}
                </div>

                {/* Preview */}
                {imageUrl && (
                    <div style={{
                        marginTop: 10,
                        width: 100,
                        height: 100,
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '1px solid #2a2a2a',
                        background: '#0a0a0a',
                    }}>
                        <img
                            src={imageUrl}
                            alt="Preview"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    </div>
                )}

                {!imageUrl && (
                    <p style={{ color: '#666', fontSize: '0.75rem', margin: '6px 0 0' }}>No image uploaded</p>
                )}


                {/* Variants Toggle */}
                <div className={styles.variantToggle} onClick={() => setHasVariants(!hasVariants)}>
                    <input
                        type="checkbox"
                        checked={hasVariants}
                        onChange={(e) => setHasVariants(e.target.checked)}
                    />
                    <div className={styles.toggleSwitch} />
                    <span>This item has variants (e.g., Half/Full)</span>
                </div>

                {hasVariants && (
                    <div style={{ marginTop: 12, padding: 12, background: '#0a0a0a', borderRadius: 8 }}>
                        <label style={{ display: 'block', marginBottom: 8, color: '#999', fontSize: '0.85rem' }}>
                            Variant Label (e.g., "Size", "Portion")
                        </label>
                        <input
                            value={variantLabel}
                            onChange={e => setVariantLabel(e.target.value)}
                            placeholder=" example: Size, Portion"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: 8, background: '#0a0a0a', color: '#e0e0e0', fontSize: '0.95rem', marginBottom: 12 }}
                        />

                        {variants.map((v, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                <input
                                    placeholder="Name (e.g., Half)"
                                    value={v.name}
                                    onChange={e => {
                                        const updated = [...variants]
                                        updated[idx] = { ...updated[idx], name: e.target.value }
                                        setVariants(updated)
                                    }}
                                    style={{ flex: 2, padding: '8px 10px', border: '1px solid #2a2a2a', borderRadius: 6, background: '#0a0a0a', color: '#e0e0e0' }}
                                    required
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Price"
                                    value={v.price}
                                    onChange={e => {
                                        const updated = [...variants]
                                        updated[idx] = { ...updated[idx], price: e.target.value }
                                        setVariants(updated)
                                    }}
                                    style={{ flex: 1, padding: '8px 10px', border: '1px solid #2a2a2a', borderRadius: 6, background: '#0a0a0a', color: '#e0e0e0' }}
                                    required
                                />
                                <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#E63946', cursor: 'pointer', fontSize: '1.1rem' }}>
                                    🗑️
                                </button>
                            </div>
                        ))}

                        <button type="button" onClick={() => setVariants([...variants, { name: '', price: '', is_available: true }])} style={{ background: 'none', border: '1px dashed #3a3a3a', color: '#999', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            + Add Variant
                        </button>
                    </div>
                )}

                {/* Modifier Groups */}
                <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, color: '#999', fontSize: '0.85rem' }}>
                        Modifier Groups (add‑ons)
                    </label>
                    {availableGroups.length === 0 && (
                        <p style={{ color: '#666', fontSize: '0.8rem' }}>No groups yet. Create them in the Modifiers page.</p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {availableGroups.map(group => (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => setSelectedGroupIds(prev =>
                                    prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]
                                )}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    border: selectedGroupIds.includes(group.id) ? '1px solid #E63946' : '1px solid #2a2a2a',
                                    background: selectedGroupIds.includes(group.id) ? '#1b1b1b' : '#111',
                                    color: selectedGroupIds.includes(group.id) ? '#fff' : '#888',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                }}
                            >
                                {group.name} {selectedGroupIds.includes(group.id) ? '✓' : ''}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.modalActions}>
                    <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" disabled={saving} className={styles.saveBtn}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </div>
    )
}

// ─── Category Form Modal ──────────────────────────────────────
function CategoryFormModal({ category, onSave, onClose, saving }) {
    const [name, setName] = useState(category?.name || '')
    const [description, setDescription] = useState(category?.description || '')
    const [position, setPosition] = useState(category?.position || 0)


    const handleSubmit = (e) => {
        e.preventDefault()
        onSave({
            id: item?.id,
            name,
            description,
            price: parseFloat(price),
            category_id: categoryId,
            image_url: imageUrl || null,
            is_available: item?.is_available ?? true,
            has_variants: hasVariants,
            variant_label: variantLabel || 'Choose Option',
            variants: hasVariants ? variants : [],
        })
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <h2>{category?.id ? 'Edit Category' : 'Add Category'}</h2>

                <label>Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required />

                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} />

                <label>Sort Order</label>
                <input type="number" value={position} onChange={e => setPosition(e.target.value)} />

                <div className={styles.modalActions}>
                    <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" disabled={saving} className={styles.saveBtn}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </div>
    )
}