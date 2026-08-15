<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { authApi } from '../../api'
import { useAuthStore } from '../../stores/auth'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const authStore = useAuthStore()
const loginLoading = ref(false)
const isRegisterMode = ref(false)
const loginForm = ref({
  username: '',
  password: '',
  email: '',
})

function closeLoginModal() {
  if (loginLoading.value) return
  emit('update:visible', false)
}

async function submitLogin() {
  const username = loginForm.value.username.trim()
  const password = loginForm.value.password.trim()
  const email = loginForm.value.email.trim()
  if (!username || !password || (isRegisterMode.value && !email)) {
    ElMessage.warning(isRegisterMode.value ? '请填写用户名、邮箱和密码' : '请输入用户名和密码')
    return
  }

  loginLoading.value = true
  try {
    const res = isRegisterMode.value
      ? await authApi.register({ username, password, email })
      : await authApi.login({ username, password })
    authStore.setAuth(res.data.token, res.data.username, res.data.role)
    ElMessage.success(isRegisterMode.value ? '注册成功' : '登录成功')
    emit('update:visible', false)
  } catch (e: any) {
    ElMessage.error(e?.message || '登录失败')
  } finally {
    loginLoading.value = false
  }
}

function toggleAuthMode() {
  isRegisterMode.value = !isRegisterMode.value
  loginForm.value = { username: '', password: '', email: '' }
}

function openAs(mode: 'login' | 'register') {
  isRegisterMode.value = mode === 'register'
  loginForm.value = { username: '', password: '', email: '' }
}

defineExpose({ openAs })
</script>

<template>
  <div v-if="visible" class="login-modal-mask" @click.self="closeLoginModal">
    <div class="login-modal-card">
      <h3>{{ isRegisterMode ? 'REGISTER' : 'LOGIN' }}</h3>
      <input
        v-model="loginForm.username"
        class="login-input"
        type="text"
        placeholder="用户名"
        @keyup.enter="submitLogin"
      />
      <input
        v-if="isRegisterMode"
        v-model="loginForm.email"
        class="login-input"
        type="email"
        placeholder="邮箱"
        @keyup.enter="submitLogin"
      />
      <input
        v-model="loginForm.password"
        class="login-input"
        type="password"
        placeholder="密码"
        @keyup.enter="submitLogin"
      />
      <button class="mode-switch" @click="toggleAuthMode">
        {{ isRegisterMode ? 'Login' : 'Register' }}
      </button>
      <div class="login-actions">
        <button class="login-btn ghost" @click="closeLoginModal">取消</button>
        <button class="login-btn primary" :disabled="loginLoading" @click="submitLogin">
          {{ loginLoading ? (isRegisterMode ? '注册中...' : '登录中...') : (isRegisterMode ? '注册' : '登录') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
}

.login-modal-card {
  width: min(86vw, 360px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(18, 18, 18, 0.85);
  border-radius: 16px;
  padding: 32px 28px 24px;
  color: #ffffff;
}

.login-modal-card h3 {
  margin: 0 0 28px;
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-align: center;
}

.login-input {
  width: 100%;
  height: 44px;
  margin: 0 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: #e0e0e0;
  padding: 0 14px;
  outline: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.88rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.login-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.login-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
}

.login-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.mode-switch {
  margin: 2px 0 12px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  padding: 0;
  font-size: 0.78rem;
  cursor: pointer;
  text-align: center;
  width: 100%;
  font-family: 'Inter', sans-serif;
  transition: color 0.2s;
}

.mode-switch:hover {
  color: rgba(255, 255, 255, 0.8);
}

.login-btn {
  min-width: 80px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  transition: all 0.2s ease;
}

.login-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.login-btn.primary {
  background: #fff;
  border-color: #fff;
  color: #000;
  font-weight: 500;
}

.login-btn.primary:hover {
  background: #ccc;
  border-color: #ccc;
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
