import { defineConfig } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function copyDir(src: string, dest: string) {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
        const srcPath = resolve(src, entry.name)
        const destPath = resolve(dest, entry.name)

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath)
        } else {
            await fs.copyFile(srcPath, destPath)
        }
    }
}

export default defineConfig({
    build: {
        outDir: 'dist',
        minify: false,
        lib: {
            name: 'Elden Hacker',
            entry: {
                background: resolve(__dirname, 'src/background.ts'),
                inject: resolve(__dirname, 'src/inject.ts')
            },
            formats: ['es'],
            fileName: (format, entryName) => `${entryName}.js`
        },
        rollupOptions: {
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js'
            }
        }
    },
    plugins: [
        {
            name: 'copy-assets',
            async closeBundle() {
                await fs.copyFile(
                    resolve(__dirname, 'public/manifest.json'),
                    resolve(__dirname, 'dist/manifest.json')
                )

                await fs.copyFile(
                    resolve(__dirname, 'public/popup.html'),
                    resolve(__dirname, 'dist/popup.html')
                )

                await copyDir('public/assets', 'dist/assets')
                await copyDir('public/banners', 'dist/banners')
                await copyDir('public/sounds', 'dist/sounds')
            }
        }
    ]
})
