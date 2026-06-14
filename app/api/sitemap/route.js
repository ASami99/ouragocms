import { createPublicClient } from '@/lib/supabaseClient'

export async function GET() {
    const supabase = createPublicClient()
    const baseUrl = process.env.NEXT_PUBLIC_ROOT_DOMAIN
        ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
        : 'http://localhost:3000'

    const today = new Date().toISOString().split('T')[0]

    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('slug')
        .eq('is_active', true)

    const restaurantUrls = (restaurants || [])
        .map(
            (r) => `
  <url>
    <loc>${baseUrl}/?slug=${r.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
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
  </url>${restaurantUrls}
</urlset>`

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
    })
}