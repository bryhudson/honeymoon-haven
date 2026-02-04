import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
console.log(`\n\n🔹 BUILDING VERSION: ${pkg.version} \n\n`);

export default defineConfig({
  plugins: [react()],
  base: "/",
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
})
