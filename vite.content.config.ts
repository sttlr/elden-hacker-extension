import { defineConfig } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    build: {
        outDir: 'dist',
        minify: false,
        emptyOutDir: false,
        lib: {
            name: 'EldenHackerContent',
            entry: resolve(__dirname, 'src/content.ts'),
            formats: ['iife'],
            fileName: () => 'content.js'
        },
        rollupOptions: {
            output: {
                format: 'iife',
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js'
            }
        }
    }
})
