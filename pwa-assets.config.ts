import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Génère les icônes PWA (64, 192, 512, maskable, apple-touch, favicon.ico)
// à partir de public/favicon.svg : `npm run icons`.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#5a5cf6' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#5a5cf6' } },
  },
  images: ['public/favicon.svg'],
})
