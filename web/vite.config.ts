import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // Production build (and `vite preview` of it) is served from the portfolio at raulesteveza.github.io/tools/Api2Class/
  base: command === 'build' || isPreview ? '/tools/Api2Class/' : '/',
}))
