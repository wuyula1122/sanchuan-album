import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 必须添加这一行，填入你的 GitHub 仓库名
  base: '/sanchuan-album/', 
})
