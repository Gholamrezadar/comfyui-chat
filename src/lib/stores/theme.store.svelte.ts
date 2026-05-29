// uses Tailwind's `darkMode: 'class'` strategy
// sets `dark` class on <html>

const THEME_KEY = 'comfyui-chat-theme';

function createThemeStore() {
	// Initialise from localStorage or system preference
	let isDark = $state(false);

	function init() {
		if (typeof window === 'undefined') return;

		const saved = localStorage.getItem(THEME_KEY);
		if (saved !== null) {
			isDark = saved === 'dark';
		} else {
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		applyTheme();
	}

	function applyTheme() {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('dark', isDark);
	}

	function toggle() {
		isDark = !isDark;
		localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');

		// View Transition theme switch
		if (document.startViewTransition) {
			document.startViewTransition(applyTheme);
		} else {
			applyTheme();
		}
	}

	return {
		get isDark() { return isDark; },
		init,
		toggle
	};
}

export const themeStore = createThemeStore();
