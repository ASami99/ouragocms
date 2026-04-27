import { headers } from 'next/headers'
import { createClient } from 'next-sanity'
import StoreHeader from '@/components/storefront/StoreHeader'
import ProductGrid from '@/components/storefront/ProductGrid'
import styles from './page.module.scss'

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export default async function StorefrontPage() {
  const headersList = await headers()

  const restaurantId = headersList.get('x-restaurant-id')
  const restaurantName = headersList.get('x-restaurant-name')
  const logoUrl = headersList.get('x-restaurant-logo')
  const phone = headersList.get('x-restaurant-phone')
  const address = headersList.get('x-restaurant-addr')
  const color = headersList.get('x-restaurant-color') || '#E63946'

  if (!restaurantId) {
    return (
      <main className={styles.emptyState}>
        <h1>Welcome to OuraGo</h1>
        <p>Visit a restaurant subdomain to see their menu.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
          Example: <code>localhost:3000?slug=shabab-al-afghan</code>
        </p>
      </main>
    )
  }

  // Fetch categories and items from Sanity
  const [categories, items] = await Promise.all([
    sanity.fetch(
      `*[_type == "category" && restaurant._ref == $restaurantId] | order(sortOrder asc) {
        _id,
        name,
        sortOrder,
      }`,
      { restaurantId }
    ),
    // ⭐ UPDATED QUERY - Now includes variants and add-ons
    sanity.fetch(
      `*[_type == "menuItem" && restaurant._ref == $restaurantId && isAvailable == true] | order(sortOrder asc) {
    _id,
    name,
    description,
    priceQar,
    "imageUrl": image.asset->url,
    "categoryId": category._ref,
    isAvailable,
    isPopular,
    hasVariants,
    variantLabel,
    "variants": variants[] {
      name,
      priceQar,
      isAvailable
    },
    hasAddons,
    "addons": addons[] {
      name,
      priceQar
    }
  }`,
      { restaurantId }
    ),
  ])

  return (
    <main className={styles.main}>
      <StoreHeader
        name={restaurantName}
        logoUrl={logoUrl}
        phone={phone}
        address={address}
        color={color}
      />
      <div className={styles.content}>
        {categories && categories.length > 0 ? (
          <ProductGrid
            categories={categories}
            items={items || []}
            restaurantId={restaurantId}
            color={color}
            restaurantName={restaurantName}
            restaurantPhone={phone}
          />
        ) : (
          <div className={styles.emptyMenu}>
            <p>Menu coming soon. Please call us to order.</p>
            {phone && (
              <a href={`tel:${phone}`} className={styles.callLink}>
                {phone}
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  )
}