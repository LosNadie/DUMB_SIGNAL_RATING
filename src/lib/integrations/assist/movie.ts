import 'server-only'

import { z } from 'zod'

import { chatJson, IntegrationError } from '@/lib/integrations/deepseek'
import {
  getMovieDetail,
  searchMovies,
  type TmdbCandidate,
  type TmdbMovieContext,
} from '@/lib/integrations/tmdb'
import { saveRemoteImage } from '@/lib/uploads'

export interface MovieDraft {
  title?: string
  content?: string
  score?: number
  director?: string
  actors?: string
  genres?: string[]
  region?: string
  releaseDate?: string
  coverImage?: string
  backgroundImage?: string
}

const GENRE_LIST =
  '剧情、喜剧、爱情、动作、冒险、奇幻、科幻、悬疑、惊悚、恐怖、' +
  '犯罪、黑帮、警匪、战争、历史、传记、音乐、歌舞、西部、武侠、' +
  '古装、宫廷、灾难、末日、丧尸、怪兽、怪谈、灵异、超自然、心理、' +
  '家庭、亲情、青春、校园、成长、体育、竞技、赛车、公路、美食、' +
  '职场、商战、政治、间谍、谍战、法庭、律政、医疗、军事、海战、' +
  '空战、太空、机甲、赛博朋克、蒸汽朋克、异世界、穿越、时间旅行、' +
  '平行世界、轮回、复仇、黑色电影、黑色幽默、讽刺、荒诞、实验电影、' +
  '艺术电影、独立电影、纪录片、纪录剧情片、动画、定格动画、黏土动画、' +
  '3D动画、短片、微电影、系列电影、史诗片、大片、B级片、Cult片、' +
  '公路片、歌剧电影、音乐纪录片'

const SYSTEM_PROMPT = `你是一位资深电影评论家，负责基于 TMDB 官方数据撰写影评。
你必须只输出一个 JSON 对象，不要输出任何其它文字、Markdown 或代码围栏。
JSON 字段：content（字符串）、genres（字符串数组，最多 5 个）、director（字符串）、actors（字符串）。

【字段说明】
- content：电影评论正文，使用 HTML 片段。风格必须遵循以下要求：
  · 分段使用 emoji 小标题，如 <h3>🎬 剧情核心</h3>、<h3>🎭 表演与角色</h3>、<h3>🎨 视听风格</h3>、<h3>💭 总体评价</h3>
  · 每个段落用 <p>...</p> 包裹，短句为主，节奏轻快
  · 结尾必须有 <p><strong>📌 一句话推荐：</strong>...</p>
  · 正文为简体中文，400–800 个汉字
  · 内容须尊重事实，可引用 TMDB 数据作为参考但不要整段复制
  · 不要输出 <html> / <body>
- genres：从【中文风格候选列表】中选取最贴切的 1–5 个（必须完全匹配），参考 TMDB 的风格名称进行对应。
- director：导演姓名，如不确定则返回空字符串。
- actors：2–5 位主要主演，用逗号分隔；如不确定则返回空字符串。

【中文风格候选列表】
${GENRE_LIST}。`

const FALLBACK_SYSTEM_PROMPT = `你是一位资深电影评论家与资料库管理员，对全球电影有深入了解。
你必须只输出一个 JSON 对象，不要输出任何其它文字、Markdown 或代码围栏。
JSON 字段：title（字符串）、content（字符串）、score（字符串，0.0-10.0 之间的一位小数）、
director（字符串）、actors（字符串）、genres（字符串数组，最多 5 个）、
region（字符串）、releaseDate（字符串，YYYY-MM-DD 格式）、
coverImage（字符串，封面图 URL）、backgroundImage（字符串，背景图 URL）。

【字段说明】
- title：电影的标准中文译名（或原名）。
- content：电影评论正文，使用 HTML 片段。风格要求同上。
- score：综合评分，0.0–10.0 之间，保留一位小数。
- director：导演姓名。
- actors：2–5 位主要主演，用逗号分隔。
- genres：从【中文风格候选列表】中选取最贴切的 1–5 个（必须完全匹配）。
- region：电影地区，可选值：中国大陆、中国香港、中国台湾、亚洲、美洲、欧洲、非洲。
- releaseDate：上映日期，格式 YYYY-MM-DD；若只有年份则填 YYYY-01-01。
- coverImage：尽量返回可靠封面图 URL；若不确定则返回空字符串。
- backgroundImage：尽量返回可靠背景图 URL；若不确定则返回空字符串。

【中文风格候选列表】
${GENRE_LIST}。`

const DISAMBIGUATION_SYSTEM_PROMPT = `你是一位电影资料库专家，擅长根据用户输入的电影名称判断其真实意图。
用户输入的电影名称可能存在歧义（同名电影、翻拍、不同语言版本等）。
你会收到用户输入的名称，以及 TMDB 搜索返回的多个候选电影。
请根据用户输入的上下文，选出最可能符合用户意图的那一部电影。

【选择规则】
1. 如果用户输入包含年份（如'无间道 2002'），优先匹配该年份的电影
2. 如果用户输入的是中文名，优先匹配有中文译名的原版电影（而非翻拍版）
3. 评分高、知名度高的电影通常更可能是用户想要的
4. 如果完全无法判断，选择第一个候选

你必须只输出一个 JSON 对象，不要输出任何其它文字。
JSON 字段：selectedId（整数，选中的 TMDB 电影 ID）、reason（字符串，简短的选择理由）`

const withDataSchema = z.object({
  content: z.string().optional(),
  genres: z.array(z.string()).optional(),
  director: z.string().optional(),
  actors: z.string().optional(),
})

const fallbackSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  score: z.union([z.string(), z.number()]).optional(),
  director: z.string().optional(),
  actors: z.string().optional(),
  genres: z.array(z.string()).optional(),
  region: z.string().optional(),
  releaseDate: z.string().optional(),
  coverImage: z.string().optional(),
  backgroundImage: z.string().optional(),
})

const disambiguationSchema = z.object({
  selectedId: z.union([z.number(), z.string()]).optional(),
  reason: z.string().optional(),
})

const VALID_GENRES = new Set(GENRE_LIST.split('、'))

function filterGenres(genres: string[] | undefined): string[] {
  return (genres ?? []).filter((genre) => VALID_GENRES.has(genre)).slice(0, 5)
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 8.0
  return Math.round(Math.min(10, Math.max(0, value)) * 10) / 10
}

async function disambiguate(title: string, candidates: TmdbCandidate[]): Promise<number> {
  try {
    const result = await chatJson(
      disambiguationSchema,
      DISAMBIGUATION_SYSTEM_PROMPT,
      `用户输入：${title}\n候选列表：\n${candidates
        .map(
          (candidate) =>
            `- id=${candidate.id} 片名=${candidate.title} 原名=${candidate.originalTitle} 年份=${candidate.releaseDate?.slice(0, 4) ?? '未知'}`,
        )
        .join('\n')}`,
    )
    const selected = Number(result.selectedId)
    if (candidates.some((candidate) => candidate.id === selected)) return selected
  } catch {
    // Fall through to the first candidate.
  }
  return candidates[0].id
}

async function generateWithTmdb(title: string, context: TmdbMovieContext): Promise<MovieDraft> {
  const userPrompt = `电影名称：${title}
TMDB 片名：${context.title}
原名：${context.originalTitle}
上映日期：${context.releaseDate ?? '未知'}
导演：${context.director ?? '未知'}
主演：${context.actors.slice(0, 5).join('、') || '未知'}
TMDB 评分（10 分制）：${context.voteAverage ?? '未知'}
TMDB 类型：${context.genres.join('、')}
地区：${context.region ?? '未知'}
TMDB 简介：${context.overview.slice(0, 2000)}

请撰写影评正文，并从候选列表中选出最贴切的中文风格标签。`

  const draft = await chatJson(withDataSchema, SYSTEM_PROMPT, userPrompt)

  const coverImage = context.posterUrl ? await saveRemoteImage(context.posterUrl) : undefined
  const backgroundImage = context.backdropUrl
    ? await saveRemoteImage(context.backdropUrl)
    : undefined

  return {
    title: context.title || title,
    content: draft.content?.trim() || '<p>（AI 未生成正文，请手动撰写。）</p>',
    score: clampScore(context.voteAverage ?? 8.0),
    director: draft.director?.trim() || context.director || '未知',
    actors: draft.actors?.trim() || context.actors.slice(0, 5).join('，'),
    genres: filterGenres(draft.genres),
    region: context.region ?? undefined,
    releaseDate: context.releaseDate ?? `${new Date().getFullYear()}-01-01`,
    coverImage,
    backgroundImage,
  }
}

async function generateWithAiOnly(title: string): Promise<MovieDraft> {
  const draft = await chatJson(
    fallbackSchema,
    FALLBACK_SYSTEM_PROMPT,
    `电影名称：《${title}》。请基于你的资料撰写影评并补全元数据。`,
  )

  const coverImage = draft.coverImage ? await saveRemoteImage(draft.coverImage) : undefined
  const backgroundImage = draft.backgroundImage
    ? await saveRemoteImage(draft.backgroundImage)
    : undefined

  return {
    title: draft.title?.trim() || title,
    content: draft.content?.trim() || '<p>（AI 未生成正文，请手动撰写。）</p>',
    score: clampScore(Number(draft.score ?? 8.0)),
    director: draft.director?.trim() || '未知',
    actors: draft.actors?.trim() || '',
    genres: filterGenres(draft.genres),
    region: draft.region?.trim() || undefined,
    releaseDate: draft.releaseDate?.trim() || `${new Date().getFullYear()}-01-01`,
    coverImage,
    backgroundImage,
  }
}

export async function generateMovieDraft(input: { title: string }): Promise<MovieDraft> {
  const title = input.title.trim()
  if (!title) throw new IntegrationError('请填写片名', 'INVALID_TITLE', 400)

  const candidates = await searchMovies(title)
  if (candidates.length === 0) return generateWithAiOnly(title)

  const selectedId = candidates.length === 1 ? candidates[0].id : await disambiguate(title, candidates)
  const detail = await getMovieDetail(selectedId)
  if (!detail) return generateWithAiOnly(title)

  return generateWithTmdb(title, detail)
}
