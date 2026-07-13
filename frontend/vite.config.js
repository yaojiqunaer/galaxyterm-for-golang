import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-runtime';
          if (
            id.includes('/node_modules/@xterm/')
            || id.includes('/node_modules/xterm-addon-')
          ) return 'xterm-runtime';
          if (id.includes('/node_modules/@ant-design/icons')) return 'antd-runtime';
          if (
            id.includes('/node_modules/rc-')
            || id.includes('/node_modules/@rc-component/')
            || id.includes('/node_modules/resize-observer-polyfill/')
          ) return 'antd-runtime';
          if (
            id.includes('/node_modules/antd/')
            || id.includes('/node_modules/@ant-design/')
            || id.includes('/node_modules/@ctrl/tinycolor/')
          ) return 'antd-runtime';
          return 'vendor-runtime';
        },
      },
    },
  },
});
