<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const audioRef = ref<HTMLAudioElement>()
const muted = ref(false)
const playing = ref(false)

const TRACK = '/audio/01-the-cure.m4a'
let interactionHandler: (() => void) | null = null

function playTrack() {
  const audio = audioRef.value
  if (!audio) return
  if (!audio.src) {
    audio.src = TRACK
  }
  audio.play().then(() => { playing.value = true }).catch(() => {})
}

function toggleMute() {
  const audio = audioRef.value
  if (!audio) return
  muted.value = !muted.value
  audio.muted = muted.value
}

function tryPlayOnInteraction() {
  const audio = audioRef.value
  if (!audio) return
  if (audio.paused) {
    playTrack()
  }
  // 只触发一次
  if (interactionHandler) {
    document.removeEventListener('click', interactionHandler)
    document.removeEventListener('keydown', interactionHandler)
    window.removeEventListener('dumb:splash-click', interactionHandler)
    interactionHandler = null
  }
}

onMounted(() => {
  const audio = audioRef.value
  if (!audio) return
  audio.volume = 0.5
  audio.muted = false
  audio.loop = true
  audio.preload = 'none'

  // 浏览器通常会拦截自动播放：只在首次用户交互后播放唯一保留的 The Cure
  interactionHandler = tryPlayOnInteraction
  document.addEventListener('click', interactionHandler)
  document.addEventListener('keydown', interactionHandler)
  window.addEventListener('dumb:splash-click', interactionHandler)
})

onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
  }
  if (interactionHandler) {
    document.removeEventListener('click', interactionHandler)
    document.removeEventListener('keydown', interactionHandler)
    window.removeEventListener('dumb:splash-click', interactionHandler)
  }
})
</script>

<template>
  <div class="bgm-player">
    <audio ref="audioRef" preload="none" />
    <button
      class="bgm-btn"
      :class="{ 'is-muted': muted }"
      @click="toggleMute"
      :title="muted ? 'Unmute' : 'Mute'"
    >
      <span class="note" :class="{ spinning: playing && !muted }">♪</span>
    </button>
  </div>
</template>

<style scoped>
.bgm-player {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
}

.bgm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.25s ease;
}

.bgm-btn:hover {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.25);
}

.bgm-btn.is-muted {
  color: rgba(255, 255, 255, 0.3);
}

.note {
  font-size: 20px;
  line-height: 1;
  display: block;
}

.note.spinning {
  animation: spin 3s linear infinite;
}

.bgm-btn.is-muted .note {
  animation: none;
  opacity: 0.35;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .bgm-player {
    bottom: 16px;
    right: 16px;
  }
  .bgm-btn {
    width: 36px;
    height: 36px;
  }
}
</style>
