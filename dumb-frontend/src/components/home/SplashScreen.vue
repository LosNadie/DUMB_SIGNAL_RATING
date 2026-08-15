<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  visible: boolean
  progress: number
  phase: string
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  error: '',
})

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const normalizedProgress = computed(() => Math.round(Math.min(100, Math.max(0, props.progress))))

function handleInteraction() {
  window.dispatchEvent(new CustomEvent('dumb:splash-click'))
}
</script>

<template>
  <Teleport to="body">
    <Transition name="splash">
      <div
        v-if="visible"
        class="splash-screen"
        :class="{ 'has-error': !!error }"
        role="status"
        aria-live="polite"
        @pointerdown="handleInteraction"
      >
        <div class="splash-content">
          <h1 class="splash-title" aria-label="DUMB">
            <span v-for="letter in ['D', 'U', 'M', 'B']" :key="letter">{{ letter }}</span>
          </h1>

          <div class="loading-state">
            <div class="loading-row">
              <span>{{ error ? 'LOAD INTERRUPTED' : phase }}</span>
              <span>{{ normalizedProgress.toString().padStart(3, '0') }}%</span>
            </div>
            <div
              class="progress-track"
              role="progressbar"
              aria-label="Homepage loading progress"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="normalizedProgress"
            >
              <span :style="{ transform: `scaleX(${normalizedProgress / 100})` }" />
            </div>
            <p v-if="error" class="loading-error">{{ error }}</p>
            <button v-if="error" type="button" class="retry-button" @click.stop="emit('retry')">
              RETRY
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #030607;
  color: #f2f6f4;
}

.splash-screen::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.splash-content {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(520px, calc(100vw - 48px));
  gap: 52px;
}

.splash-title {
  display: flex;
  justify-content: center;
  gap: clamp(8px, 2vw, 22px);
  margin: 0;
  font-family: 'Cinzel', 'Playfair Display', serif;
  font-size: clamp(3.2rem, 8vw, 6.4rem);
  font-weight: 400;
  line-height: 1;
  color: #f4f6f5;
}

.splash-title span {
  animation: letter-in 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.splash-title span:nth-child(2) { animation-delay: 80ms; }
.splash-title span:nth-child(3) { animation-delay: 160ms; }
.splash-title span:nth-child(4) { animation-delay: 240ms; }

.loading-state {
  display: grid;
  gap: 12px;
}

.loading-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 0.66rem;
  font-weight: 600;
  color: rgba(231, 238, 235, 0.58);
  letter-spacing: 0.16rem;
}

.progress-track {
  position: relative;
  height: 1px;
  overflow: hidden;
  background: rgba(235, 242, 239, 0.14);
}

.progress-track span {
  position: absolute;
  inset: 0;
  display: block;
  transform-origin: left center;
  background: #dce9e4;
  transition: transform 180ms ease-out;
}

.loading-error {
  margin: 4px 0 0;
  color: rgba(255, 185, 177, 0.86);
  font-size: 0.72rem;
  line-height: 1.6;
  text-align: center;
}

.retry-button {
  justify-self: center;
  min-width: 112px;
  height: 34px;
  margin-top: 8px;
  border: 1px solid rgba(238, 243, 241, 0.42);
  border-radius: 0;
  background: transparent;
  color: #f2f6f4;
  font: inherit;
  font-size: 0.68rem;
  letter-spacing: 0.16rem;
  cursor: pointer;
}

.retry-button:hover,
.retry-button:focus-visible {
  border-color: #f2f6f4;
  background: #f2f6f4;
  color: #030607;
  outline: none;
}

.splash-enter-active,
.splash-leave-active {
  transition: opacity 700ms cubic-bezier(0.4, 0, 0.2, 1);
}

.splash-enter-from,
.splash-leave-to {
  opacity: 0;
}

@keyframes letter-in {
  from { opacity: 0; transform: translateY(22px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .splash-content { gap: 38px; }
  .loading-row { font-size: 0.6rem; }
}

@media (prefers-reduced-motion: reduce) {
  .splash-title span { animation: none; }
  .progress-track span,
  .splash-enter-active,
  .splash-leave-active { transition: none; }
}
</style>
