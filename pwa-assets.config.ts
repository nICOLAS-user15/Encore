import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

/*
 * Generates the app icons from public/logo.svg.
 * Run `pnpm generate-icons` whenever the logo changes (the PNGs go to public/).
 *
 * `padding: 0`: logo.svg already has its own background and keeps the drawing inside the
 * safe zone (80% central circle), so the generator's extra margin would only
 * make the stamp too small.
 */
const background = '#0e0d0c'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    // Dark background instead of white on icons that do not accept transparency.
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0,
      resizeOptions: { background },
    },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background } },
  },
  images: ['public/logo.svg'],
})
