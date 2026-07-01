import { headers } from 'next/headers'

export async function generateMetadata() {
  const headersList = await headers()
  const name = headersList.get('x-restaurant-name') || 'Restaurant'
  const color = headersList.get('x-restaurant-color') || '#E63946'
  const addr = headersList.get('x-restaurant-addr') || 'Doha, Qatar'
  const metaTitle = headersList.get('x-restaurant-meta-title') || ''
  const metaDescription = headersList.get('x-restaurant-meta-description') || ''

  const title = metaTitle || `${name} — Order Online | OuraGo`
  const description = metaDescription || `Order directly from ${name}, ${addr}. Fast delivery in Doha, Qatar. Pay cash on delivery.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: 'en_QA',
      type: 'website',
    },
  }
}

export async function generateViewport() {
  const headersList = await headers()
  const color = headersList.get('x-restaurant-color') || '#E63946'
  return {
    themeColor: color,
  }
}

export default async function StorefrontLayout({ children }) {
  const headersList = await headers()
  const color = headersList.get('x-restaurant-color') || '#E63946'

  return (
    <div style={{ '--primary': color }}>
      {children}
    </div>
  )
}
