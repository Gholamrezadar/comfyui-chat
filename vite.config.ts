import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			'/comfyui-api': {
				target: 'http://127.0.0.1:8188',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/comfyui-api/, ''),
				configure: (proxy) => {
					proxy.on('proxyReq', (proxyReq, req) => {
						if (req.headers['content-type']?.includes('multipart/form-data')) {
							proxyReq.setHeader('content-type', req.headers['content-type']);
						}
					});
				}
			}
		}
	}
});
