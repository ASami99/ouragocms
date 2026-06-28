import { headers } from 'next/headers'

export async function generateMetadata() {
  const headersList = await headers()
  const name = headersList.get('x-restaurant-name') || 'Restaurant'
  const color = headersList.get('x-restaurant-color') || '#E63946'
  const addr = headersList.get('x-restaurant-addr') || 'Doha, Qatar'
  const metaTitle = headersList.get('x-restaurant-meta-title') || ''
  const metaDescription = headersList.get('x-restaurant-meta-description') || ''

  return {
    title: `${metaTitle || name} — Order Online | OuraGo`,
    description: metaDescription || `Order directly from ${name}, ${addr}. Fast delivery in Doha, Qatar. Pay cash on delivery.`,
    themeColor: color,
    openGraph: {
      title: `${metaTitle || name} — Order Online`,
      description: metaDescription || `Order directly from ${name} in Doha, Qatar.`,
      locale: 'en_QA',
      type: 'website',
    },
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