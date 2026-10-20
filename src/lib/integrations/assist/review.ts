import 'server-only'

import { z } from 'zod'

import { chatJson, IntegrationError, MAX_DESCRIPTION_CHARS } from '@/lib/integrations/deepseek'
import { buildTracksFromSource, findAlbum } from '@/lib/integrations/lastfm'
import { saveRemoteImage } from '@/lib/uploads'

export interface ReviewDraft {
  year?: string
  tracks?: string
  description?: string
  coverImage?: string
  rawAlbumMeta?: Record<string, unknown>
}

/** Ported verbatim from ReviewAiGenerationServiceImpl so drafts stay consistent. */
const SYSTEM_PROMPT = `你是一位熟悉音乐场景的专业乐评人，尤其了解全球的音乐生态。
你必须只输出一个 JSON 对象，不要输出任何其它文字、Markdown 或代码围栏。
JSON 字段：year（字符串）、tracks（字符串）、leadTrack（字符串）、description（字符串）。

【唯一模式：已从 Last.fm 锁定完整官方曲目】
- tracks：必须为空字符串 ""（服务端会用 Last.fm 列表拼接，禁止你填写曲目）。
- leadTrack：任选一首主打，填入与官方列表中某一曲名完全一致的字符串（含标点、大小写、feat. 等）；不确定则填 ""。
- description：乐评正文，可引用用户消息中的官方曲名进行分析，但不要输出完整曲目表。
- year：必须与用户给定年份完全一致。

description 使用 HTML 片段：多个 <p>...</p>，可适度 <strong>，不要 <html>/<body>。
正文为简体中文，600–1000 个汉字（近似），须满足：
从「音乐场景」切入但不完全被场景定义；文艺克制、有画面感；结合具体曲目写旋律、编曲、情绪与听感；
可类比其它艺人/厂牌/阶段；强调年轻气质、乐迷属性、场景归属但要有反思；分析风格融合；
结尾整体评价并上升到当下音乐环境；句式偏长有节奏，理性与感性兼顾，适当批判。
内容须尊重事实、避免人身攻击与侵权表述。`

const draftSchema = z.object({
  year: z.string().optional(),
  tracks: z.string().optional(),
  leadTrack: z.string().optional(),
  description: z.string().optional(),
})

export async function generateReviewDraft(input: {
  artist: string
  albumTitle: string
  year: string
}): Promise<ReviewDraft> {
  const artist = input.artist.trim()
  const albumTitle = input.albumTitle.trim()
  const year = input.year.trim()

  if (!/^(19|20)\d{2}$/.test(year)) {
    throw new IntegrationError('年份格式应为 4 位数字，例如 2024', 'INVALID_YEAR', 400)
  }

  const album = await findAlbum(artist, albumTitle)
  if (!album) {
    throw new IntegrationError(
      '未从 Last.fm 匹配到专辑，请检查艺人/专辑名称或配置 LASTFM_API_KEY',
      'ALBUM_NOT_FOUND',
      400,
    )
  }
  if (!album.trackNames.length) {
    throw new IntegrationError(
      '已匹配到 Last.fm 专辑，但未拿到官方曲目列表，请更换艺人/专辑名称后重试',
      'EMPTY_TRACKLIST',
      400,
    )
  }

  const sourceJson = JSON.stringify({
    artist: album.artistName,
    album: album.albumName,
    releaseDate: album.releaseDate,
    tracks: album.trackNames,
    source: album.url,
  })

  const userPrompt = `【已从 Last.fm 锁定完整官方曲目，共 ${album.trackNames.length} 首，请仅按官方曲目写作】
艺人：${artist}
专辑：${albumTitle}

用户指定年份（必须严格使用此值）：${year}

专辑元数据（含按播放顺序的完整曲目，写作时可引用曲名）：${sourceJson}

要求：tracks 填 ""；leadTrack 填与上述曲目中某一项完全一致的主打曲名，或 ""；
year 必须等于用户指定年份；description 为 HTML 乐评正文，勿罗列完整曲目表。`

  const draft = await chatJson(draftSchema, SYSTEM_PROMPT, userPrompt)

  const description = (draft.description ?? '').slice(0, MAX_DESCRIPTION_CHARS).trim()
  const tracks = buildTracksFromSource(album.trackNames, draft.leadTrack?.trim() || null)

  let coverImage: string | undefined
  if (album.coverImageUrl) {
    coverImage = await saveRemoteImage(album.coverImageUrl)
  }

  return {
    year,
    tracks,
    description: description || '<p>（AI 未生成正文，请手动撰写乐评。）</p>',
    coverImage,
    rawAlbumMeta: {
      source: 'lastfm',
      lastfmUrl: album.url,
      lastfmMbid: album.mbid,
      matchedAlbumName: album.albumName,
      matchedArtistName: album.artistName,
      releaseDate: album.releaseDate,
      sourceCoverImageUrl: album.coverImageUrl,
      trackCount: album.trackNames.length,
    },
  }
}
