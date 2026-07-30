import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Evento-Patin/',
  plugins: [react()],
  build: {
    outDir: 'dist-pages',
  },
})
