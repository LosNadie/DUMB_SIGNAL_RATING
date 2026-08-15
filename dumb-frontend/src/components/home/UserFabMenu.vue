<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits<{
  (e: 'openLogin'): void
}>()

const router = useRouter()
const authStore = useAuthStore()
const userMenuOpen = ref(false)

function handleLogout() {
  authStore.logout()
  userMenuOpen.value = false
}

function goAdmin() {
  userMenuOpen.value = false
  void router.push('/admin')
}

function openLogin() {
  emit('openLogin')
}
</script>

<template>
  <div class="user-fab-wrap">
    <button v-if="!authStore.isLoggedIn" type="button" class="login-fab" @click="openLogin">LOGIN</button>
    <button
      v-else
      type="button"
      class="user-fab"
      aria-haspopup="menu"
      :aria-expanded="userMenuOpen"
      @click="userMenuOpen = !userMenuOpen"
    >
      <span class="user-fab-name">{{ authStore.username }}</span>
      <span class="user-fab-arrow" :class="{ open: userMenuOpen }">▾</span>
    </button>
    <div v-if="authStore.isLoggedIn && userMenuOpen" class="user-menu" @click.stop>
      <button v-if="authStore.isAdminLike" class="user-menu-item" @click="goAdmin">后台</button>
      <button class="user-menu-item logout" @click="handleLogout">退出登录</button>
    </div>
  </div>
</template>

<style scoped>
.user-fab-wrap {
  position: absolute;
  right: 24px;
  top: 16px;
  z-index: 5;
  pointer-events: auto;
}

.login-fab {
  min-width: 110px;
  height: 36px;
  border: 1px solid rgba(232, 240, 255, 0.42);
  border-radius: 18px;
  background: rgba(8, 12, 28, 0.28);
  color: rgba(242, 247, 255, 0.96);
  font-size: 0.72rem;
  letter-spacing: 0.2rem;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(6px);
  box-shadow: none;
  transition: transform 0.24s ease, background-color 0.24s ease, border-color 0.24s ease;
}

.login-fab:hover {
  transform: translateY(-1px);
  background: rgba(12, 18, 40, 0.5);
  border-color: rgba(246, 251, 255, 0.72);
}

.user-fab {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(232, 240, 255, 0.42);
  border-radius: 18px;
  background: rgba(8, 12, 28, 0.28);
  color: rgba(242, 247, 255, 0.96);
  font-size: 0.72rem;
  font-family: inherit;
  letter-spacing: 0.12rem;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.22s ease, border-color 0.22s ease;
  user-select: none;
}

.user-fab:hover {
  background: rgba(12, 18, 40, 0.5);
  border-color: rgba(246, 251, 255, 0.72);
}

.user-fab-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-fab-arrow {
  display: inline-block;
  font-size: 0.85rem;
  transition: transform 0.22s ease;
  line-height: 1;
}

.user-fab-arrow.open {
  transform: rotate(180deg);
}

.user-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  min-width: 148px;
  padding: 5px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(8, 10, 10, 0.58);
  -webkit-backdrop-filter: blur(18px) saturate(125%);
  backdrop-filter: blur(18px) saturate(125%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 16px 36px rgba(0, 0, 0, 0.34);
  z-index: 20;
}

.user-menu-item {
  display: block;
  width: 100%;
  min-height: 38px;
  padding: 10px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
  font-family: inherit;
  font-size: 0.74rem;
  letter-spacing: 0;
  text-align: left;
  cursor: pointer;
  transition: background-color 180ms ease, color 180ms ease;
}

.user-menu-item + .user-menu-item {
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.user-menu-item:hover,
.user-menu-item:focus-visible {
  background: rgba(255, 255, 255, 0.09);
  color: #fff;
  outline: none;
}

.user-menu-item.logout:hover,
.user-menu-item.logout:focus-visible {
  background: rgba(255, 80, 80, 0.12);
  color: rgba(255, 160, 160, 0.96);
}

@media (max-width: 900px) {
  .login-fab {
    right: 12px;
    top: 10px;
    min-width: 96px;
    height: 32px;
    font-size: 0.68rem;
    letter-spacing: 0.16rem;
  }
}
</style>
