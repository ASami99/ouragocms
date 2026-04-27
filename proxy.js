import { NextResponse } from 'next/server'
import { createClient } from 'next-sanity'

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'localhost'

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function proxy(request) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const hostWithoutPort = hostname.split(':')[0]

  let slug = null

  if (hostWithoutPort === 'localhost' || hostWithoutPort === ROOT_DOMAIN) {
    slug = url.searchParams.get('slug') || null
  } else if (hostWithoutPort.endsWith(`.${ROOT_DOMAIN}`)) {
    slug = hostWithoutPort.replace(`.${ROOT_DOMAIN}`, '')
  } else if (hostWithoutPort.endsWith('.localhost')) {
    slug = hostWithoutPort.replace('.localhost', '')
  }

  const isInternal =
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/studio') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('favicon')

  if (isInternal) {
    return NextResponse.next()
  }

  if (!slug) {
    const response = NextResponse.next()
    response.headers.set('x-restaurant-id', '')
    response.headers.set('x-restaurant-name', '')
    response.headers.set('x-restaurant-color', '#E63946')
    return response
  }

  // Fetch from Sanity
  const restaurant = await sanity.fetch(
    `*[_type == "restaurant" && slug.current == $slug && isActive == true][0] {
      _id,
      name,
      "slug": slug.current,
      "logoUrl": logo.asset->url,
      phone,
      whatsapp,
      email,
      address,
      primaryColor,
    }`,
    { slug }
  )

  if (!restaurant) {
    url.pathname = '/not-found'
    return NextResponse.rewrite(url)
  }

  const response = NextResponse.next()
  response.headers.set('x-restaurant-id',    restaurant._id)
  response.headers.set('x-restaurant-slug',  restaurant.slug)
  response.headers.set('x-restaurant-name',  restaurant.name)
  response.headers.set('x-restaurant-color', restaurant.primaryColor || '#E63946')
  response.headers.set('x-restaurant-phone', restaurant.phone || '')
  response.headers.set('x-restaurant-wa',    restaurant.whatsapp || '')
  response.headers.set('x-restaurant-email', restaurant.email || '')
  response.headers.set('x-restaurant-addr',  restaurant.address || '')
  response.headers.set('x-restaurant-logo',  restaurant.logoUrl || '')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}