'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import styles from './ProductModal.module.scss'

export default function ProductModal({
    item,
    isOpen,
    onClose,
    onAddToCart,
    color = '#E63946'
}) {
    const [selectedVariant, setSelectedVariant] = useState(null)
    const [selectedAddons, setSelectedAddons] = useState([])
    const [quantity, setQuantity] = useState(1)
    const [imgError, setImgError] = useState(false)
    const [added, setAdded] = useState(false)

    // Reset state when modal opens with new item
    useEffect(() => {
        if (isOpen && item) {
            // Set default variant (first available)
            if (item.hasVariants && item.variants?.length > 0) {
                const defaultVariant = item.variants.find(v => v.isAvailable !== false) || item.variants[0]
                setSelectedVariant(defaultVariant)
            } else {
                setSelectedVariant(null)
            }
            setSelectedAddons([])
            setQuantity(1)
            setAdded(false)
        }
    }, [isOpen, item])

    if (!isOpen || !item) return null

    // Calculate total price
    const calculateTotal = () => {
        let total = 0

        // Base price or variant price
        if (item.hasVariants && selectedVariant) {
            total = selectedVariant.priceQar || 0
        } else {
            total = item.priceQar || 0
        }

        // Add add-ons
        selectedAddons.forEach(addon => {
            total += addon.priceQar || 0
        })

        return total * quantity
    }

    const toggleAddon = (addon) => {
        setSelectedAddons(prev => {
            const exists = prev.find(a => a.name === addon.name)
            if (exists) {
                return prev.filter(a => a.name !== addon.name)
            } else {
                return [...prev, addon]
            }
        })
    }

    const handleAddToCart = () => {
        const cartItem = {
            ...item,
            selectedVariant: item.hasVariants ? selectedVariant : null,
            selectedAddons: selectedAddons,
            quantity: quantity,
            totalPrice: calculateTotal(),
            unitPrice: item.hasVariants && selectedVariant ? selectedVariant.priceQar : item.priceQar,
        }

        onAddToCart(cartItem)
        setAdded(true)

        setTimeout(() => {
            onClose()
            setAdded(false)
        }, 800)
    }

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={handleBackdropClick}>
            <div className={styles.modal} style={{ '--primary': color }}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                    ×
                </button>

                {/* Image Section */}
                <div className={styles.imageSection}>
                    {item.imageUrl && !imgError ? (
                        <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className={styles.modalImage}
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className={styles.imageFallback}>
                            <span>🍽️</span>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className={styles.content}>
                    <h2 className={styles.title}>{item.name}</h2>
                    {item.description && (
                        <p className={styles.description}>{item.description}</p>
                    )}

                    {/* Variants Selection */}
                    {item.hasVariants && item.variants && item.variants.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                {item.variantLabel || 'Choose Option'}
                                {selectedVariant?.isAvailable === false && (
                                    <span className={styles.unavailable}> (Unavailable)</span>
                                )}
                            </h3>
                            <div className={styles.variantGrid}>
                                {item.variants.map((variant, idx) => (
                                    <button
                                        key={idx}
                                        className={`${styles.variantBtn} ${selectedVariant?.name === variant.name ? styles.selected : ''
                                            } ${variant.isAvailable === false ? styles.disabled : ''}`}
                                        onClick={() => variant.isAvailable !== false && setSelectedVariant(variant)}
                                        disabled={variant.isAvailable === false}
                                    >
                                        <span className={styles.variantName}>{variant.name}</span>
                                        <span className={styles.variantPrice}>
                                            QR {Number(variant.priceQar).toFixed(2)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add-ons Selection */}
                    {item.hasAddons && item.addons && item.addons.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Add Extra</h3>
                            <div className={styles.addonList}>
                                {item.addons.map((addon, idx) => (
                                    <label key={idx} className={styles.addonItem}>
                                        <input
                                            type="checkbox"
                                            checked={selectedAddons.some(a => a.name === addon.name)}
                                            onChange={() => toggleAddon(addon)}
                                        />
                                        <span className={styles.addonName}>{addon.name}</span>
                                        <span className={styles.addonPrice}>
                                            {addon.priceQar > 0 ? `+QR ${addon.priceQar.toFixed(2)}` : 'Free'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity & Total */}
                    <div className={styles.quantitySection}>
                        <div className={styles.quantityControl}>
                            <button
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                disabled={quantity <= 1}
                            >
                                −
                            </button>
                            <span className={styles.quantity}>{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)}>
                                +
                            </button>
                        </div>

                        <div className={styles.totalSection}>
                            <span className={styles.totalLabel}>Total:</span>
                            <span className={styles.totalPrice}>
                                QR {calculateTotal().toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                        className={`${styles.addToCartBtn} ${added ? styles.added : ''}`}
                        onClick={handleAddToCart}
                        disabled={
                            (item.hasVariants && !selectedVariant) ||
                            (selectedVariant?.isAvailable === false)
                        }
                    >
                        {added ? '✓ Added to Cart!' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </div>
    )
}