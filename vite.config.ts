import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// https://vite.dev/config/
export default defineConfig({
  server: {
    hmr: {
      overlay: false, // 에러 오버레이 비활성화
    },
  },
  plugins: [
    react(),
    // 트레이 아이콘 복사 플러그인
    {
      name: 'copy-tray-icon',
      writeBundle() {
        const srcIcon = join(__dirname, 'src', 'assets', 'tray.ico')
        const destIcon = join(__dirname, 'dist', 'assets', 'tray.ico')
        
        if (existsSync(srcIcon)) {
          // assets 디렉토리 생성
          mkdirSync(join(__dirname, 'dist', 'assets'), { recursive: true })
          // 아이콘 파일 복사
          copyFileSync(srcIcon, destIcon)
          console.log('Tray icon copied to:', destIcon)
        } else {
          console.warn('Tray icon not found at:', srcIcon)
        }
      }
    }
  ],
  base: './', // Electron에서 상대 경로 사용
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['monaco-editor']
  }
})
