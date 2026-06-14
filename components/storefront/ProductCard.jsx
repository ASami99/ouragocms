'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './ProductCard.module.scss'

export default function ProductCard({ item, onCardClick, color, isOrderingEnabled = true }) {
  const [imgError, setImgError] = useState(false)

  const handleClick = () => {
    if (item.isAvailable  && isOrderingEnabled) {
      onCardClick(item)
    }
  }

  return (
    <article
      className={`${styles.card} ${!item.isAvailable ? styles.disabled : ''}`}
      style={{ '--primary': color }}
      onClick={handleClick}
    >
      {/* Image */}
      <div className={styles.imageWrap}>
        {item.imageUrl && !imgError ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={styles.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.imageFallback}>
            <span>🍽️</span>
          </div>
        )}

        {!item.isAvailable && (
          <div className={styles.unavailableBadge}>Sold Out</div>
        )}
      </div>

      {/* Body */}
      <div className={styles.body}>
        <h3 className={styles.name}>{item.name}</h3>

        {item.description && (
          <p className={styles.description}>{item.description}</p>
        )}

        <div className={styles.footer}>
          <span className={styles.price}>
            QR {Number(item.priceQar).toFixed(2)}
          </span>

          <button
            className={styles.addBtn}
            onClick={(e) => {
              e.stopPropagation()
              if (item.isAvailable && isOrderingEnabled) handleClick()
            }}
            disabled={!item.isAvailable || !isOrderingEnabled}
          >
            {!isOrderingEnabled ? 'Closed' : !item.isAvailable ? 'Sold Out' : 'Add'}
          </button>
        </div>
      </div>
    </article>
  )
}