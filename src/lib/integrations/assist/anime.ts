import 'server-only'

import { z } from 'zod'

import { chatJson, IntegrationError } from '@/lib/integrations/deepseek'
import { findAnime, type AniListAnimeContext } from '@/lib/integrations/anilist'
import { saveRemoteImage } from '@/lib/uploads'

export interface AnimeDraft {
  title?: string
  content?: string
  score?: number
  studio?: string
  genres?: string[]
  releaseDate?: string
  coverImage?: string
  backgroundImage?: string
}

const GENRE_LIST =
  '热血、战斗、格斗、冒险、王道、少年、少女、青年、后宫、逆后宫、恋爱、纯爱、青春、校园、治愈、' +
  '催泪、悬疑、推理、侦探、犯罪、心理、智斗、黑暗、致郁、科幻、未来、赛博朋克、机甲、太空、' +
  '异世界、穿越、转生、奇幻、魔法、超能力、妖怪、鬼怪、神话、武侠、历史、战争、军事、竞技、' +
  '运动、音乐、偶像、歌舞、搞笑、日常、美食、职场、社会、政治、家庭、亲情、友情、成长、生存、' +
  '末日、丧尸、灾难、时间循环、平行世界、轮回、重生、系统流、升级流、种田流、爽文、轻小说改、' +
  '漫画改、原创、剧场版、OVA、泡面番、百合、BL、GL、兄妹、青梅竹马、傲娇、病娇、天然呆、腹黑、' +
  '反派、反英雄、暗黑英雄、悬疑反转、群像、单元剧、公路片、蒸汽波、赛博、国风、古风、玄幻、' +
  '修真、神作、冷门、神展开、开放结局'

const SYSTEM_PROMPT = `你是一位资深动漫评论家，负责基于 AniList 官方数据撰写评论。
你必须只输出一个 JSON 对象，不要输出任何其它文字、Markdown 或代码围栏。
JSON 字段：content（字符串）、genres（字符串数组，最多 5 个）。

【字段说明】
- content：动漫评论正文，使用 HTML 片段。风格必须遵循以下要求：
  · 分段使用 emoji 小标题，如 <h3>🎩 人物设定</h3>、<h3>🌀 世界观 / 剧情核心</h3>、<h3>🌸 氛围质感</h3>、<h3>💫 风格特色</h3>、<h3>✨ 为什么值得看</h3>
  · 每个段落用 <p>...</p> 包裹，短句为主，节奏轻快，可适当使用颜文字 (´･ω･\`) 或 emoji
  · 结尾必须有 <p><strong>📌 一句话推荐：</strong>...</p>
  · 正文为简体中文，400–800 个汉字
  · 内容须尊重事实，可引用 AniList 数据作为参考但不要整段复制
  · 不要输出 <html> / <body>
- genres：从【中文风格候选列表】中选取最贴切的 1–5 个（必须完全匹配），参考 AniList 的英文 genres 进行对应。

【中文风格候选列表】
${GENRE_LIST}。`

const FALLBACK_SYSTEM_PROMPT = `你是一位资深动漫评论家与资料库管理员，对全球动漫作品有深入了解。
你必须只输出一个 JSON 对象，不要输出任何其它文字、Markdown 或代码围栏。
JSON 字段：title（字符串）、content（字符串）、score（字符串，0.0-10.0 之间的一位小数）、studio（字符串）、genres（字符串数组，最多 5 个）、releaseDate（字符串，YYYY-MM-DD 格式）、coverImage（字符串，封面图 URL）、backgroundImage（字符串，背景图 URL）。

【字段说明】
- title：动漫的标准中文译名（或原名）。
- content：动漫评论正文，使用 HTML 片段。风格要求同上一模式。
- score：综合评分，0.0–10.0 之间，保留一位小数。
- studio：主要动画制作公司。
- genres：从【中文风格候选列表】中选取最贴切的 1–5 个（必须完全匹配）。
- releaseDate：首播日期，格式 YYYY-MM-DD；若只有年份则填 YYYY-01-01。
- coverImage：尽量返回可靠封面图 URL；若不确定则返回空字符串。
- backgroundImage：尽量返回可靠背景图 URL；若不确定则返回空字符串。

【中文风格候选列表】
${GENRE_LIST}。`

const TRANSLATE_SYSTEM_PROMPT = `你是一位精通中日英三语的动漫资料专家。
请将用户提供的中文动漫名称翻译成它在 AniList 数据库中最可能匹配的官方名称。
优先返回日文原名（如：古見さんは、コミ症です。），其次返回英文官方名（如：Komi Can't Communicate）。
只输出一个 JSON 对象：{"title": "翻译后的名称"}。不要输出任何其他文字、解释或 Markdown。`

const withDataSchema = z.object({
  content: z.string().optional(),
  genres: z.array(z.string()).optional(),
})

const fallbackSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  score: z.union([z.string(), z.number()]).optional(),
  studio: z.string().optional(),
  genres: z.array(z.string()).optional(),
  releaseDate: z.string().optional(),
  coverImage: z.string().optional(),
  backgroundImage: z.string().optional(),
})

const translateSchema = z.object({ title: z.string().optional() })

const VALID_GENRES = new Set(GENRE_LIST.split('、'))

function filterGenres(genres: string[] | undefined): string[] {
  return (genres ?? []).filter((genre) => VALID_GENRES.has(genre)).slice(0, 5)
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 8.0
  return Math.round(Math.min(10, Math.max(0, value)) * 10) / 10
}

async function generateWithAniList(
  originalTitle: string,
  context: AniListAnimeContext,
): Promise<AnimeDraft> {
  const userPrompt = `动漫名称：${originalTitle}
AniList 匹配名称：${context.title}
别名：${context.titles.join(' / ')}
制作公司：${context.studio ?? '未知'}
首播日期：${context.releaseDate ?? '未知'}
AniList 平均分（100 分制）：${context.averageScore ?? '未知'}
AniList 标签：${context.genres.join('、')}
AniList 简介：${(context.description ?? '').slice(0, 2000)}

请撰写评论正文，并从候选列表中选出最贴切的中文风格标签。`

  const draft = await chatJson(withDataSchema, SYSTEM_PROMPT, userPrompt)

  const coverImage = context.coverImage ? await saveRemoteImage(context.coverImage) : undefined
  const backgroundImage = context.bannerImage ? await saveRemoteImage(context.bannerImage) : undefined

  return {
    title: originalTitle,
    content: draft.content?.trim() || '<p>（AI 未生成正文，请手动撰写。）</p>',
    score: clampScore(context.averageScore != null ? context.averageScore / 10 : 8.0),
    studio: context.studio ?? '未知',
    genres: filterGenres(draft.genres),
    releaseDate: context.releaseDate ?? `${new Date().getFullYear()}-01-01`,
    coverImage,
    backgroundImage,
  }
}

async function translateTitle(title: string): Promise<string | null> {
  try {
    const result = await chatJson(
      translateSchema,
      TRANSLATE_SYSTEM_PROMPT,
      `动漫名称：《${title}》`,
    )
    const translated = result.title?.trim()
    return translated && translated !== title ? translated : null
  } catch {
    return null
  }
}

async function generateWithAiOnly(originalTitle: string): Promise<AnimeDraft> {
  const draft = await chatJson(
    fallbackSchema,
    FALLBACK_SYSTEM_PROMPT,
    `动漫名称：《${originalTitle}》。请基于你的资料撰写评论并补全元数据。`,
  )

  const coverImage = draft.coverImage ? await saveRemoteImage(draft.coverImage) : undefined
  const backgroundImage = draft.backgroundImage
    ? await saveRemoteImage(draft.backgroundImage)
    : undefined

  return {
    title: draft.title?.trim() || originalTitle,
    content: draft.content?.trim() || '<p>（AI 未生成正文，请手动撰写。）</p>',
    score: clampScore(Number(draft.score ?? 8.0)),
    studio: draft.studio?.trim() || '未知',
    genres: filterGenres(draft.genres),
    releaseDate: draft.releaseDate?.trim() || `${new Date().getFullYear()}-01-01`,
    coverImage,
    backgroundImage,
  }
}

export async function generateAnimeDraft(input: { title: string }): Promise<AnimeDraft> {
  const originalTitle = input.title.trim()
  if (!originalTitle) throw new IntegrationError('请填写作品名', 'INVALID_TITLE', 400)

  const direct = await findAnime(originalTitle)
  if (direct) return generateWithAniList(originalTitle, direct)

  const translated = await translateTitle(originalTitle)
  if (translated) {
    const viaTranslation = await findAnime(translated)
    if (viaTranslation) return generateWithAniList(originalTitle, viaTranslation)
  }

  return generateWithAiOnly(originalTitle)
}
