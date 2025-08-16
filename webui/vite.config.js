import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: "/",
  server: {
    proxy: {
      '/auth': { // This is the path you want to proxy
        target: 'http://localhost:8085',
        changeOrigin: true,
        secure: false, // if you are using an HTTPS API, set this to true
        // Configure how cookies and headers should be handled
        cookieDomainRewrite: {
          // Change the domain of the cookies to localhost
          '*': ''
        }
      },
      '/api': { // This is the path you want to proxy
        target: 'http://localhost:8085',
        changeOrigin: true,
        secure: false, // if you are using an HTTPS API, set this to true
        // Configure how cookies and headers should be handled
        cookieDomainRewrite: {
          // Change the domain of the cookies to localhost
          '*': ''
        }
      }
    },
    // Serve sampledata folder during development only
    fs: {
      allow: ['..']
    }
  },
  // Custom middleware to serve sampledata during development
  configureServer(server) {
    server.middlewares.use('/sampledata', (req, res, next) => {
      if (req.url) {
        const filePath = path.join(__dirname, 'sampledata', req.url)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(content)
        } else {
          next()
        }
      } else {
        next()
      }
    })
  }
})




