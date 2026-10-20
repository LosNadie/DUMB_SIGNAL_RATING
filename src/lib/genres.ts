/**
 * Canonical genre catalogue.
 *
 * Genres are shared by the three content types. Editors pick a Chinese label;
 * URLs use the ASCII slug (`/music?genre=post-rock`). The legacy database used
 * a mix of ASCII codes (`ROCK`, `RNB`) and Chinese labels (`后摇`), so the
 * alias table below is used by the importer and by admin input.
 */

export interface GenreDefinition {
  /** Chinese label shown in the UI. */
  name: string
  /** ASCII slug used in crawlable URLs. */
  slug: string
  /** Labels seen in legacy data that should map to this genre. */
  aliases?: string[]
  /** Grouping used by the admin picker. */
  group: GenreGroup
}

export type GenreGroup =
  | 'pop'
  | 'rock'
  | 'hiphop'
  | 'electronic'
  | 'rnb'
  | 'jazz'
  | 'classical'
  | 'folk'
  | 'anime'
  | 'film'

export const GENRE_GROUP_LABELS: Record<GenreGroup, string> = {
  pop: '流行 / 独立',
  rock: '摇滚',
  hiphop: '嘻哈 / Rap',
  electronic: '电子',
  rnb: 'R&B / 灵魂',
  jazz: '爵士',
  classical: '古典 / 器乐',
  folk: '民谣 / 世界',
  anime: '动漫题材',
  film: '影视题材',
}

export const GENRES: GenreDefinition[] = [
  // pop
  { name: '流行', slug: 'pop', aliases: ['POP'], group: 'pop' },
  { name: '独立流行', slug: 'indie-pop', group: 'pop' },
  { name: '合成器流行', slug: 'synth-pop', group: 'pop' },
  { name: '梦幻流行', slug: 'dream-pop', group: 'pop' },
  { name: '室内流行', slug: 'chamber-pop', group: 'pop' },
  { name: '艺术流行', slug: 'art-pop', group: 'pop' },
  { name: '舞曲流行', slug: 'dance-pop', group: 'pop' },
  { name: '电子流行', slug: 'electropop', group: 'pop' },
  { name: 'Hyperpop', slug: 'hyperpop', group: 'pop' },
  { name: '卧室流行', slug: 'bedroom-pop', group: 'pop' },
  { name: 'K-Pop', slug: 'k-pop', group: 'pop' },
  { name: 'J-Pop', slug: 'j-pop', group: 'pop' },
  { name: 'C-Pop', slug: 'c-pop', group: 'pop' },

  // rock
  { name: '摇滚', slug: 'rock', aliases: ['ROCK'], group: 'rock' },
  { name: '另类摇滚', slug: 'alternative-rock', group: 'rock' },
  { name: '独立摇滚', slug: 'indie-rock', group: 'rock' },
  { name: '后摇', slug: 'post-rock', group: 'rock' },
  { name: '数摇', slug: 'math-rock', group: 'rock' },
  { name: '迷幻摇滚', slug: 'psychedelic-rock', group: 'rock' },
  { name: '前卫摇滚', slug: 'progressive-rock', group: 'rock' },
  { name: '硬摇滚', slug: 'hard-rock', group: 'rock' },
  { name: '情绪摇滚', slug: 'emo', group: 'rock' },
  { name: 'Shoegaze', slug: 'shoegaze', group: 'rock' },
  { name: '后朋克', slug: 'post-punk', group: 'rock' },
  { name: '金属', slug: 'metal', group: 'rock' },

  // hiphop
  { name: '嘻哈', slug: 'hip-hop', aliases: ['HIP_HOP'], group: 'hiphop' },
  { name: '陷阱', slug: 'trap', group: 'hiphop' },
  { name: 'Drill', slug: 'drill', group: 'hiphop' },
  { name: 'Boom Bap', slug: 'boom-bap', group: 'hiphop' },
  { name: '意识嘻哈', slug: 'conscious-hip-hop', group: 'hiphop' },
  { name: '云雾说唱', slug: 'cloud-rap', group: 'hiphop' },
  { name: '爵士说唱', slug: 'jazz-rap', group: 'hiphop' },
  { name: '另类说唱', slug: 'alternative-rap', group: 'hiphop' },

  // electronic
  { name: '电子', slug: 'electronic', aliases: ['ELECTRONIC'], group: 'electronic' },
  { name: 'House', slug: 'house', group: 'electronic' },
  { name: 'Techno', slug: 'techno', group: 'electronic' },
  { name: 'Trance', slug: 'trance', group: 'electronic' },
  { name: '鼓打贝斯', slug: 'drum-and-bass', group: 'electronic' },
  { name: 'Dubstep', slug: 'dubstep', group: 'electronic' },
  { name: '未来贝斯', slug: 'future-bass', group: 'electronic' },
  { name: 'Synthwave', slug: 'synthwave', group: 'electronic' },
  { name: '蒸汽波', slug: 'vaporwave', group: 'electronic' },
  { name: '氛围音乐', slug: 'ambient', group: 'electronic' },
  { name: 'Trip Hop', slug: 'trip-hop', group: 'electronic' },
  { name: 'Glitch', slug: 'glitch', group: 'electronic' },

  // rnb
  { name: 'R&B', slug: 'r-and-b', aliases: ['R&B', 'RNB'], group: 'rnb' },
  { name: '新灵魂乐', slug: 'neo-soul', group: 'rnb' },
  { name: '另类R&B', slug: 'alternative-r-and-b', group: 'rnb' },
  { name: '放克', slug: 'funk', group: 'rnb' },
  { name: '灵魂乐', slug: 'soul', group: 'rnb' },

  // jazz
  { name: '爵士', slug: 'jazz', aliases: ['JAZZ'], group: 'jazz' },
  { name: 'Bebop', slug: 'bebop', group: 'jazz' },
  { name: 'Cool Jazz', slug: 'cool-jazz', group: 'jazz' },
  { name: '自由爵士', slug: 'free-jazz', group: 'jazz' },
  { name: '融合爵士', slug: 'fusion-jazz', group: 'jazz' },

  // classical
  { name: '古典', slug: 'classical', aliases: ['CLASSICAL'], group: 'classical' },
  { name: '器乐', slug: 'instrumental', group: 'classical' },
  { name: '电影原声', slug: 'soundtrack', group: 'classical' },

  // folk
  { name: '民谣', slug: 'folk', aliases: ['FOLK'], group: 'folk' },
  { name: '国风', slug: 'chinese-folk', group: 'folk' },
  { name: '古风', slug: 'ancient-style', group: 'folk' },
  { name: '世界音乐', slug: 'world', group: 'folk' },

  // anime themes
  { name: '热血', slug: 'shonen', group: 'anime' },
  { name: '战斗', slug: 'battle', group: 'anime' },
  { name: '奇幻', slug: 'fantasy', group: 'anime' },
  { name: '异世界', slug: 'isekai', group: 'anime' },
  { name: '科幻', slug: 'sci-fi', group: 'anime' },
  { name: '机甲', slug: 'mecha', group: 'anime' },
  { name: '治愈', slug: 'healing', group: 'anime' },
  { name: '日常', slug: 'slice-of-life', group: 'anime' },
  { name: '搞笑', slug: 'comedy', group: 'anime' },
  { name: '恋爱', slug: 'romance', group: 'anime' },
  { name: '纯爱', slug: 'pure-romance', group: 'anime' },
  { name: '青春', slug: 'youth', group: 'anime' },
  { name: '校园', slug: 'school', group: 'anime' },
  { name: '成长', slug: 'coming-of-age', group: 'anime' },
  { name: '悬疑', slug: 'mystery', group: 'anime' },
  { name: '推理', slug: 'detective', group: 'anime' },
  { name: '心理', slug: 'psychological', group: 'anime' },
  { name: '黑暗', slug: 'dark', group: 'anime' },
  { name: '战争', slug: 'war', group: 'anime' },
  { name: '历史', slug: 'history', group: 'anime' },
  { name: '音乐', slug: 'music', group: 'anime' },
  { name: '运动', slug: 'sports', group: 'anime' },
  { name: '超能力', slug: 'superpower', group: 'anime' },
  { name: '神作', slug: 'masterpiece', group: 'anime' },
  { name: '催泪', slug: 'tearjerker', group: 'anime' },
  { name: '少年', slug: 'boys', group: 'anime' },
  { name: '少女', slug: 'girls', group: 'anime' },
  { name: '后宫', slug: 'harem', group: 'anime' },
  { name: '转生', slug: 'reincarnation', group: 'anime' },
  { name: '轮回', slug: 'time-loop', group: 'anime' },
  { name: '妖怪', slug: 'yokai', group: 'anime' },
  { name: '鬼怪', slug: 'supernatural', group: 'anime' },
  { name: '赛博朋克', slug: 'cyberpunk', group: 'anime' },
  { name: '武侠', slug: 'wuxia', group: 'anime' },
  { name: '格斗', slug: 'fighting', group: 'anime' },
  { name: '竞技', slug: 'competition', group: 'anime' },
  { name: '生存', slug: 'survival', group: 'anime' },
  { name: '轻小说改', slug: 'light-novel', group: 'anime' },
  { name: '泡面番', slug: 'short-form', group: 'anime' },
  { name: '天然呆', slug: 'airhead', group: 'anime' },
  { name: '病娇', slug: 'yandere', group: 'anime' },
  { name: '友情', slug: 'friendship', group: 'anime' },
  { name: '兄妹', slug: 'siblings', group: 'anime' },
  { name: '未来', slug: 'future', group: 'anime' },
  { name: '悬疑反转', slug: 'plot-twist', group: 'anime' },
  { name: '青年', slug: 'seinen', group: 'anime' },

  // film themes
  { name: '剧情', slug: 'drama', group: 'film' },
  { name: '传记', slug: 'biography', group: 'film' },
  { name: '家庭', slug: 'family', group: 'film' },
  { name: '亲情', slug: 'kinship', group: 'film' },
  { name: '犯罪', slug: 'crime', group: 'film' },
  { name: '惊悚', slug: 'thriller', group: 'film' },
  { name: '冒险', slug: 'adventure', group: 'film' },
  { name: '爱情', slug: 'love', group: 'film' },
  { name: '动作', slug: 'action', group: 'film' },
]

const BY_NAME = new Map<string, GenreDefinition>()
const BY_SLUG = new Map<string, GenreDefinition>()

for (const genre of GENRES) {
  BY_NAME.set(genre.name.toLowerCase(), genre)
  BY_SLUG.set(genre.slug, genre)
  for (const alias of genre.aliases ?? []) {
    BY_NAME.set(alias.toLowerCase(), genre)
  }
}

/** Convert an arbitrary legacy label into a stable slug. */
export function slugifyGenreLabel(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return ''
  const ascii = trimmed
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (ascii) return ascii
  // Chinese labels without a catalogue entry: keep a deterministic,
  // URL-safe form by encoding the characters.
  return `genre-${Buffer.from(trimmed).toString('hex').slice(0, 24)}`
}

/** Resolve a label (Chinese name or legacy alias) to its catalogue entry. */
export function findGenre(label: string): GenreDefinition | undefined {
  return BY_NAME.get(label.trim().toLowerCase())
}

export function findGenreBySlug(slug: string): GenreDefinition | undefined {
  return BY_SLUG.get(slug.trim())
}

/** Resolve a label to a slug, falling back to a generated slug. */
export function resolveGenreSlug(label: string): string {
  return findGenre(label)?.slug ?? slugifyGenreLabel(label)
}

/** Normalise a comma separated legacy genre string. */
export function parseGenreList(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export const GENRE_OPTIONS = GENRES.map(({ name, slug, group }) => ({ name, slug, group }))
