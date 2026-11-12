import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDesktop = mode === 'desktop'

  return {
    base: isDesktop ? './' : '/',
    plugins: [
      react(),
      ...(isDesktop
        ? [
            electron({
              main: {
                entry: 'electron/main.ts',
              },
              preload: {
                input: path.join(__dirname, 'electron/preload.ts'),
              },
              renderer: process.env.NODE_ENV === 'test' ? undefined : {},
            }),
          ]
        : []),
    ],
  }
})
