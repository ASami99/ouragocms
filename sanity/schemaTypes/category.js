export default {
  name: 'category',
  title: 'Categories',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Category Name',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'restaurant',
      title: 'Restaurant',
      type: 'reference',
      to: [{ type: 'restaurant' }],
      validation: Rule => Rule.required(),
    },
    {
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      initialValue: 0,
    },
  ],
}