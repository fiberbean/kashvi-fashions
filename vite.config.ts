import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // GitHub Pages లో అసెట్స్ సరిగ్గా లోడ్ అవ్వడానికి తప్పనిసరి
});