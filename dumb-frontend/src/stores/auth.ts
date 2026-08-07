import { defineStore } from 'pinia'

interface AuthState {
  token: string
  username: string
  role: string
}

interface UserInfo {
  username: string
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('dumb_token') || '',
    username: localStorage.getItem('dumb_username') || '',
    role: localStorage.getItem('dumb_role') || '',
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdminLike: (state) => state.role === 'ADMIN' || state.role === 'EDITOR',
    userInfo: (state): UserInfo | null => {
      if (!state.token) return null
      return { username: state.username }
    },
  },
  actions: {
    setAuth(token: string, username: string, role: string) {
      this.token = token
      this.username = username
      this.role = role
      localStorage.setItem('dumb_token', token)
      localStorage.setItem('dumb_username', username)
      localStorage.setItem('dumb_role', role)
    },
    logout() {
      this.token = ''
      this.username = ''
      this.role = ''
      localStorage.removeItem('dumb_token')
      localStorage.removeItem('dumb_username')
      localStorage.removeItem('dumb_role')
    },
  },
})
