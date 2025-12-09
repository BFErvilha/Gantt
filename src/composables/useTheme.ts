import { ref } from 'vue'

const isDark = ref(false)

const initTheme = () => {
	if (typeof window === 'undefined') return

	const userPreference = localStorage.getItem('theme')
	const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches

	if (userPreference === 'dark' || (!userPreference && systemPreference)) {
		isDark.value = true
		document.documentElement.classList.add('dark')
	} else {
		isDark.value = false
		document.documentElement.classList.remove('dark')
	}
}

initTheme()

export function useTheme() {
	const toggleDark = () => {
		isDark.value = !isDark.value

		if (isDark.value) {
			document.documentElement.classList.add('dark')
			localStorage.setItem('theme', 'dark')
		} else {
			document.documentElement.classList.remove('dark')
			localStorage.setItem('theme', 'light')
		}
	}

	return {
		isDark,
		toggleDark,
	}
}
