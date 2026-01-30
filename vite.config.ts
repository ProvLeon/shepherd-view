import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'
import tailwindcss from '@tailwindcss/vite'

// Virtual module for injected head scripts
const virtualModuleId = 'tanstack-start-injected-head-scripts:v'
const resolvedVirtualModuleId = '\0' + virtualModuleId

// Virtual module plugin
const virtualModulePlugin = {
  name: 'virtual-module',
  resolveId(id) {
    if (id === virtualModuleId) {
      return resolvedVirtualModuleId
    }
  },
  load(id) {
    if (id === resolvedVirtualModuleId) {
      return 'export const injectedHeadScripts = "";'
    }
  },
}

const config = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    // TanStack Start must come before React plugin
    tanstackStart(),
    viteReact(),

    // Tools and configs
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    devtools(),
    virtualModulePlugin,
    tailwindcss(),
  ],
  optimizeDeps: {
    exclude: ['node:stream', 'node:stream/web'],
  },
  server: {
    hmr: {
      overlay: false
    }
  },
  build: {
    rollupOptions: {
      external: ['postgres', 'drizzle-orm', 'dotenv', 'googleapis'],
    },
  },
})

export default config
