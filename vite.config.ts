import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Don't reload when whatsapp-web.js writes its session/cache files.
      ignored: ['**/.wwebjs_auth/**', '**/.wwebjs_cache/**'],
    },
  },
})
