import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

/*
 * Gera os ícones do app a partir de public/logo.svg.
 * Rode `pnpm generate-icons` sempre que trocar o logo (os PNGs vão para public/).
 *
 * `padding: 0`: o logo.svg já tem fundo próprio e deixa o desenho dentro da
 * zona segura (círculo central de 80%), então a margem extra do gerador só
 * deixaria o selo pequeno demais.
 */
const background = '#0e0d0c'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    // Fundo escuro em vez de branco nos ícones que não aceitam transparência.
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0,
      resizeOptions: { background },
    },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background } },
  },
  images: ['public/logo.svg'],
})
