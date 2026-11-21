import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://myvirtualclone.github.io/recipes/ (own repo, own Pages deploy).
export default defineConfig({
  base: '/recipes/',
  plugins: [react()],
})
