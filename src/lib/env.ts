import { z } from 'zod'

/**
 * Environment validation. Imported by server code only.
 *
 * Optional integration keys are allowed to be empty: the corresponding admin
 * feature then returns a clear "not configured" error instead of crashing the
 * whole app at boot (same behaviour as the previous Spring backend).
 */

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),

  UPLOAD_DIR: z.string().default('public/uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(8 * 1024 * 1024),

  AI_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  AI_API_KEY: optionalString,
  AI_MODEL: z.string().default('deepseek-chat'),

  LASTFM_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value !== 'false'),
  LASTFM_API_KEY: optionalString,
  LASTFM_BASE_URL: z.string().url().default('https://ws.audioscrobbler.com/2.0/'),
  LASTFM_AUTOCORRECT: z
    .string()
    .default('true')
    .transform((value) => value !== 'false'),

  TMDB_API_KEY: optionalString,
  TMDB_BASE_URL: z.string().url().default('https://api.themoviedb.org/3'),
  TMDB_IMAGE_BASE_URL: z.string().url().default('https://image.tmdb.org/t/p/original'),

  SEED_ADMIN_USERNAME: z.string().default('admin'),
  SEED_ADMIN_PASSWORD: z.string().default('admin123'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@dumb.com'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env = parsed.data

export const isProduction = env.NODE_ENV === 'production'
export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')
