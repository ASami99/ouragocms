'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProductCard from './ProductCard'
import ProductModal from './ProductModal'
import styles from './ProductGrid.module.scss'
export default function ProductGrid({ categories, items, restaurantId, color, restaurantName, restaurantPhone, isOrderingEnabled = true }) {
  const router = useRouter()
  const [cart, setCart] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(
    categories.length > 0 ? categories[0]._id : null
  )

  const handleCardClick = (item) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleAddToCart = useCallback((cartItem) => {
    setCart((prev) => {
      // Create unique key based on item + variant + addons
      const itemKey = `${cartItem._id}-${cartItem.selectedVariant?.name || 'base'}-${cartItem.selectedAddons?.map(a => a.name).join(',') || ''
        }`

      const existing = prev.find((c) => c.cartKey === itemKey)

      let newCart
      if (existing) {
        newCart = prev.map((c) =>
          c.cartKey === itemKey
            ? { ...c, quantity: c.quantity + cartItem.quantity }
            : c
        )
      } else {
        newCart = [...prev, { ...cartItem, cartKey: itemKey }]
      }

      // Save to localStorage
      localStorage.setItem('ouragocms-cart', JSON.stringify(newCart))
      localStorage.setItem('ouragocms-restaurant-name', restaurantName)
      localStorage.setItem('ouragocms-restaurant-color', color)
      localStorage.setItem('ouragocms-restaurant-id', restaurantId)
      localStorage.setItem('ouragocms-restaurant-phone', restaurantPhone || '')

      return newCart
    })
  }, [restaurantName, color, restaurantId, restaurantPhone])

  function getItemsForCategory(categoryId) {
    return items.filter((item) => item.categoryId === categoryId)
  }

  const goToCart = () => {
    router.push('/cart')
  }

  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0)
  const totalPrice = cart.reduce((sum, c) => sum + c.totalPrice, 0)

  return (
    <div className={styles.wrapper} style={{ '--primary': color }}>

      {/* Category tabs */}
      {categories.length > 1 && (
        <nav className={styles.categoryNav} aria-label="Menu categories">
          {categories.map((cat) => (
            <button
              key={cat._id}
              className={`${styles.catBtn} ${activeCategory === cat._id ? styles.catBtnActive : ''
                }`}
              onClick={() => setActiveCategory(cat._id)}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      )}

      {/* Item sections */}
      <div className={styles.sections}>
        {categories.map((cat) => {
          const catItems = getItemsForCategory(cat._id)
          if (catItems.length === 0) return null
          if (activeCategory && activeCategory !== cat._id) return null

          return (
            <section key={cat._id} className={styles.section}>
              <h2 className={styles.categoryTitle}>{cat.name}</h2>
              <div className={styles.grid}>
                {catItems.map((item) => (
                  <ProductCard
                    key={item._id}
                    item={item}
                    color={color}
                    onCardClick={handleCardClick}
                    isOrderingEnabled={isOrderingEnabled}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {/* Uncategorised items */}
        {(() => {
          const uncategorised = items.filter((i) => !i.categoryId)
          if (uncategorised.length === 0) return null
          return (
            <section key="uncategorised" className={styles.section}>
              <h2 className={styles.categoryTitle}>Menu</h2>
              <div className={styles.grid}>
                {uncategorised.map((item) => (
                  <ProductCard
                    key={item._id}
                    item={item}
                    color={color}
                    onCardClick={handleCardClick}
                    isOrderingEnabled={isOrderingEnabled}
                  />
                ))}
              </div>
            </section>
          )
        })()}
      </div>

      {/* Product Modal */}
      <ProductModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
        color={color}
        isOrderingEnabled={isOrderingEnabled}
      />

      {/* Floating cart bar */}
      {totalItems > 0 && isOrderingEnabled && (
        <div className={styles.cartBar}>
          <div className={styles.cartInfo}>
            <span className={styles.cartCount}>
              {totalItems} item{totalItems > 1 ? 's' : ''}
            </span>
            <span className={styles.cartDivider}>·</span>
            <span className={styles.cartTotal}>
              QR {totalPrice.toFixed(2)}
            </span>
          </div>
          <button className={styles.cartBtn} onClick={goToCart}>
            View Order →
          </button>
        </div>
      )}
    </div>
  )
}