/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const DARK = '#0e0d0c'

/** Versão do package.json, mostrada na tela "Sobre". */
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  // `define` troca o texto __APP_VERSION__ no código pelo valor, na hora do build.
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': uma versão nova só entra quando o usuário toca em "Atualizar".
      // Evita recarregar o app sozinho no meio de uma série.
      registerType: 'prompt',
      // Os ícones já entram no precache pelo globPatterns abaixo; sem isto, entrariam em dobro.
      includeManifestIcons: false,
      manifest: {
        name: 'Encore',
        short_name: 'Encore',
        description: 'Log de treino de musculação que funciona offline.',
        lang: 'pt-BR',
        start_url: '/treino',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: DARK,
        background_color: DARK,
        // Gerados por `pnpm generate-icons` (ver pwa-assets.config.ts).
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache de TODO o app (código, estilos, fontes e ícones).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Qualquer navegação (ex.: abrir /historico sem internet) cai no index.html,
        // e o React Router decide qual tela mostrar.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    // Simula o navegador (DOM) no Node para testar componentes.
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
})
