import type { Config } from 'tailwindcss';

const config: Config = {
	// Enable class-based dark mode (toggled by adding `dark` to <html>)
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Sidebar uses a slightly offset background in both modes
				sidebar: 'hsl(var(--sidebar-background))'
			}
		}
	},
	plugins: []
};

export default config;
