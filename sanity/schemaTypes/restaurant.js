export default {
  name: 'restaurant',
  title: 'Restaurants',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Restaurant Name',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug (subdomain)',
      type: 'slug',
      description: 'e.g. "pizza-doha" for pizza-doha.ourago.qa',
      options: { source: 'name' },
      validation: Rule => Rule.required(),
    },
    {
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'phone',
      title: 'Phone',
      type: 'string',
      description: '+974 XXXX XXXX',
    },
    {
      name: 'whatsapp',
      title: 'WhatsApp Number',
      type: 'string',
      description: '974XXXXXXXX (no + sign)',
    },
    {
      name: 'email',
      title: 'Email',
      type: 'string',
    },
    {
      name: 'address',
      title: 'Address',
      type: 'text',
    },
    {
      name: 'primaryColor',
      title: 'Brand Color',
      type: 'string',
      description: 'Hex color e.g. #E63946',
      initialValue: '#E63946',
    },
    {
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
    },
  ],
}