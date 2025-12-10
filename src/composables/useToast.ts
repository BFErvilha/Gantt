import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
	id: number
	message: string
	type: ToastType
}

const notifications = ref<Toast[]>([])
let counter = 0

export function useToast() {
	const show = (message: string, type: ToastType = 'success', duration = 3000) => {
		const id = counter++
		notifications.value.push({ id, message, type })

		setTimeout(() => {
			remove(id)
		}, duration)
	}

	const remove = (id: number) => {
		const index = notifications.value.findIndex(n => n.id === id)
		if (index !== -1) notifications.value.splice(index, 1)
	}

	return {
		notifications,
		show,
		remove,
	}
}
