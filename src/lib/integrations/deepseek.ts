import 'server-only'

import { z } from 'zod'

import { env } from '@/lib/env'

export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly code: string = 'INTEGRATION_ERROR',
    readonly status = 400,
  ) {
    super(message)
    this.name = 'IntegrationError'
  }
}

interface ChatJsonOptions {
  timeoutMs?: number
}

/**
 * Call an OpenAI-compatible chat endpoint and parse a JSON object response.
 * DeepSeek is the default provider; any compatible base URL works.
 */
export async function chatJson<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userPrompt: string,
  options: ChatJsonOptions = {},
): Promise<T> {
  if (!env.AI_API_KEY) {
    throw new IntegrationError(
      '未配置 AI API，请设置环境变量 AI_API_KEY',
      'AI_NOT_CONFIGURED',
      400,
    )
  }

  const base = env.AI_BASE_URL.replace(/\/+$/, '')
  const url = `${base}/v1/chat/completions`
  const timeoutMs = options.timeoutMs ?? 120_000

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw new IntegrationError(
      `调用 AI 服务失败：${error instanceof Error ? error.message : '网络错误'}`,
      'AI_REQUEST_FAILED',
      502,
    )
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new IntegrationError(`AI 服务返回 ${response.status}：${text.slice(0, 200)}`, 'AI_HTTP_ERROR', 502)
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = payload.choices?.[0]?.message?.content
  if (!content) {
    throw new IntegrationError('AI 返回内容为空', 'AI_EMPTY_RESPONSE', 502)
  }

  const cleaned = stripMarkdownFence(content)
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new IntegrationError('解析 AI 返回失败：不是合法 JSON', 'AI_PARSE_ERROR', 502)
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new IntegrationError(
      `AI 返回字段不符合预期：${result.error.issues[0]?.message ?? 'unknown'}`,
      'AI_SCHEMA_ERROR',
      502,
    )
  }
  return result.data
}

function stripMarkdownFence(raw: string): string {
  let value = raw.trim()
  if (value.startsWith('```')) {
    const firstNewline = value.indexOf('\n')
    if (firstNewline > 0) value = value.slice(firstNewline + 1)
    const end = value.lastIndexOf('```')
    if (end > 0) value = value.slice(0, end).trim()
  }
  return value
}

export const MAX_DESCRIPTION_CHARS = 50_000
