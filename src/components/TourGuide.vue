<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useTour } from '@/composables/useTour'

const emit = defineEmits<{
  (e: 'setTab', tab: string): void
}>()

const { active, currentStep, currentIndex, totalSteps, isFirst, isLast, next, prev, finish } = useTour()

interface SpotRect {
  top: number; left: number; width: number; height: number; right: number; bottom: number
}

const spotRect = ref<SpotRect | null>(null)
const tooltipLeft = ref(0)
const tooltipTop = ref(0)
const arrowDir = ref<'left' | 'right' | 'top' | 'bottom' | 'none'>('none')
const TOOLTIP_W = 288
const GAP = 14

const resolveSpot = (selector: string, padding: number): SpotRect | null => {
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    top: r.top - padding,
    left: r.left - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
    right: r.right + padding,
    bottom: r.bottom + padding,
  }
}

const updateLayout = async (delay = 300) => {
  if (delay) await new Promise(r => setTimeout(r, delay))
  await nextTick()

  const step = currentStep.value

  if (!step.targetSelector) {
    spotRect.value = null
    arrowDir.value = 'none'
    return
  }

  const rect = resolveSpot(step.targetSelector, step.padding ?? 8)
  spotRect.value = rect
  if (!rect) { arrowDir.value = 'none'; return }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const TOOLTIP_H = 180

  switch (step.placement) {
    case 'right':
      tooltipLeft.value = rect.right + GAP
      tooltipTop.value = Math.max(16, Math.min(rect.top + rect.height / 2 - TOOLTIP_H / 2, vh - TOOLTIP_H - 16))
      arrowDir.value = 'left'
      break
    case 'left':
      tooltipLeft.value = rect.left - TOOLTIP_W - GAP
      tooltipTop.value = Math.max(16, Math.min(rect.top + rect.height / 2 - TOOLTIP_H / 2, vh - TOOLTIP_H - 16))
      arrowDir.value = 'right'
      break
    case 'bottom':
      tooltipTop.value = rect.bottom + GAP
      tooltipLeft.value = Math.max(16, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16))
      arrowDir.value = 'top'
      break
    case 'top':
      tooltipTop.value = rect.top - TOOLTIP_H - GAP
      tooltipLeft.value = Math.max(16, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16))
      arrowDir.value = 'bottom'
      break
    default:
      arrowDir.value = 'none'
  }
}

// Overlay quad styles
const topStyle = computed(() => spotRect.value
  ? { top: '0', left: '0', right: '0', height: spotRect.value.top + 'px' }
  : {})
const bottomStyle = computed(() => spotRect.value
  ? { top: spotRect.value.bottom + 'px', left: '0', right: '0', bottom: '0' }
  : {})
const leftStyle = computed(() => spotRect.value
  ? { top: spotRect.value.top + 'px', left: '0', width: spotRect.value.left + 'px', height: spotRect.value.height + 'px' }
  : {})
const rightStyle = computed(() => spotRect.value
  ? { top: spotRect.value.top + 'px', left: spotRect.value.right + 'px', right: '0', height: spotRect.value.height + 'px' }
  : {})
const ringStyle = computed(() => spotRect.value
  ? { top: spotRect.value.top + 'px', left: spotRect.value.left + 'px', width: spotRect.value.width + 'px', height: spotRect.value.height + 'px' }
  : {})
const tooltipStyle = computed(() => ({
  top: tooltipTop.value + 'px',
  left: tooltipLeft.value + 'px',
  width: TOOLTIP_W + 'px',
}))

watch([active, currentIndex], async ([isActive]) => {
  if (!isActive) return
  const step = currentStep.value
  if (step.tab) emit('setTab', step.tab)
  await updateLayout(300)
}, { immediate: true })

const handleResize = () => updateLayout(0)
onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="active" class="fixed inset-0 z-[9999] pointer-events-none">

        <!-- Spotlight mode (has target) -->
        <template v-if="spotRect">
          <div class="absolute bg-black/60 pointer-events-auto" :style="topStyle" />
          <div class="absolute bg-black/60 pointer-events-auto" :style="bottomStyle" />
          <div class="absolute bg-black/60 pointer-events-auto" :style="leftStyle" />
          <div class="absolute bg-black/60 pointer-events-auto" :style="rightStyle" />
          <div class="absolute rounded-lg ring-2 ring-indigo-400/80 shadow-[0_0_16px_2px_rgba(99,102,241,0.25)]" :style="ringStyle" />
        </template>

        <!-- Full overlay for welcome step -->
        <div v-else class="absolute inset-0 bg-black/60 pointer-events-auto" />

        <!-- Tooltip bubble -->
        <Transition name="step-slide" mode="out-in">
          <div
            :key="currentIndex"
            class="absolute pointer-events-auto"
            :style="currentStep.placement === 'center'
              ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: TOOLTIP_W + 'px' }
              : tooltipStyle"
          >
            <!-- Arrow -->
            <div v-if="arrowDir === 'left'"
              class="absolute -left-[7px] top-1/2 -translate-y-1/2 border-y-[7px] border-y-transparent border-r-[7px] border-r-[#1C2333]"
            />
            <div v-if="arrowDir === 'right'"
              class="absolute -right-[7px] top-1/2 -translate-y-1/2 border-y-[7px] border-y-transparent border-l-[7px] border-l-[#1C2333]"
            />
            <div v-if="arrowDir === 'top'"
              class="absolute -top-[7px] left-1/2 -translate-x-1/2 border-x-[7px] border-x-transparent border-b-[7px] border-b-[#1C2333]"
            />
            <div v-if="arrowDir === 'bottom'"
              class="absolute -bottom-[7px] left-1/2 -translate-x-1/2 border-x-[7px] border-x-transparent border-t-[7px] border-t-[#1C2333]"
            />

            <!-- Card -->
            <div class="bg-[#1C2333] border border-[#30363D] rounded-xl shadow-2xl p-5">
              <!-- Progress dots -->
              <div class="flex items-center gap-1.5 mb-3">
                <div
                  v-for="i in totalSteps" :key="i"
                  class="rounded-full transition-all duration-300"
                  :class="i - 1 === currentIndex
                    ? 'w-4 h-1.5 bg-indigo-400'
                    : 'w-1.5 h-1.5 bg-slate-600'"
                />
                <span class="text-[10px] text-slate-500 ml-auto">{{ currentIndex + 1 }} / {{ totalSteps }}</span>
              </div>

              <h3 class="text-sm font-semibold text-white mb-1.5">{{ currentStep.title }}</h3>
              <p class="text-xs text-slate-400 leading-relaxed mb-4">{{ currentStep.description }}</p>

              <div class="flex items-center gap-2">
                <button
                  v-if="!isFirst"
                  @click="prev"
                  class="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
                >
                  Voltar
                </button>
                <button
                  @click="finish"
                  class="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1.5 ml-auto"
                >
                  Pular
                </button>
                <button
                  @click="isLast ? finish() : next()"
                  class="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {{ isLast ? 'Começar!' : 'Próximo →' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tour-fade-enter-active,
.tour-fade-leave-active {
  transition: opacity 0.25s ease;
}
.tour-fade-enter-from,
.tour-fade-leave-to {
  opacity: 0;
}
.step-slide-enter-active,
.step-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.step-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.step-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
