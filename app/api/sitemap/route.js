import { headers } from 'next/headers'
import { createPublicClient } from '@/lib/supabaseClient'

export async function GET() {
    const headersList = await headers()
    const restaurantId = headersList.get('x-restaurant-id')
    const host = headersList.get('host') || 'localhost:3000'
    const baseUrl = `https://${host}`

    const today = new Date().toISOString().split('T')[0]

    if (!restaurantId) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ourago.qa/</loc>
    <lastmod>${today}</lastmod>
  </url>
</urlset>`
        return new Response(xml, {
            headers: { 'Content-Type': 'application/xml' },
        })
    }

    const supabase = createPublicClient()
    const { data: items } = await supabase
        .from('items')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)

    const itemUrls = (items || [])
        .map(
            (item) => `
  <url>
    <loc>${baseUrl}/item/${item.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
        )
        .join('')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${itemUrls}
</urlset>`

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
    })
}