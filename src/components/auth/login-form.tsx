'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import { loginAction, registerAction, type AuthActionState } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'

const initialState: AuthActionState = {}

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginState, login, loginPending] = useActionState(loginAction, initialState)
  const [registerState, register, registerPending] = useActionState(registerAction, initialState)

  const isLogin = mode === 'login'
  const state = isLogin ? loginState : registerState
  const pending = isLogin ? loginPending : registerPending

  return (
    <div>
      <form action={isLogin ? login : register} className="space-y-5">
        {next && <input type="hidden" name="next" value={next} />}

        <div>
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            autoFocus
            placeholder={isLogin ? 'admin' : '至少 3 个字符'}
          />
          <FieldError>{state.fieldErrors?.username}</FieldError>
        </div>

        {!isLogin && (
          <div>
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
            <FieldError>{state.fieldErrors?.email}</FieldError>
          </div>
        )}

        <div>
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            placeholder={isLogin ? '' : '至少 8 位'}
          />
          <FieldError>{state.fieldErrors?.password}</FieldError>
        </div>

        {state.error && (
          <p role="alert" className="border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? '处理中…' : isLogin ? '登录' : '注册'}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs text-signal-dim">
        <span>{isLogin ? '还没有账号？' : '已有账号？'}</span>
        <button
          type="button"
          onClick={() => setMode(isLogin ? 'register' : 'login')}
          className="uppercase tracking-[0.18em] text-signal-muted transition-colors hover:text-white"
        >
          {isLogin ? '注册' : '去登录'}
        </button>
      </div>

      <p className="mt-10 text-center text-[0.7rem] text-signal-dim">
        <Link href="/" className="transition-colors hover:text-white">
          ← 返回首页
        </Link>
      </p>
    </div>
  )
}
