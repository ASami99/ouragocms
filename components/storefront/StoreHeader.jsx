import Image from 'next/image'
import styles from './StoreHeader.module.scss'

export default function StoreHeader({ name, logoUrl, phone, address, color }) {
    return (
        <header className={styles.header}>
            {/* Top bar with restaurant brand */}
            <div className={styles.topBar}>
                <div className={styles.brand}>
                    {logoUrl ? (
                        <div className={styles.logoWrap}>
                            <Image
                                src={logoUrl}
                                alt={`${name} logo`}
                                width={56}
                                height={56}
                                className={styles.logo}
                            />
                        </div>
                    ) : (
                        <div
                            className={styles.logoPlaceholder}
                            style={{ background: color || '#E63946' }}
                        >
                            {name ? name.charAt(0).toUpperCase() : 'R'}
                        </div>
                    )}

                    <div className={styles.info}>
                        <h1 className={styles.name}>{name}</h1>
                        {address && <p className={styles.address}>{address}</p>}
                    </div>
                </div>

                <div className={styles.actions}>
                    {phone && (

                        <a href={`tel:${phone}`}
                            className={styles.phoneBtn}
                            style={{ '--primary': color }}
                        >
                            <span className={styles.phoneIcon}>📞</span>
                            {phone}
                        </a>
                    )}
                </div>
            </div>

            {/* Accent bar using restaurant primary color */}
            <div
                className={styles.accentBar}
                style={{ background: color || '#E63946' }}
            />
        </header>
    )
}