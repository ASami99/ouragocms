// proxy.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function proxy(request) {
    const url = request.nextUrl
    const hostname = request.headers.get('host') || ''
    const hostWithoutPort = hostname.split(':')[0]

    // 1. Determine the restaurant slug or domain
    let slug = null
    let domain = null

    if (hostWithoutPort === 'localhost' || hostWithoutPort === ROOT_DOMAIN) {
        // local development: use ?slug= parameter
        slug = url.searchParams.get('slug') || null
        domain = null
    } else if (hostWithoutPort.endsWith(`.${ROOT_DOMAIN}`)) {
        // Subdomain: restaurant-name.ourago.qa → slug
        slug = hostWithoutPort.replace(`.${ROOT_DOMAIN}`, '')
        domain = null
    } else {
        // Custom domain (like kfc.com)
        domain = hostWithoutPort
        slug = null
    }

    // 2. Allow internal routes to pass through without restaurant lookup
    const isInternal =
        url.pathname.startsWith('/_next') ||
        url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/studio') ||
        url.pathname.startsWith('/admin') ||
        url.pathname.includes('favicon')

    if (isInternal) {
        return NextResponse.next()
    }

    // 3. If no identifier, return empty headers (landing page)
    if (!slug && !domain) {
        const response = NextResponse.next()
        response.headers.set('x-restaurant-id', '')
        response.headers.set('x-restaurant-name', '')
        response.headers.set('x-restaurant-color', '#E63946')
        return response
    }

    // 4. Fetch restaurant from Supabase
    let query = supabase
        .from('restaurants')
        .select('id, name, slug, primary_color, phone, whatsapp, email, address, logo_url, is_active')
        .eq('is_active', true)

    if (slug) {
        query = query.eq('slug', slug)
    } else if (domain) {
        // domain column is nullable; use exact match
        query = query.eq('domain', domain)
    }

    const { data: restaurant, error } = await query.maybeSingle()

    if (error || !restaurant) {
        // No restaurant found → pass through (you could show a 404 later)
        const response = NextResponse.next()
        response.headers.set('x-restaurant-id', '')
        response.headers.set('x-restaurant-name', 'Not Found')
        response.headers.set('x-restaurant-color', '#E63946')
        return response
    }

    // 5. Inject restaurant headers
    const response = NextResponse.next()
    response.headers.set('x-restaurant-id', restaurant.id)
    response.headers.set('x-restaurant-slug', restaurant.slug || '')
    response.headers.set('x-restaurant-name', restaurant.name || '')
    response.headers.set('x-restaurant-color', restaurant.primary_color || '#E63946')
    response.headers.set('x-restaurant-phone', restaurant.phone || '')
    response.headers.set('x-restaurant-wa', restaurant.whatsapp || '')
    response.headers.set('x-restaurant-email', restaurant.email || '')
    response.headers.set('x-restaurant-addr', restaurant.address || '')
    response.headers.set('x-restaurant-logo', restaurant.logo_url || '')

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}