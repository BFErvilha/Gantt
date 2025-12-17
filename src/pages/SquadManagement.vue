<script setup lang="ts">
import { ref } from 'vue'
import SquadList from '@/components/squads/SquadList.vue'
import MemberDirectory from '@/components/squads/MemberDirectory.vue'
import SquadMembers from '@/components/squads/SquadMembers.vue'

const selectedSquadId = ref<string | null>(null)

const handleSelectSquad = (id: string | null) => {
	selectedSquadId.value = id
}
</script>

<template>
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-[calc(100vh-200px)]">
		<SquadList :selected-id="selectedSquadId" @select="handleSelectSquad" />

		<div class="lg:col-span-2 h-full flex flex-col">
			<transition name="fade" mode="out-in">
				<MemberDirectory v-if="!selectedSquadId" />

				<SquadMembers v-else :squad-id="selectedSquadId" @back="selectedSquadId = null" />
			</transition>
		</div>
	</div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
