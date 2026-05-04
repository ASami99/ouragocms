import { createPublicClient, createAdminClient  } from '@/lib/supabaseClient'
import StoreHeader from '@/components/storefront/StoreHeader'
import ProductGrid from '@/components/storefront/ProductGrid'
import styles from './page.module.scss'

export default async function StorefrontPage({ searchParams }) {
  const supabase = createPublicClient() 

  const params = await searchParams
  const slug = params?.slug

  // No slug provided — show landing page
  if (!slug) {
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

  // Fetch restaurant by slug
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  // ADD THESE DEBUG LINES:
  console.log('Looking for slug:', slug)
  console.log('Restaurant found:', restaurant)
  // console.log('Error:', restaurantError)
  console.log('Error details:', JSON.stringify(restaurantError, null, 2))

  if (restaurantError || !restaurant) {
    return (
      <main className={styles.emptyState}>
        <h1>Restaurant not found</h1>
        <p>The restaurant "{slug}" doesn't exist or is currently unavailable.</p>
      </main>
    )
  }

  // Check if suspended
  if (restaurant.is_suspended) {
    return (
      <main className={styles.emptyState}>
        <h1>Temporarily Unavailable</h1>
        <p>{restaurant.name} is currently unavailable. Please try again later.</p>
      </main>
    )
  }

  // Fetch categories and menu items
  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, description, image_url, position')
      .eq('restaurants_id', restaurant.id)
      .eq('is_visible', true)
      .order('position', { ascending: true }),

    supabase
      .from('menu_items')
      .select(`id, name, description, price, image_url, category_id, is_available, is_featured, position, item_variants ( id, name, price, is_available ), item_addons ( id, name, price )`)
      .eq('restaurants_id', restaurant.id)
      .eq('is_available', true)
      .order('position', { ascending: true }),
  ])

  // Normalize to match existing ProductGrid component expectations
  const normalizedCategories = (categories || []).map(c => ({
    _id: c.id,
    name: c.name,
    sortOrder: c.position,
  }))

  const normalizedItems = (items || []).map(item => ({
    _id: item.id,
    name: item.name,
    description: item.description,
    priceQar: item.price,
    imageUrl: item.image_url,
    categoryId: item.category_id,
    isAvailable: item.is_available,
    isPopular: item.is_featured,
    hasVariants: item.item_variants && item.item_variants.length > 0,
    variantLabel: 'Choose Option', // future: store per restaurant
    variants: item.item_variants
      ? item.item_variants.map(v => ({
        name: v.name,
        priceQar: v.price,
        isAvailable: v.is_available,
      }))
      : [],
    hasAddons: item.item_addons && item.item_addons.length > 0,
    addons: item.item_addons
      ? item.item_addons.map(a => ({
        name: a.name,
        priceQar: a.price,
      }))
      : [],
  }))

  return (
    <main className={styles.main}>
      <StoreHeader
        name={restaurant.name}
        logoUrl={restaurant.logo_url}
        phone={restaurant.phone}
        address={restaurant.address}
        color={restaurant.primary_color}
      />
      <div className={styles.content}>
        {normalizedCategories.length > 0 ? (
          <ProductGrid
            categories={normalizedCategories}
            items={normalizedItems}
            restaurantId={restaurant.id}
            color={restaurant.primary_color}
            restaurantName={restaurant.name}
            restaurantPhone={restaurant.phone}
          />
        ) : (
          <div className={styles.emptyMenu}>
            <p>Menu coming soon. Please call us to order.</p>
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className={styles.callLink}>
                {restaurant.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  )
}