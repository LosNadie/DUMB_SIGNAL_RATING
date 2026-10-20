'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createSessionCookie, destroySessionCookie, getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export interface AuthActionState {
  error?: string
  fieldErrors?: Record<string, string>
}

const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入用户名').max(64),
  password: z.string().min(1, '请输入密码').max(128),
  next: z.string().optional(),
})

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, '用户名至少 3 个字符')
    .max(32, '用户名最多 32 个字符')
    .regex(/^[\w一-龥.-]+$/, '用户名只能包含字母、数字、下划线、点、横线或中文'),
  email: z.string().trim().email('请输入有效的邮箱地址').max(128),
  password: z.string().min(8, '密码至少 8 位').max(128),
})

/** Only allow same-site relative redirects. */
function safeNext(next: string | undefined): string | null {
  if (!next) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  return next
}

export async function loginAction(
  _previous: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  })

  if (!parsed.success) {
    return { fieldErrors: flatten(parsed.error) }
  }

  const { username, password, next } = parsed.data
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, passwordHash: true, role: true, status: true },
  })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: '用户名或密码错误' }
  }
  if (user.status !== 'ENABLED') {
    return { error: '账号已被禁用，请联系管理员' }
  }

  await createSessionCookie({ userId: user.id, username: user.username, role: user.role })

  const isEditor = user.role === 'ADMIN' || user.role === 'EDITOR'
  redirect(safeNext(next) ?? (isEditor ? '/admin' : '/'))
}

export async function registerAction(
  _previous: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { fieldErrors: flatten(parsed.error) }
  }

  const { username, email, password } = parsed.data

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  })
  if (existing) {
    return existing.username === username
      ? { fieldErrors: { username: '该用户名已被使用' } }
      : { fieldErrors: { email: '该邮箱已被注册' } }
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { username, email, passwordHash, role: 'USER', status: 'ENABLED' },
    select: { id: true, username: true, role: true },
  })

  await createSessionCookie({ userId: user.id, username: user.username, role: user.role })
  redirect('/')
}

export async function logoutAction(): Promise<void> {
  await destroySessionCookie()
  redirect('/')
}

export async function currentSessionAction() {
  return getSession()
}

function flatten(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!result[key]) result[key] = issue.message
  }
  return result
}
