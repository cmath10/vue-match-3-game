const assetModules = import.meta.glob('./assets/images/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
})

export const assetUrls = Object.values(assetModules) as string[]
