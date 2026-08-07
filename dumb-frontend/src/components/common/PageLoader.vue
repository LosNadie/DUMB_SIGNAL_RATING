<script setup lang="ts">
interface Props {
  visible?: boolean
}
withDefaults(defineProps<Props>(), {
  visible: true,
})
</script>

<template>
  <Transition name="loader-fade">
    <div v-if="visible" class="page-loader">
      <div class="loader-ring">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p class="loader-text">DUMB</p>
    </div>
  </Transition>
</template>

<style scoped>
.page-loader {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  background: #0a0a0a;
  pointer-events: none;
}

/* ── 三环脉冲 ── */
.loader-ring {
  position: relative;
  width: 56px;
  height: 56px;
}

.loader-ring span {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.9);
  animation: ringSpin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.loader-ring span:nth-child(1) {
  animation-duration: 1.4s;
}
.loader-ring span:nth-child(2) {
  inset: 8px;
  border-top-color: rgba(255, 255, 255, 0.5);
  animation-duration: 1.1s;
  animation-direction: reverse;
}
.loader-ring span:nth-child(3) {
  inset: 16px;
  border-top-color: rgba(255, 255, 255, 0.25);
  animation-duration: 0.8s;
}

@keyframes ringSpin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 品牌文字 ── */
.loader-text {
  margin: 0;
  font-family: 'Cinzel', 'Playfair Display', serif;
  font-size: 0.85rem;
  letter-spacing: 8px;
  color: rgba(255, 255, 255, 0.35);
  animation: textPulse 2s ease-in-out infinite;
}

@keyframes textPulse {
  0%, 100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.7;
  }
}

/* ── 退场动画 ── */
.loader-fade-enter-active,
.loader-fade-leave-active {
  transition: opacity 0.5s ease;
}
.loader-fade-enter-from,
.loader-fade-leave-to {
  opacity: 0;
}
</style>
