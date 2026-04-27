import { groq } from 'next-sanity'

export const restaurantBySlugQuery = groq`
  *[_type == "restaurant" && slug.current == $slug && isActive == true][0] {
    _id,
    name,
    "slug": slug.current,
    "logoUrl": logo.asset->url,
    phone,
    whatsapp,
    email,
    address,
    primaryColor,
  }
`

export const categoriesByRestaurantQuery = groq`
  *[_type == "category" && restaurant._ref == $restaurantId] | order(sortOrder asc) {
    _id,
    name,
    sortOrder,
  }
`

export const itemsByRestaurantQuery = groq`
  *[_type == "menuItem" && restaurant._ref == $restaurantId && isAvailable == true] | order(sortOrder asc) {
    _id,
    name,
    description,
    priceQar,
    "imageUrl": image.asset->url,
    "categoryId": category._ref,
    isAvailable,
    sortOrder,
  }
`