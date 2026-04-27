export default {
  name: 'menuItem',
  title: 'Menu Items',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Item Name',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
    },
    {
      name: 'priceQar',
      title: 'Base Price (QAR)',
      description: 'Starting price. If variants exist, this is the minimum price.',
      type: 'number',
      validation: Rule => Rule.required().min(0),
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: Rule => Rule.required(),
    },
    {
      name: 'restaurant',
      title: 'Restaurant',
      type: 'reference',
      to: [{ type: 'restaurant' }],
      validation: Rule => Rule.required(),
    },

    // ─── Variants (e.g. Half / Full) ─────────────────────────────
    {
      name: 'hasVariants',
      title: 'Has Variants?',
      description: 'Enable if item has options like Half/Full, Small/Medium/Large',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'variantLabel',
      title: 'Variant Label',
      description: 'e.g. "Size", "Portion", "Type"',
      type: 'string',
      hidden: ({ document }) => !document?.hasVariants,
    },
    {
      name: 'variants',
      title: 'Variants',
      description: 'Add options like Half, Full, Small, Medium, Large',
      type: 'array',
      hidden: ({ document }) => !document?.hasVariants,
      of: [
        {
          type: 'object',
          name: 'variant',
          fields: [
            {
              name: 'name',
              title: 'Option Name',
              type: 'string',
              description: 'e.g. Half, Full, Small, Medium, Large',
              validation: Rule => Rule.required(),
            },
            {
              name: 'priceQar',
              title: 'Price (QAR)',
              type: 'number',
              description: 'Full price for this variant',
              validation: Rule => Rule.required().min(0),
            },
            {
              name: 'isAvailable',
              title: 'Available',
              type: 'boolean',
              initialValue: true,
            },
          ],
          preview: {
            select: {
              title: 'name',
              subtitle: 'priceQar',
            },
            prepare({ title, subtitle }) {
              return {
                title: title,
                subtitle: `QR ${subtitle}`,
              }
            },
          },
        },
      ],
    },

    // ─── Add-ons (e.g. Extra Sauce, Extra Cheese) ─────────────────
    {
      name: 'hasAddons',
      title: 'Has Add-ons?',
      description: 'Enable if item has optional extras like sauces, toppings',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'addons',
      title: 'Add-ons',
      description: 'Optional extras customer can add',
      type: 'array',
      hidden: ({ document }) => !document?.hasAddons,
      of: [
        {
          type: 'object',
          name: 'addon',
          fields: [
            {
              name: 'name',
              title: 'Add-on Name',
              type: 'string',
              description: 'e.g. Extra Sauce, Extra Cheese, Fries',
              validation: Rule => Rule.required(),
            },
            {
              name: 'priceQar',
              title: 'Extra Price (QAR)',
              type: 'number',
              description: '0 if free',
              initialValue: 0,
              validation: Rule => Rule.min(0),
            },
          ],
          preview: {
            select: {
              title: 'name',
              subtitle: 'priceQar',
            },
            prepare({ title, subtitle }) {
              return {
                title: title,
                subtitle: subtitle > 0 ? `+QR ${subtitle}` : 'Free',
              }
            },
          },
        },
      ],
    },

    {
      name: 'isAvailable',
      title: 'Is Available',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'isPopular',
      title: 'Mark as Popular',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      initialValue: 0,
    },
  ],

  preview: {
    select: {
      title: 'name',
      subtitle: 'priceQar',
      media: 'image',
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: `QR ${subtitle}`,
        media,
      }
    },
  },
}