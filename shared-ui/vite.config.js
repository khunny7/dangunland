import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'DangunlandSharedUI',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'xterm'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'xterm': 'Terminal'
        }
      }
    },
    cssCodeSplit: false,
    outDir: 'dist',
    emptyOutDir: true
  },
  css: {
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  }
})