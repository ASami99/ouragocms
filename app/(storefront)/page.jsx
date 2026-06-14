import Script from 'next/script'
import { createPublicClient, createAdminClient } from '@/lib/supabaseClient'
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

  const openingHours = restaurant.opening_hours
  const isAcceptingOrders = restaurant.is_accepting_orders ?? true

  // Determine if the restaurant is currently open
  let isOpen = true   // default: always open if no schedule
  if (openingHours) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const now = new Date()
    const currentDay = days[now.getDay()]
    const currentTime = now.getHours() * 60 + now.getMinutes()   // minutes since midnight

    const todaySchedule = openingHours[currentDay]
    if (todaySchedule?.open && todaySchedule?.close) {
      const [openH, openM] = todaySchedule.open.split(':').map(Number)
      const [closeH, closeM] = todaySchedule.close.split(':').map(Number)
      const openMin = openH * 60 + openM
      const closeMin = closeH * 60 + closeM

      if (closeMin > openMin) {
        // Normal hours (e.g., 10:00–22:00)
        isOpen = currentTime >= openMin && currentTime <= closeMin
      } else {
        // Overnight (e.g., 14:00–01:00)
        isOpen = currentTime >= openMin || currentTime <= closeMin
      }
    } else {
      isOpen = false   // no schedule set = closed
    }
  }

  // Determine if restaurant is paused (manual or timed)
  let isPaused = !isAcceptingOrders
  if (!isAcceptingOrders && restaurant.orders_paused_until) {
    const pauseUntil = new Date(restaurant.orders_paused_until)
    if (pauseUntil.getTime() <= Date.now()) {
      isPaused = false   // timed pause expired
    }
  }

  const isOrderingEnabled = isOpen && !isPaused

  // const isOrderingEnabled = isOpen && isAcceptingOrders

  // Build JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    telephone: restaurant.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address,
      addressLocality: restaurant.city || 'Doha',
      addressCountry: 'QA',
    },
    image: restaurant.logo_url || undefined,
    servesCuisine: [],
    openingHoursSpecification: restaurant.opening_hours
      ? Object.entries(restaurant.opening_hours)
          .filter(([_, times]) => times.open && times.close)
          .map(([day, times]) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
            opens: times.open,
            closes: times.close,
          }))
      : undefined,
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
      .select(`
    id, name, description, price, image_url, category_id,
    is_available, is_featured, position,
    has_variants, variant_label,
    item_variants ( id, name, price, is_available ),
    item_modifier_groups (
      group_id,
      modifier_groups (
        id,
        name,
        selection_type,
        modifiers ( id, name, price, is_available )
      )
    )
  `)
      .eq('restaurants_id', restaurant.id)
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
    variantLabel: item.variant_label || 'Choose Option',
    variants: item.item_variants
      ? item.item_variants.map(v => ({
        name: v.name,
        priceQar: v.price,
        isAvailable: v.is_available,
      }))
      : [],
    // ─── New modifier mapping ───
    hasAddons: item.item_modifier_groups?.length > 0,
    addons: item.item_modifier_groups?.flatMap(ig =>
      ig.modifier_groups?.modifiers?.map(m => ({
        name: m.name,
        priceQar: m.price,
        groupName: ig.modifier_groups.name,
      })) || []
    ) || [],

  }))

  return (
    <main className={styles.main}>
      <Script
        id="restaurant-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StoreHeader
        name={restaurant.name}
        logoUrl={restaurant.logo_url}
        phone={restaurant.phone}
        address={restaurant.address}
        color={restaurant.primary_color}
      />


      {!isOrderingEnabled && (
        <div style={{
          background: '#1a1a1a',
          color: '#F4A261',
          textAlign: 'center',
          padding: '12px 16px',
          fontSize: '0.9rem',
          borderBottom: '1px solid #2a2a2a',
        }}>
          {isPaused
            ? (restaurant.orders_paused_until
              ? `🕐 Orders paused until ${new Date(restaurant.orders_paused_until).toLocaleTimeString('en-QA', { hour: '2-digit', minute: '2-digit' })}.`
              : '🕐 Orders are temporarily paused. Please check back later.'
            )
            : `🕐 We're currently closed. We'll be open at ...`
          }
        </div>
      )}

      <div className={styles.content}>
        {normalizedCategories.length > 0 ? (
          <ProductGrid
            categories={normalizedCategories}
            items={normalizedItems}
            restaurantId={restaurant.id}
            color={restaurant.primary_color}
            restaurantName={restaurant.name}
            restaurantPhone={restaurant.phone}
            isOrderingEnabled={isOrderingEnabled}

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