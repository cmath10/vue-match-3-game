import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const ENV_PROD = 'prod'
const DEFAULT_PORT = 8080

const getEnvironment = () => {
  if (process.env.CORP_YST_ENV) {
    return process.env.CORP_YST_ENV
  }

  if (process.env.NODE_ENV === 'production') {
    return ENV_PROD
  }

  return 'dev'
}

const isProd = getEnvironment() === ENV_PROD

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      assets: path.resolve(__dirname, 'src/assets'),
      components: path.resolve(__dirname, 'src/components'),
      entities: path.resolve(__dirname, 'src/entities'),
      utils: path.resolve(__dirname, 'src/utils'),
      views: path.resolve(__dirname, 'src/views'),
    },
  },

  base: isProd ? '/vue-match-3-game/' : '/',

  build: {
    sourcemap: false,
    rollupOptions: {
      output: isProd
        ? {
            entryFileNames: 'js/[name].[hash].js',
            chunkFileNames: 'js/[name].[hash].js',
            assetFileNames: assetInfo => {
              const name = assetInfo.names[0] || ''

              return name.endsWith('.css')
                ? 'css/[name].[hash][extname]'
                : 'assets/[name].[hash][extname]'
            },
          }
      : undefined,
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['import'],
      },
    },
  },

  server: {
    port: Number(process.env.PORT_VUE) || DEFAULT_PORT,
    strictPort: true,
    allowedHosts: [
      'vue-match-3-game.local',
      'vue-match-3-game.test',
    ],
  },
})
