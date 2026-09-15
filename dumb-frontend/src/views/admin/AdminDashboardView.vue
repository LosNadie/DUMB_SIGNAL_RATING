<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import { useRouter } from 'vue-router'
import type { UploadProps } from 'element-plus'
import { animeApi, movieApi, reviewApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import http from '../../api/http'
import type { AnimeItem, ApiResult, MovieItem, ReviewItem } from '../../types/models'
import RichEditor from '../../components/common/RichEditor.vue'
import StarfieldBackground from '../../components/common/StarfieldBackground.vue'

const REVIEW_DEFAULT_SCORE = 8.5
type AdminMenu = 'review' | 'news' | 'interview'

const REVIEW_GENRE_CATEGORIES = [
  {
    label: '流行 / 独立',
    options: [
      { label: '流行', value: '流行' },
      { label: '独立流行', value: '独立流行' },
      { label: '合成器流行', value: '合成器流行' },
      { label: '梦幻流行', value: '梦幻流行' },
      { label: '室内流行', value: '室内流行' },
      { label: '巴洛克流行', value: '巴洛克流行' },
      { label: '艺术流行', value: '艺术流行' },
      { label: '舞曲流行', value: '舞曲流行' },
      { label: '电子流行', value: '电子流行' },
      { label: 'Hyperpop', value: 'Hyperpop' },
      { label: '卧室流行', value: '卧室流行' },
    ],
  },
  {
    label: '摇滚',
    options: [
      { label: '摇滚', value: '摇滚' },
      { label: '另类摇滚', value: '另类摇滚' },
      { label: '独立摇滚', value: '独立摇滚' },
      { label: '后摇', value: '后摇' },
      { label: '数摇', value: '数摇' },
      { label: '迷幻摇滚', value: '迷幻摇滚' },
      { label: '前卫摇滚', value: '前卫摇滚' },
      { label: '硬摇滚', value: '硬摇滚' },
      { label: '情绪摇滚', value: '情绪摇滚' },
      { label: '中西部情绪', value: '中西部情绪' },
    ],
  },
  {
    label: '嘻哈 / Rap',
    options: [
      { label: '嘻哈', value: '嘻哈' },
      { label: '陷阱', value: '陷阱' },
      { label: 'Drill', value: 'Drill' },
      { label: 'Boom Bap', value: 'Boom Bap' },
      { label: '意识嘻哈', value: '意识嘻哈' },
      { label: '云雾说唱', value: '云雾说唱' },
      { label: 'Plugg', value: 'Plugg' },
      { label: 'Phonk', value: 'Phonk' },
      { label: 'Rage', value: 'Rage' },
      { label: '爵士说唱', value: '爵士说唱' },
      { label: '另类说唱', value: '另类说唱' },
      { label: 'Grime', value: 'Grime' },
      { label: '抽象嘻哈', value: '抽象嘻哈' },
      { label: 'mumble rap', value: 'mumble rap' },
    ],
  },
  {
    label: '电子',
    options: [
      { label: '电子', value: '电子' },
      { label: 'House', value: 'House' },
      { label: 'Techno', value: 'Techno' },
      { label: 'Trance', value: 'Trance' },
      { label: '鼓打贝斯', value: '鼓打贝斯' },
      { label: 'Dubstep', value: 'Dubstep' },
      { label: '未来贝斯', value: '未来贝斯' },
      { label: 'Synthwave', value: 'Synthwave' },
      { label: '蒸汽波', value: '蒸汽波' },
      { label: '氛围音乐', value: '氛围音乐' },
      { label: '智能舞曲', value: '智能舞曲' },
      { label: 'Glitch', value: 'Glitch' },
      { label: 'Deep House', value: 'Deep House' },
      { label: 'Progressive House', value: 'Progressive House' },
      { label: 'Breakbeat', value: 'Breakbeat' },
      { label: 'Jungle', value: 'Jungle' },
      { label: 'Electro', value: 'Electro' },
      { label: 'Trip Hop', value: 'Trip Hop' },
      { label: 'Chillwave', value: 'Chillwave' },
      { label: 'witch house', value: 'witch house' },
    ],
  },
  {
    label: 'R&B / 灵魂',
    options: [
      { label: 'R&B', value: 'R&B' },
      { label: '新灵魂乐', value: '新灵魂乐' },
      { label: '另类R&B', value: '另类R&B' },
      { label: 'Neo-Soul', value: 'Neo-Soul' },
      { label: 'Quiet Storm', value: 'Quiet Storm' },
      { label: '当代R&B', value: '当代R&B' },
      { label: '放克', value: '放克' },
      { label: '灵魂乐', value: '灵魂乐' },
    ],
  },
  {
    label: '爵士',
    options: [
      { label: '爵士', value: '爵士' },
      { label: '摇摆乐', value: '摇摆乐' },
      { label: 'Bebop', value: 'Bebop' },
      { label: 'Cool Jazz', value: 'Cool Jazz' },
      { label: '自由爵士', value: '自由爵士' },
      { label: '融合爵士', value: '融合爵士' },
    ],
  },
  {
    label: '东亚流行',
    options: [
      { label: 'K-Pop', value: 'K-Pop' },
      { label: 'J-Pop', value: 'J-Pop' },
      { label: 'C-Pop', value: 'C-Pop' },
    ],
  },
  {
    label: '古典 / 器乐',
    options: [
      { label: '古典', value: '古典' },
      { label: '极简主义', value: '极简主义' },
      { label: '新古典', value: '新古典' },
      { label: '电影原声', value: '电影原声' },
      { label: '管弦乐', value: '管弦乐' },
      { label: '钢琴独奏', value: '钢琴独奏' },
    ],
  },
  {
    label: '其他',
    options: [
      { label: '福音', value: '福音' },
      { label: '民谣', value: '民谣' },
    ],
  },
] as const

// @ts-expect-error flatMap type inference issue with readonly arrays
const allReviewGenres = REVIEW_GENRE_CATEGORIES.flatMap((c: { options: { label: string; value: string }[] }) => c.options)

const ANIME_GENRE_OPTIONS = [
  '热血', '战斗', '格斗', '冒险', '王道', '少年', '少女', '青年', '后宫', '逆后宫',
  '恋爱', '纯爱', '青春', '校园', '治愈', '催泪', '悬疑', '推理', '侦探', '犯罪',
  '心理', '智斗', '黑暗', '致郁', '科幻', '未来', '赛博朋克', '机甲', '太空', '异世界',
  '穿越', '转生', '奇幻', '魔法', '超能力', '妖怪', '鬼怪', '神话', '武侠', '历史',
  '战争', '军事', '竞技', '运动', '音乐', '偶像', '歌舞', '搞笑', '日常', '美食',
  '职场', '社会', '政治', '家庭', '亲情', '友情', '成长', '生存', '末日', '丧尸',
  '灾难', '时间循环', '平行世界', '轮回', '重生', '系统流', '升级流', '种田流', '爽文', '轻小说改',
  '漫画改', '原创', '剧场版', 'OVA', '泡面番', '百合', 'BL', 'GL', '兄妹', '青梅竹马',
  '傲娇', '病娇', '天然呆', '腹黑', '反派', '反英雄', '暗黑英雄', '悬疑反转', '群像', '单元剧',
  '公路片', '蒸汽波', '赛博', '国风', '古风', '玄幻', '修真', '神作', '冷门', '神展开', '开放结局',
] as const

const MOVIE_GENRE_OPTIONS = [
  '剧情', '喜剧', '爱情', '动作', '冒险', '奇幻', '科幻', '悬疑', '惊悚', '恐怖',
  '犯罪', '黑帮', '警匪', '战争', '历史', '传记', '音乐', '歌舞', '西部', '武侠',
  '古装', '宫廷', '灾难', '末日', '丧尸', '怪兽', '怪谈', '灵异', '超自然', '心理',
  '家庭', '亲情', '青春', '校园', '成长', '体育', '竞技', '赛车', '公路', '美食',
  '职场', '商战', '政治', '间谍', '谍战', '法庭', '律政', '医疗', '军事', '海战',
  '空战', '太空', '机甲', '赛博朋克', '蒸汽朋克', '异世界', '穿越', '时间旅行', '平行世界', '轮回',
  '复仇', '黑色电影', '黑色幽默', '讽刺', '荒诞', '实验电影', '艺术电影', '独立电影', '纪录片', '纪录剧情片',
  '动画', '定格动画', '黏土动画', '3D动画', '短片', '微电影', '系列电影', '史诗片', '大片', 'B级片',
  'Cult片', '公路片', '歌剧电影', '音乐纪录片',
] as const

const MOVIE_REGION_OPTIONS = [
  '中国大陆',
  '中国香港',
  '中国台湾',
  '亚洲',
  '美洲',
  '欧洲',
  '非洲',
] as const

interface ReviewFormState {
  score: number
  albumTitle: string
  artist: string
  genres: string[]
  year: string
  tracks: string
  backgroundImage: string
  description: string
  coverImage: string
}

interface NewsFormState {
  title: string
  content: string
  coverImage: string
  backgroundImage: string
  score: number
  studio: string
  genres: string[]
  releaseDate: string
}

interface InterviewFormState {
  title: string
  content: string
  coverImage: string
  backgroundImage: string
  score: number
  director: string
  actors: string
  genres: string[]
  region: string
  releaseDate: string
}

const authStore = useAuthStore()
const router = useRouter()
const activeMenu = ref<AdminMenu>('review')
const publishDialogVisible = ref(false)
const editingReviewId = ref<number | null>(null)
const editingNewsId = ref<number | null>(null)
const editingInterviewId = ref<number | null>(null)
const reviewRows = ref<ReviewItem[]>([])
const newsRows = ref<AnimeItem[]>([])
const interviewRows = ref<MovieItem[]>([])
const reviewListLoading = ref(false)
const newsListLoading = ref(false)
const interviewListLoading = ref(false)
const reviewSubmitting = ref(false)
const newsSubmitting = ref(false)
const interviewSubmitting = ref(false)
const coverUploading = ref(false)
const aiGenerating = ref(false)
const genreFilterKeyword = ref('')
const BACKEND_ORIGIN = 'http://localhost:8080'

const menuItems = [
  { key: 'review' as AdminMenu, label: '音乐管理' },
  { key: 'news' as AdminMenu, label: '动漫管理' },
  { key: 'interview' as AdminMenu, label: '电影管理' },
]

const reviewQuery = reactive({
  keyword: '',
  genre: '',
})

const newsQuery = reactive({
  keyword: '',
})

const interviewQuery = reactive({
  keyword: '',
})

const reviewForm = reactive<ReviewFormState>({
  score: REVIEW_DEFAULT_SCORE,
  albumTitle: '',
  artist: '',
  genres: [],
  year: '',
  tracks: '',
  backgroundImage: '',
  description: '',
  coverImage: '',
})
const newsForm = reactive<NewsFormState>({
  title: '',
  content: '',
  coverImage: '',
  backgroundImage: '',
  score: 8.0,
  studio: '',
  genres: [],
  releaseDate: '',
})
const interviewForm = reactive<InterviewFormState>({
  title: '',
  content: '',
  coverImage: '',
  backgroundImage: '',
  score: 8.0,
  director: '',
  actors: '',
  genres: [],
  region: '',
  releaseDate: '',
})

function resolveCoverUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/') || url.startsWith('/mock-covers/')) return url
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`
  return url
}

function resetReviewForm() {
  reviewForm.score = REVIEW_DEFAULT_SCORE
  reviewForm.albumTitle = ''
  reviewForm.artist = ''
  reviewForm.genres = []
  reviewForm.year = ''
  reviewForm.tracks = ''
  reviewForm.backgroundImage = ''
  reviewForm.description = ''
  reviewForm.coverImage = ''
  editingReviewId.value = null
}

function resetNewsForm() {
  newsForm.title = ''
  newsForm.content = ''
  newsForm.coverImage = ''
  newsForm.backgroundImage = ''
  newsForm.score = 8.0
  newsForm.studio = ''
  newsForm.genres = []
  newsForm.releaseDate = ''
  editingNewsId.value = null
}

function resetInterviewForm() {
  interviewForm.title = ''
  interviewForm.content = ''
  interviewForm.coverImage = ''
  interviewForm.backgroundImage = ''
  interviewForm.score = 8.0
  interviewForm.director = ''
  interviewForm.actors = ''
  interviewForm.genres = []
  interviewForm.region = ''
  interviewForm.releaseDate = ''
  editingInterviewId.value = null
}

const DRAFT_KEY_PREFIX = 'dumb_admin_draft_'

function getDraftKey() {
  return `${DRAFT_KEY_PREFIX}${activeMenu.value}`
}

function saveDraft() {
  // 编辑已有记录时不覆盖新建草稿
  if (isEditing()) {
    ElMessage.warning('修改已有记录无需保存草稿，关闭弹窗时会保留原有内容')
    return
  }
  const key = getDraftKey()
  let data: any
  if (activeMenu.value === 'review') {
    data = { ...reviewForm }
  } else if (activeMenu.value === 'news') {
    data = { ...newsForm }
  } else {
    data = { ...interviewForm }
  }
  localStorage.setItem(key, JSON.stringify(data))
  ElMessage.success('草稿已保存')
}

function loadDraft(): boolean {
  const key = getDraftKey()
  const raw = localStorage.getItem(key)
  if (!raw) return false
  try {
    const data = JSON.parse(raw)
    if (activeMenu.value === 'review') {
      Object.assign(reviewForm, data)
    } else if (activeMenu.value === 'news') {
      Object.assign(newsForm, data)
    } else {
      Object.assign(interviewForm, data)
    }
    return true
  } catch {
    return false
  }
}

function clearDraft() {
  localStorage.removeItem(getDraftKey())
}

function isEditing() {
  if (activeMenu.value === 'review') return !!editingReviewId.value
  if (activeMenu.value === 'news') return !!editingNewsId.value
  return !!editingInterviewId.value
}

function onDialogClose() {
  if (!isEditing()) {
    saveDraft()
  }
  // 关闭弹窗时清除编辑状态,防止后续「发布」按钮打开的是遗留的编辑数据
  editingReviewId.value = null
  editingNewsId.value = null
  editingInterviewId.value = null
}

function openPublishDialog() {
  if (activeMenu.value === 'review' && !editingReviewId.value) {
    resetReviewForm()
    loadDraft()
  } else if (activeMenu.value === 'news' && !editingNewsId.value) {
    resetNewsForm()
    loadDraft()
  } else if (activeMenu.value === 'interview' && !editingInterviewId.value) {
    resetInterviewForm()
    loadDraft()
  }
  publishDialogVisible.value = true
}

function parseReviewTitle(fullTitle: string) {
  const parts = fullTitle.split(' - ')
  if (parts.length >= 2) {
    return {
      artist: parts[0] ?? '',
      albumTitle: parts.slice(1).join(' - '),
    }
  }
  return {
    artist: '',
    albumTitle: fullTitle,
  }
}

function parseReviewContent(rawContent: string) {
  let genres: string[] = []
  let year = ''
  let tracks = ''
  let backgroundImage = ''
  let description = rawContent

  const lines = rawContent.split('\n')
  let processedLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('风格：')) {
      const raw = line.replace('风格：', '').trim()
      genres = raw.split(',').map((s) => s.trim()).filter(Boolean)
    } else if (line.startsWith('年份：')) {
      year = line.replace('年份：', '').trim()
    } else if (line.startsWith('曲目：')) {
      tracks = line.replace('曲目：', '').trim()
    } else if (line.startsWith('背景：')) {
      backgroundImage = line.replace('背景：', '').trim()
    } else {
      processedLines.push(line)
    }
  }

  description = processedLines.join('\n').trim()
  return { genres, year, tracks, backgroundImage, description }
}

function stripHtmlText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toggleGenre(value: string) {
  const idx = reviewForm.genres.indexOf(value)
  if (idx >= 0) {
    reviewForm.genres.splice(idx, 1)
  } else {
    reviewForm.genres.push(value)
  }
}

function hasReviewAiTargetFieldsFilled() {
  return Boolean(reviewForm.artist.trim() && reviewForm.albumTitle.trim() && reviewForm.year.trim())
}

function isValidYear(value: string) {
  return /^(19|20)\d{2}$/.test(value.trim())
}

function hasExistingAiDraftContent() {
  return (
    reviewForm.tracks.trim().length > 0
    || stripHtmlText(reviewForm.description).length > 0
    || reviewForm.coverImage.trim().length > 0
  )
}

function hasNewsAiTargetFieldsFilled() {
  return Boolean(newsForm.title.trim())
}

function hasExistingNewsAiDraftContent() {
  return (
    stripHtmlText(newsForm.content).length > 0
    || newsForm.studio.trim().length > 0
    || newsForm.genres.length > 0
    || newsForm.coverImage.trim().length > 0
  )
}

async function onAiGenerateNews() {
  if (!hasNewsAiTargetFieldsFilled()) {
    ElMessage.warning('请先填写动漫名称')
    return
  }
  if (hasExistingNewsAiDraftContent()) {
    try {
      await ElMessageBox.confirm('将覆盖当前已填写的内容，是否继续？', '确认覆盖', {
        type: 'warning',
        confirmButtonText: '覆盖',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
  }
  aiGenerating.value = true
  try {
    const res = await animeApi.aiGenerate({
      title: newsForm.title.trim(),
    })
    const data = res.data
    if (data.title) newsForm.title = data.title
    if (data.content) newsForm.content = data.content
    if (data.score !== undefined) newsForm.score = Number(data.score)
    if (data.studio) newsForm.studio = data.studio
    if (data.genres) newsForm.genres = data.genres
    if (data.releaseDate) newsForm.releaseDate = data.releaseDate
    if (data.coverImage) newsForm.coverImage = data.coverImage
    if (data.backgroundImage) newsForm.backgroundImage = data.backgroundImage
    ElMessage.success('AI 生成完成，请核对后再发布')
  } catch (e: any) {
    ElMessage.error(e?.message || 'AI 生成失败')
  } finally {
    aiGenerating.value = false
  }
}

async function onAiGenerateReview() {
  if (!hasReviewAiTargetFieldsFilled()) {
    ElMessage.warning('请先填写专辑名称、艺人、年份')
    return
  }
  if (!isValidYear(reviewForm.year)) {
    ElMessage.warning('年份格式不正确，请填写 4 位数字（如 2025）')
    return
  }
  if (hasExistingAiDraftContent()) {
    try {
      await ElMessageBox.confirm('将覆盖当前已填写的曲目、封面或描述，是否继续？', '确认覆盖', {
        type: 'warning',
        confirmButtonText: '覆盖',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
  }
  aiGenerating.value = true
  try {
    const res = await reviewApi.aiGenerate({
      artist: reviewForm.artist.trim(),
      albumTitle: reviewForm.albumTitle.trim(),
      year: reviewForm.year.trim(),
    })
    const data = res.data
    if (data.tracks) reviewForm.tracks = data.tracks
    if (data.description) reviewForm.description = data.description
    if (data.coverImage) reviewForm.coverImage = data.coverImage
    ElMessage.success('AI 生成完成，请核对后再发布')
  } catch (e: any) {
    ElMessage.error(e?.message || 'AI 生成失败')
  } finally {
    aiGenerating.value = false
  }
}

function hasInterviewAiTargetFieldsFilled() {
  return Boolean(interviewForm.title.trim())
}

function hasExistingInterviewAiDraftContent() {
  return (
    stripHtmlText(interviewForm.content).length > 0
    || interviewForm.director.trim().length > 0
    || interviewForm.actors.trim().length > 0
    || interviewForm.region.trim().length > 0
    || interviewForm.genres.length > 0
    || interviewForm.coverImage.trim().length > 0
    || interviewForm.backgroundImage.trim().length > 0
  )
}

async function onAiGenerateInterview() {
  if (!hasInterviewAiTargetFieldsFilled()) {
    ElMessage.warning('请先填写电影名称')
    return
  }
  if (hasExistingInterviewAiDraftContent()) {
    try {
      await ElMessageBox.confirm('将覆盖当前已填写的内容，是否继续？', '确认覆盖', {
        type: 'warning',
        confirmButtonText: '覆盖',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
  }
  aiGenerating.value = true
  try {
    const res = await movieApi.aiGenerate({
      title: interviewForm.title.trim(),
    })
    const data = res.data
    if (data.title) interviewForm.title = data.title
    if (data.content) interviewForm.content = data.content
    if (data.score !== undefined) interviewForm.score = Number(data.score)
    if (data.director) interviewForm.director = data.director
    if (data.actors) interviewForm.actors = data.actors
    if (data.region) interviewForm.region = data.region
    if (data.genres) interviewForm.genres = data.genres
    if (data.releaseDate) interviewForm.releaseDate = data.releaseDate
    if (data.coverImage) interviewForm.coverImage = data.coverImage
    if (data.backgroundImage) interviewForm.backgroundImage = data.backgroundImage
    ElMessage.success('AI 生成完成，请核对后再发布')
  } catch (e: any) {
    ElMessage.error(e?.message || 'AI 生成失败')
  } finally {
    aiGenerating.value = false
  }
}

async function loadAdminReviews() {
  reviewListLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (reviewQuery.keyword.trim()) params.keyword = reviewQuery.keyword.trim()
    if (reviewQuery.genre) params.genre = reviewQuery.genre
    const res = await reviewApi.adminList(params)
    reviewRows.value = res.data
  } catch (e: any) {
    ElMessage.error(e?.message || '加载乐评列表失败')
  } finally {
    reviewListLoading.value = false
  }
}

async function loadAdminNews() {
  newsListLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (newsQuery.keyword.trim()) params.keyword = newsQuery.keyword.trim()
    const res = await animeApi.adminList(params)
    newsRows.value = res.data
  } catch (e: any) {
    ElMessage.error(e?.message || '加载动漫列表失败')
  } finally {
    newsListLoading.value = false
  }
}

async function loadAdminInterviews() {
  interviewListLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (interviewQuery.keyword.trim()) params.keyword = interviewQuery.keyword.trim()
    const res = await movieApi.adminList(params)
    interviewRows.value = res.data
  } catch (e: any) {
    ElMessage.error(e?.message || '加载电影列表失败')
  } finally {
    interviewListLoading.value = false
  }
}

function onReviewSearch() {
  void loadAdminReviews()
}

function resetReviewSearch() {
  reviewQuery.keyword = ''
  reviewQuery.genre = ''
  void loadAdminReviews()
}

function onNewsSearch() {
  void loadAdminNews()
}

function resetNewsSearch() {
  newsQuery.keyword = ''
  void loadAdminNews()
}

function onInterviewSearch() {
  void loadAdminInterviews()
}

function resetInterviewSearch() {
  interviewQuery.keyword = ''
  void loadAdminInterviews()
}

const beforeCoverUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const isValidType = rawFile.type === 'image/jpeg' || rawFile.type === 'image/png'
  if (!isValidType) {
    ElMessage.error('仅支持 JPG/PNG 格式')
  }
  return isValidType
}

const uploadCover: UploadProps['httpRequest'] = async (options) => {
  const file = options.file as File
  const formData = new FormData()
  formData.append('file', file)
  coverUploading.value = true
  try {
    const res = await http.post<any, ApiResult<string>>('/admin/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (activeMenu.value === 'review') {
      reviewForm.coverImage = res.data
    } else if (activeMenu.value === 'news') {
      newsForm.coverImage = res.data
    } else if (activeMenu.value === 'interview') {
      interviewForm.coverImage = res.data
    }
    ElMessage.success('封面上传成功')
    options.onSuccess?.(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '封面上传失败')
    options.onError?.(e)
  } finally {
    coverUploading.value = false
  }
}

const uploadNewsBackground: UploadProps['httpRequest'] = async (options) => {
  const file = options.file as File
  const formData = new FormData()
  formData.append('file', file)
  coverUploading.value = true
  try {
    const res = await http.post<any, ApiResult<string>>('/admin/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    newsForm.backgroundImage = res.data
    ElMessage.success('背景上传成功')
    options.onSuccess?.(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '背景上传失败')
    options.onError?.(e)
  } finally {
    coverUploading.value = false
  }
}

const uploadReviewBackground: UploadProps['httpRequest'] = async (options) => {
  const file = options.file as File
  const formData = new FormData()
  formData.append('file', file)
  coverUploading.value = true
  try {
    const res = await http.post<any, ApiResult<string>>('/admin/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    reviewForm.backgroundImage = res.data
    ElMessage.success('背景上传成功')
    options.onSuccess?.(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '背景上传失败')
    options.onError?.(e)
  } finally {
    coverUploading.value = false
  }
}

const uploadInterviewBackground: UploadProps['httpRequest'] = async (options) => {
  const file = options.file as File
  const formData = new FormData()
  formData.append('file', file)
  coverUploading.value = true
  try {
    const res = await http.post<any, ApiResult<string>>('/admin/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    interviewForm.backgroundImage = res.data
    ElMessage.success('背景上传成功')
    options.onSuccess?.(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '背景上传失败')
    options.onError?.(e)
  } finally {
    coverUploading.value = false
  }
}

async function submitReview() {
  if (!reviewForm.albumTitle.trim()) {
    ElMessage.warning('请输入专辑名称')
    return
  }
  if (!reviewForm.artist.trim()) {
    ElMessage.warning('请输入艺人')
    return
  }
  if (!stripHtmlText(reviewForm.description)) {
    ElMessage.warning('请输入描述')
    return
  }

  let bgImage = reviewForm.backgroundImage
  if (!bgImage) {
    const targetArtist = reviewForm.artist.trim().toLowerCase()
    const sameArtist = reviewRows.value.find((r) => {
      return (r.artist || '').toLowerCase() === targetArtist && r.content
    })
    if (sameArtist?.content) {
      const match = sameArtist.content.match(/背景：(.+)/)
      const matchedBackground = match?.[1]?.trim()
      if (matchedBackground) bgImage = matchedBackground
    }
  }

  const payload = {
    title: `${reviewForm.artist} - ${reviewForm.albumTitle}`,
    content: `风格：${reviewForm.genres.join(',')}\n年份：${reviewForm.year}\n曲目：${reviewForm.tracks}\n背景：${bgImage}\n\n${reviewForm.description}`,
    score: reviewForm.score,
    coverImage: reviewForm.coverImage,
  }
  reviewSubmitting.value = true
  try {
    if (editingReviewId.value) {
      await reviewApi.update(editingReviewId.value, payload)
      ElMessage.success('乐评更新成功')
    } else {
      await reviewApi.create(payload)
      ElMessage.success('乐评发布成功')
    }
    clearDraft()
    publishDialogVisible.value = false
    resetReviewForm()
    await loadAdminReviews()
  } catch (e: any) {
    ElMessage.error(e?.message || '乐评提交失败')
  } finally {
    reviewSubmitting.value = false
  }
}

async function editReview(id: number) {
  try {
    const res = await reviewApi.adminDetail(id)
    const detail = res.data
    const titleInfo = parseReviewTitle(detail.title || '')
    const contentInfo = parseReviewContent(detail.content || '')
    reviewForm.score = Number(detail.score ?? REVIEW_DEFAULT_SCORE)
    reviewForm.coverImage = detail.coverImage || ''
    reviewForm.artist = titleInfo.artist
    reviewForm.albumTitle = titleInfo.albumTitle
    reviewForm.genres = contentInfo.genres
    reviewForm.year = contentInfo.year
    reviewForm.tracks = contentInfo.tracks
    reviewForm.backgroundImage = contentInfo.backgroundImage
    reviewForm.description = contentInfo.description
    editingReviewId.value = id
    activeMenu.value = 'review'
    publishDialogVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.message || '加载乐评详情失败')
  }
}

async function deleteReview(id: number) {
  try {
    await reviewApi.remove(id)
    ElMessage.success('乐评删除成功')
    if (editingReviewId.value === id) {
      resetReviewForm()
    }
    await loadAdminReviews()
  } catch (e: any) {
    ElMessage.error(e?.message || '乐评删除失败')
  }
}

async function submitNews() {
  if (!newsForm.title.trim()) {
    ElMessage.warning('请输入动漫名称')
    return
  }
  if (!newsForm.studio.trim()) {
    ElMessage.warning('请输入制片商')
    return
  }
  if (!stripHtmlText(newsForm.content)) {
    ElMessage.warning('请输入评论内容')
    return
  }

  const payload = {
    title: newsForm.title,
    content: newsForm.content,
    coverImage: newsForm.coverImage,
    backgroundImage: newsForm.backgroundImage,
    score: newsForm.score,
    studio: newsForm.studio,
    genres: newsForm.genres,
    releaseDate: newsForm.releaseDate || null,
  }
  newsSubmitting.value = true
  try {
    if (editingNewsId.value) {
      await animeApi.update(editingNewsId.value, payload)
      ElMessage.success('动漫更新成功')
    } else {
      await animeApi.create(payload)
      ElMessage.success('动漫发布成功')
    }
    clearDraft()
    publishDialogVisible.value = false
    resetNewsForm()
    await loadAdminNews()
  } catch (e: any) {
    ElMessage.error(e?.message || '动漫提交失败')
  } finally {
    newsSubmitting.value = false
  }
}

async function editNews(id: number) {
  try {
    const res = await animeApi.adminDetail(id)
    const detail = res.data
    newsForm.title = detail.title || ''
    newsForm.content = detail.content || ''
    newsForm.coverImage = detail.coverImage || ''
    newsForm.backgroundImage = detail.backgroundImage || ''
    newsForm.score = Number(detail.score ?? 8.0)
    newsForm.studio = detail.studio || ''
    newsForm.genres = detail.genre ? String(detail.genre).split(',').map((item: string) => item.trim()).filter((item: string) => item) : []
    newsForm.releaseDate = detail.releaseDate || ''
    editingNewsId.value = id
    activeMenu.value = 'news'
    publishDialogVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.message || '加载动漫详情失败')
  }
}

async function deleteNews(id: number) {
  try {
    await animeApi.remove(id)
    ElMessage.success('动漫删除成功')
    if (editingNewsId.value === id) {
      resetNewsForm()
    }
    await loadAdminNews()
  } catch (e: any) {
    ElMessage.error(e?.message || '动漫删除失败')
  }
}

async function submitInterview() {
  if (!interviewForm.title.trim()) {
    ElMessage.warning('请输入电影名称')
    return
  }
  if (!interviewForm.director.trim()) {
    ElMessage.warning('请输入导演')
    return
  }
  if (!interviewForm.actors.trim()) {
    ElMessage.warning('请输入主演')
    return
  }
  if (!interviewForm.region.trim()) {
    ElMessage.warning('请选择电影地区')
    return
  }
  if (!stripHtmlText(interviewForm.content)) {
    ElMessage.warning('请输入简介')
    return
  }

  const payload = {
    title: interviewForm.title,
    content: interviewForm.content,
    coverImage: interviewForm.coverImage,
    backgroundImage: interviewForm.backgroundImage,
    score: interviewForm.score,
    director: interviewForm.director,
    actors: interviewForm.actors,
    genres: interviewForm.genres,
    region: interviewForm.region,
    releaseDate: interviewForm.releaseDate || null,
  }
  interviewSubmitting.value = true
  try {
    if (editingInterviewId.value) {
      await movieApi.update(editingInterviewId.value, payload)
      ElMessage.success('电影更新成功')
    } else {
      await movieApi.create(payload)
      ElMessage.success('电影发布成功')
    }
    clearDraft()
    publishDialogVisible.value = false
    resetInterviewForm()
    await loadAdminInterviews()
  } catch (e: any) {
    ElMessage.error(e?.message || '电影提交失败')
  } finally {
    interviewSubmitting.value = false
  }
}

async function editInterview(id: number) {
  try {
    const res = await movieApi.adminDetail(id)
    const detail = res.data
    interviewForm.title = detail.title || ''
    interviewForm.content = detail.content || ''
    interviewForm.coverImage = detail.coverImage || ''
    interviewForm.backgroundImage = detail.backgroundImage || ''
    interviewForm.score = Number(detail.score ?? 8.0)
    interviewForm.director = detail.director || ''
    interviewForm.actors = detail.actors || ''
    interviewForm.genres = detail.genre ? String(detail.genre).split(',').map((item: string) => item.trim()).filter((item: string) => item) : []
    interviewForm.region = detail.region || ''
    interviewForm.releaseDate = detail.releaseDate || ''
    editingInterviewId.value = id
    activeMenu.value = 'interview'
    publishDialogVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.message || '加载电影详情失败')
  }
}

async function deleteInterview(id: number) {
  try {
    await movieApi.remove(id)
    ElMessage.success('电影删除成功')
    if (editingInterviewId.value === id) {
      resetInterviewForm()
    }
    await loadAdminInterviews()
  } catch (e: any) {
    ElMessage.error(e?.message || '电影删除失败')
  }
}

function handleMenuSelect(key: string) {
  activeMenu.value = key as AdminMenu
  if (key === 'news' && newsRows.value.length === 0) {
    void loadAdminNews()
  } else if (key === 'interview' && interviewRows.value.length === 0) {
    void loadAdminInterviews()
  }
}

onMounted(() => {
  if (!authStore.isAdminLike) return
  void loadAdminReviews()
})
</script>

<template>
  <section class="admin-page">
    <StarfieldBackground />
    <header class="admin-header">
      <button class="back-home" @click="router.push('/')">←</button>
      <h1>后台管理</h1>
      <el-button type="primary" @click="openPublishDialog">发布</el-button>
    </header>

    <section class="admin-body">
      <aside class="admin-side">
        <nav class="admin-nav">
          <button
            v-for="item in menuItems"
            :key="item.key"
            :class="{ active: activeMenu === item.key }"
            @click="handleMenuSelect(item.key)"
          >
            {{ item.label }}
          </button>
        </nav>
      </aside>

      <main class="admin-main">
        <template v-if="activeMenu === 'review'">
          <section class="filter-bar">
            <div class="filter-group">
              <span class="filter-label">SEARCH:</span>
              <el-input v-model="reviewQuery.keyword" placeholder="关键词搜索" clearable @keyup.enter="onReviewSearch" />
            </div>
            <div class="filter-group">
              <span class="filter-label">GENRE:</span>
              <el-select v-model="reviewQuery.genre" clearable placeholder="ALL">
                <el-option v-for="item in allReviewGenres" :key="(item as any).value" :label="(item as any).label" :value="(item as any).value" />
              </el-select>
            </div>
            <div class="filter-actions">
              <button class="wax-btn" @click="onReviewSearch">搜索</button>
              <button class="wax-btn secondary" @click="resetReviewSearch">重置</button>
            </div>
          </section>

          <div class="list-section" v-loading="reviewListLoading">
            <div class="list-rows" v-if="reviewRows.length > 0">
              <div v-for="row in reviewRows" :key="row.id" class="data-card">
                <div class="card-cover-wrap">
                  <img class="card-cover" :src="resolveCoverUrl(row.coverImage)" alt="cover" loading="lazy" decoding="async"/>
                </div>
                <div class="card-info">
                  <p><span class="info-label">专辑</span><span class="info-value">{{ row.albumTitle || '-' }}</span></p>
                  <p><span class="info-label">艺人</span><span class="info-value">{{ row.artist || '-' }}</span></p>
                  <p><span class="info-label">风格</span><span class="info-value">{{ row.genre || '-' }}</span></p>
                  <p><span class="info-label">评分</span><span class="info-value">{{ row.score }}</span></p>
                </div>
                <div class="card-actions">
                  <el-button size="small" @click="editReview(row.id)">修改</el-button>
                  <el-popconfirm title="确认删除该乐评吗？" @confirm="deleteReview(row.id)">
                    <template #reference>
                      <el-button size="small" class="btn-danger">删除</el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>
            </div>
            <el-empty v-if="!reviewListLoading && reviewRows.length === 0" description="暂无乐评数据" />
          </div>
        </template>

        <template v-else-if="activeMenu === 'news'">
          <section class="filter-bar">
            <div class="filter-group">
              <span class="filter-label">SEARCH:</span>
              <el-input v-model="newsQuery.keyword" placeholder="关键词搜索" clearable @keyup.enter="onNewsSearch" />
            </div>
            <div class="filter-actions">
              <button class="wax-btn" @click="onNewsSearch">搜索</button>
              <button class="wax-btn secondary" @click="resetNewsSearch">重置</button>
            </div>
          </section>

          <div class="list-section" v-loading="newsListLoading">
            <div class="list-rows" v-if="newsRows.length > 0">
              <div v-for="row in newsRows" :key="row.id" class="data-card">
                <div class="card-cover-wrap" v-if="row.coverImage">
                  <img class="card-cover" :src="resolveCoverUrl(row.coverImage)" alt="cover" loading="lazy" decoding="async"/>
                </div>
                <div class="card-info" :class="{ 'no-cover': !row.coverImage }">
                  <p><span class="info-label">名称</span><span class="info-value">{{ row.title }}</span></p>
                  <p><span class="info-label">制片商</span><span class="info-value">{{ row.studio || '-' }}</span></p>
                  <p><span class="info-label">风格</span><span class="info-value">{{ row.genre || '-' }}</span></p>
                  <p><span class="info-label">评分</span><span class="info-value">{{ Number(row.score || 0).toFixed(1) }}</span></p>
                  <p><span class="info-label">发行</span><span class="info-value">{{ row.releaseDate || '-' }}</span></p>
                </div>
                <div class="card-actions">
                  <el-button size="small" @click="editNews(row.id)">修改</el-button>
                  <el-popconfirm title="确认删除该动漫吗？" @confirm="deleteNews(row.id)">
                    <template #reference>
                      <el-button size="small" class="btn-danger">删除</el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>
            </div>
            <el-empty v-if="!newsListLoading && newsRows.length === 0" description="暂无动漫数据" />
          </div>
        </template>

        <template v-else-if="activeMenu === 'interview'">
          <section class="filter-bar">
            <div class="filter-group">
              <span class="filter-label">SEARCH:</span>
              <el-input v-model="interviewQuery.keyword" placeholder="关键词搜索" clearable @keyup.enter="onInterviewSearch" />
            </div>
            <div class="filter-actions">
              <button class="wax-btn" @click="onInterviewSearch">搜索</button>
              <button class="wax-btn secondary" @click="resetInterviewSearch">重置</button>
            </div>
          </section>

          <div class="list-section" v-loading="interviewListLoading">
            <div class="list-rows" v-if="interviewRows.length > 0">
              <div v-for="row in interviewRows" :key="row.id" class="data-card">
                <div class="card-cover-wrap" v-if="row.coverImage">
                  <img class="card-cover" :src="resolveCoverUrl(row.coverImage)" alt="cover" loading="lazy" decoding="async"/>
                </div>
                <div class="card-info" :class="{ 'no-cover': !row.coverImage }">
                  <p><span class="info-label">名称</span><span class="info-value">{{ row.title || '-' }}</span></p>
                  <p><span class="info-label">导演</span><span class="info-value">{{ row.director || '-' }}</span></p>
                  <p><span class="info-label">主演</span><span class="info-value">{{ row.actors || '-' }}</span></p>
                  <p><span class="info-label">风格</span><span class="info-value">{{ row.genre || '-' }}</span></p>
                  <p><span class="info-label">地区</span><span class="info-value">{{ row.region || '-' }}</span></p>
                  <p><span class="info-label">评分</span><span class="info-value">{{ Number(row.score || 0).toFixed(1) }}</span></p>
                  <p><span class="info-label">上映</span><span class="info-value">{{ row.releaseDate || '-' }}</span></p>
                </div>
                <div class="card-actions">
                  <el-button size="small" @click="editInterview(row.id)">修改</el-button>
                  <el-popconfirm title="确认删除该电影吗？" @confirm="deleteInterview(row.id)">
                    <template #reference>
                      <el-button size="small" class="btn-danger">删除</el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>
            </div>
            <el-empty v-if="!interviewListLoading && interviewRows.length === 0" description="暂无电影数据" />
          </div>
        </template>
      </main>
    </section>

    <el-dialog
      v-model="publishDialogVisible"
      class="admin-publish-dialog"
      modal-class="admin-dialog-overlay"
      :title="activeMenu === 'review' ? (editingReviewId ? '编辑乐评' : '发布乐评') : activeMenu === 'news' ? (editingNewsId ? '编辑动漫' : '发布动漫') : (editingInterviewId ? '编辑电影' : '发布电影')"
      width="760px"
      @close="onDialogClose"
    >
      <el-form v-if="activeMenu === 'review'" label-position="top">
        <el-form-item label="专辑名称"><el-input v-model="reviewForm.albumTitle" /></el-form-item>
        <el-form-item label="艺人"><el-input v-model="reviewForm.artist" /></el-form-item>
        <el-form-item label="AI 辅助">
          <div class="ai-generate-row">
            <el-button type="success" plain :loading="aiGenerating" @click="onAiGenerateReview">AI 生成</el-button>
            <span class="ai-generate-hint">请先手动填写年份；AI 将基于专辑名称、艺人和你填写的年份生成曲目、封面与乐评正文（曲目优先来自 Last.fm）</span>
          </div>
        </el-form-item>
        <el-form-item label="年份"><el-input v-model="reviewForm.year" placeholder="例如：2024" /></el-form-item>
        <el-form-item label="评分（0-10分）">
          <div class="score-input-row">
            <el-input-number v-model="reviewForm.score" :min="0" :max="10" :step="0.1" :precision="1" style="width: 200px" />
            <span class="score-preview">★ {{ Number(reviewForm.score || 0).toFixed(1) }}</span>
          </div>
        </el-form-item>
        <el-form-item label="专辑封面（支持 JPG/PNG）">
          <el-upload
            class="cover-uploader"
            :auto-upload="true"
            :show-file-list="false"
            accept=".jpg,.jpeg,.png"
            :before-upload="beforeCoverUpload"
            :http-request="uploadCover"
          >
            <div class="cover-upload-box">
              <img v-if="reviewForm.coverImage" :src="resolveCoverUrl(reviewForm.coverImage)" alt="cover" class="cover-preview" loading="lazy" decoding="async"/>
              <span v-else-if="!coverUploading">点击选择封面</span>
              <span v-else>上传中...</span>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="详情背景图（支持 JPG/PNG）">
          <el-upload
            class="cover-uploader"
            :auto-upload="true"
            :show-file-list="false"
            accept=".jpg,.jpeg,.png"
            :before-upload="beforeCoverUpload"
            :http-request="uploadReviewBackground"
          >
            <div class="cover-upload-box">
              <img v-if="reviewForm.backgroundImage" :src="resolveCoverUrl(reviewForm.backgroundImage)" alt="background" class="cover-preview" loading="lazy" decoding="async"/>
              <span v-else-if="!coverUploading">点击选择背景</span>
              <span v-else>上传中...</span>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="风格（可多选）">
          <div class="genre-cloud">
            <div class="genre-search">
              <el-input v-model="genreFilterKeyword" placeholder="搜索风格..." clearable />
            </div>
            <template v-for="cat in REVIEW_GENRE_CATEGORIES" :key="cat.label">
              <div
                v-if="cat.options.some(opt => !genreFilterKeyword || opt.label.toLowerCase().includes(genreFilterKeyword.toLowerCase()))"
                class="genre-category"
              >
                <h4 class="genre-cat-title">{{ cat.label }}</h4>
                <div class="genre-tags">
                  <button
                    v-for="item in cat.options"
                    :key="item.value"
                    type="button"
                    class="genre-tag"
                    :class="{ active: reviewForm.genres.includes(item.value) }"
                    :style="genreFilterKeyword && !item.label.toLowerCase().includes(genreFilterKeyword.toLowerCase()) ? 'display: none' : ''"
                    @click="toggleGenre(item.value)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </el-form-item>
        <el-form-item label="音乐曲目（用 / 分隔）">
          <el-input v-model="reviewForm.tracks" placeholder="例如：Track 1 / Track 2 / Track 3" />
        </el-form-item>
        <el-form-item label="描述">
          <RichEditor v-model="reviewForm.description" placeholder="支持图文混排，可插入图片和视频链接" />
        </el-form-item>
      </el-form>

      <el-form v-else-if="activeMenu === 'news'" label-position="top">
        <el-form-item label="动漫名称"><el-input v-model="newsForm.title" /></el-form-item>
        <el-form-item label="AI 辅助">
          <div class="ai-generate-row">
            <el-button type="success" plain :loading="aiGenerating" @click="onAiGenerateNews">AI 生成</el-button>
            <span class="ai-generate-hint">基于动漫名称自动生成分数、制片商、风格、发行日期、封面与评论内容</span>
          </div>
        </el-form-item>
        <el-form-item label="封面（选填，支持 JPG/PNG）">
          <el-upload
            class="cover-uploader"
            :auto-upload="true"
            :show-file-list="false"
            accept=".jpg,.jpeg,.png"
            :before-upload="beforeCoverUpload"
            :http-request="uploadCover"
          >
            <div class="cover-upload-box">
              <img v-if="newsForm.coverImage" :src="resolveCoverUrl(newsForm.coverImage)" alt="cover" class="cover-preview" loading="lazy" decoding="async"/>
              <span v-else-if="!coverUploading">点击选择封面</span>
              <span v-else>上传中...</span>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="背景图（类似朋友圈封面，支持 JPG/PNG）">
          <el-upload
            class="cover-uploader"
            :auto-upload="true"
            :show-file-list="false"
            accept=".jpg,.jpeg,.png"
            :before-upload="beforeCoverUpload"
            :http-request="uploadNewsBackground"
          >
            <div class="cover-upload-box">
              <img v-if="newsForm.backgroundImage" :src="resolveCoverUrl(newsForm.backgroundImage)" alt="background" class="cover-preview" loading="lazy" decoding="async"/>
              <span v-else-if="!coverUploading">点击选择背景</span>
              <span v-else>上传中...</span>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="评分（0-10分）">
          <el-input-number v-model="newsForm.score" :min="0" :max="10" :step="0.1" :precision="1" style="width: 200px" />
        </el-form-item>
        <el-form-item label="制片商"><el-input v-model="newsForm.studio" /></el-form-item>
        <el-form-item label="动漫风格（可多选）">
          <el-checkbox-group v-model="newsForm.genres" class="genre-checkbox-group">
            <el-checkbox v-for="item in ANIME_GENRE_OPTIONS" :key="item" :label="item">
              {{ item }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="发行年月">
          <el-date-picker v-model="newsForm.releaseDate" type="month" value-format="YYYY-MM-01" placeholder="请选择发行年月" style="width: 100%" />
        </el-form-item>
        <el-form-item label="评论内容">
          <RichEditor v-model="newsForm.content" placeholder="支持图文混排，可插入图片和视频链接" />
        </el-form-item>
      </el-form>

      <el-form v-else label-position="top">
        <el-form-item label="电影名称"><el-input v-model="interviewForm.title" /></el-form-item>
        <el-form-item label="AI 辅助">
          <div class="ai-generate-row">
            <el-button type="success" plain :loading="aiGenerating" @click="onAiGenerateInterview">AI 生成</el-button>
            <span class="ai-generate-hint">基于电影名称自动生成分数、导演、主演、地区、风格、上映日期、封面、背景图与简介内容</span>
          </div>
        </el-form-item>
        <el-form-item label="封面（选填，支持 JPG/PNG）">
          <el-upload
            class="cover-uploader"
            :auto-upload="true"
            :show-file-list="false"
            accept=".jpg,.jpeg,.png"
            :before-upload="beforeCoverUpload"
            :http-request="uploadCover"
          >
            <div class="cover-upload-box">
              <img v-if="interviewForm.coverImage" :src="resolveCoverUrl(interviewForm.coverImage)" alt="cover" class="cover-preview" loading="lazy" decoding="async"/>
              <span v-else-if="!coverUploading">点击选择封面</span>
              <span v-else>上传中...</span>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="详情背景图（支持 JPG/PNG）">
          <el-upload
            class="cover-uploader"
            :auto-upload="true"
            :show-file-list="false"
            accept=".jpg,.jpeg,.png"
            :before-upload="beforeCoverUpload"
            :http-request="uploadInterviewBackground"
          >
            <div class="cover-upload-box">
              <img v-if="interviewForm.backgroundImage" :src="resolveCoverUrl(interviewForm.backgroundImage)" alt="background" class="cover-preview" loading="lazy" decoding="async"/>
              <span v-else-if="!coverUploading">点击选择背景</span>
              <span v-else>上传中...</span>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="评分（0-10分）">
          <el-input-number v-model="interviewForm.score" :min="0" :max="10" :step="0.1" :precision="1" style="width: 200px" />
        </el-form-item>
        <el-form-item label="导演"><el-input v-model="interviewForm.director" /></el-form-item>
        <el-form-item label="主演"><el-input v-model="interviewForm.actors" placeholder="可填写多个主演，逗号分隔" /></el-form-item>
        <el-form-item label="电影地区">
          <el-select v-model="interviewForm.region" placeholder="请选择电影地区" style="width: 100%">
            <el-option v-for="item in MOVIE_REGION_OPTIONS" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="电影风格（可多选）">
          <el-checkbox-group v-model="interviewForm.genres" class="genre-checkbox-group">
            <el-checkbox v-for="item in MOVIE_GENRE_OPTIONS" :key="item" :label="item">
              {{ item }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="上映日期">
          <el-date-picker v-model="interviewForm.releaseDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择上映日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="简介">
          <RichEditor v-model="interviewForm.content" placeholder="支持图文混排，可插入图片和视频链接" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="publishDialogVisible = false">取消</el-button>
          <el-button v-if="!isEditing()" type="warning" @click="saveDraft">保存草稿</el-button>
          <el-button v-if="activeMenu === 'review'" type="primary" :loading="reviewSubmitting" @click="submitReview">
            {{ editingReviewId ? '保存修改' : '发布' }}
          </el-button>
          <el-button v-else-if="activeMenu === 'news'" type="primary" :loading="newsSubmitting" @click="submitNews">
            {{ editingNewsId ? '保存修改' : '发布' }}
          </el-button>
          <el-button v-else type="primary" :loading="interviewSubmitting" @click="submitInterview">
            {{ editingInterviewId ? '保存修改' : '发布' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.admin-page {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: #000;
  color: #e0e0e0;
  padding: 40px;
  font-family: 'Inter', -apple-system, sans-serif;
}

/* ── Header ── */
.admin-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  padding: 14px 18px;
  margin-bottom: 32px;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 8px;
  background: rgba(10,10,12,0.46);
  box-shadow: 0 18px 50px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.06);
  backdrop-filter: blur(20px) saturate(1.12);
}
.admin-header h1 {
  flex: 1;
  text-align: center;
  margin: 0;
  font-family: 'Cinzel', 'Playfair Display', serif;
  font-size: 2rem;
  font-weight: 400;
  letter-spacing: 0;
  color: #ffffff;
}
.back-home {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.6);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  line-height: 1;
}
.back-home:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

/* ── Layout ── */
.admin-body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 28px;
}

/* ── Sidebar ── */
.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(10,10,12,0.42);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 18px 48px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter: blur(18px) saturate(1.1);
}
.admin-nav button {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.45);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  letter-spacing: 0.5px;
  text-align: left;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.admin-nav button:hover {
  background: rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.8);
}
.admin-nav button.active {
  background: rgba(255,255,255,0.14);
  color: #ffffff;
}

/* ── Main ── */
.admin-main {
  display: grid;
  gap: 20px;
  min-width: 0;
}

/* ── Filter Bar ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 16px 18px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  background: rgba(10,10,12,0.42);
  box-shadow: 0 16px 44px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter: blur(18px) saturate(1.08);
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-label {
  font-size: 0.7rem;
  color: #fff;
  letter-spacing: 2px;
  font-weight: 500;
}
.filter-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

/* wax-btn (matches frontend list pages) */
.wax-btn {
  background: rgba(255,255,255,0.86);
  color: #080808;
  border: 1px solid rgba(255,255,255,0.72);
  padding: 7px 18px;
  font-family: 'Inter', sans-serif;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 1px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}
.wax-btn:hover {
  background: #fff;
}
.wax-btn.secondary {
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.64);
  border: 1px solid rgba(255,255,255,0.18);
}
.wax-btn.secondary:hover {
  border-color: rgba(255,255,255,0.42);
  color: #fff;
}

/* ── List Section ── */
.list-section {
  min-height: 200px;
}
.list-rows {
  display: grid;
  gap: 12px;
}

/* ── Data Card ── */
.data-card {
  display: grid;
  grid-template-columns: 84px 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 14px 18px;
  background: rgba(12,12,14,0.48);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  box-shadow: 0 14px 38px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04);
  backdrop-filter: blur(16px) saturate(1.08);
  transition: all 0.25s ease;
}
.data-card:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
  transform: translateY(-1px);
}

.card-cover-wrap {
  width: 84px;
  height: 84px;
  border-radius: 6px;
  overflow: hidden;
  background: #111;
  border: 1px solid rgba(255,255,255,0.06);
}
.card-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.data-card:hover .card-cover {
  transform: scale(1.08);
}

.admin-page :deep(.el-input__wrapper),
.admin-page :deep(.el-select__wrapper),
.admin-page :deep(.el-textarea__inner) {
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  background: rgba(10,10,12,0.46);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  color: #fff;
  backdrop-filter: blur(14px);
}

.admin-page :deep(.el-input__wrapper:hover),
.admin-page :deep(.el-select__wrapper:hover),
.admin-page :deep(.el-input__wrapper.is-focus),
.admin-page :deep(.el-select__wrapper.is-focused) {
  border-color: rgba(255,255,255,0.32);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}

.admin-page :deep(.el-input__inner),
.admin-page :deep(.el-select__selected-item),
.admin-page :deep(.el-textarea__inner) {
  color: rgba(255,255,255,0.88);
}

.admin-page :deep(.el-button) {
  border-color: rgba(255,255,255,0.16);
  border-radius: 6px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.8);
  backdrop-filter: blur(12px);
}

.admin-page :deep(.el-button:hover),
.admin-page :deep(.el-button:focus-visible) {
  border-color: rgba(255,255,255,0.34);
  background: rgba(255,255,255,0.12);
  color: #fff;
}

.admin-page :deep(.el-button--primary) {
  border-color: rgba(255,255,255,0.76);
  background: rgba(255,255,255,0.88);
  color: #080808;
}

.admin-page :deep(.el-button--primary:hover) {
  background: #fff;
  color: #000;
}

.admin-page :deep(.el-loading-mask) {
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
}

.card-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 24px;
}
.card-info.no-cover {
  grid-column: 1 / span 2;
}
.card-info p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.info-label {
  color: rgba(255,255,255,0.35);
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  min-width: 40px;
}
.info-value {
  color: #e0e0e0;
  font-size: 0.85rem;
}

.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-danger {
  background: rgba(220,60,60,0.12) !important;
  border-color: rgba(220,60,60,0.3) !important;
  color: #e06060 !important;
}
.btn-danger:hover {
  background: rgba(220,60,60,0.22) !important;
  border-color: rgba(220,60,60,0.5) !important;
}

/* ── Score Input ── */
.score-input-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.score-preview {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  font-family: 'Inter', sans-serif;
}

/* ── Upload ── */
.cover-uploader { width: 100%; }
.cover-upload-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 240px;
  height: 130px;
  border: 1px dashed rgba(255,255,255,0.12);
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  overflow: hidden;
}
.cover-preview { width: 100%; height: 100%; object-fit: cover; }

/* ── AI Row ── */
.ai-generate-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.ai-generate-hint {
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  line-height: 1.5;
  flex: 1;
  min-width: 200px;
}

/* ── Genre Cloud ── */
.genre-cloud {
  display: grid;
  gap: 4px;
}
.genre-search {
  margin-bottom: 8px;
}
.genre-search :deep(.el-input__wrapper) {
  background: rgba(12,12,14,0.44);
  box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset;
  border-radius: 8px;
}
.genre-search :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px rgba(255,255,255,0.25) inset;
}
.genre-category {
  margin-top: 10px;
}
.genre-cat-title {
  margin: 0 0 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.35);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 500;
}
.genre-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.genre-tag {
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.55);
  padding: 5px 14px;
  border-radius: 20px;
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.4;
}
.genre-tag:hover {
  border-color: rgba(255,255,255,0.4);
  color: rgba(255,255,255,0.85);
}
.genre-tag.active {
  background: #ffffff;
  border-color: #ffffff;
  color: #000000;
  font-weight: 500;
}

/* ── Dialog Footer ── */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:global(.admin-dialog-overlay) {
  background: rgba(0,0,0,0.48);
  backdrop-filter: blur(8px);
}

:global(.admin-publish-dialog.el-dialog) {
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 8px;
  background: rgba(12,12,15,0.72);
  box-shadow: 0 28px 90px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08);
  backdrop-filter: blur(28px) saturate(1.15);
}

:global(.admin-publish-dialog .el-dialog__title),
:global(.admin-publish-dialog .el-form-item__label) {
  color: rgba(255,255,255,0.86);
}

:global(.admin-publish-dialog .el-input__wrapper),
:global(.admin-publish-dialog .el-select__wrapper),
:global(.admin-publish-dialog .el-textarea__inner) {
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  background: rgba(0,0,0,0.3);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  color: #fff;
}

:global(.admin-publish-dialog .el-input__inner),
:global(.admin-publish-dialog .el-select__selected-item),
:global(.admin-publish-dialog .el-textarea__inner) {
  color: rgba(255,255,255,0.9);
}

:global(.admin-publish-dialog .el-button) {
  border-color: rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.84);
}

:global(.admin-publish-dialog .el-button--primary) {
  border-color: rgba(255,255,255,0.78);
  background: rgba(255,255,255,0.9);
  color: #080808;
}

/* ── Responsive ── */
@media (max-width: 1100px) {
  .admin-body { grid-template-columns: 1fr; }
  .admin-header h1 { font-size: 1.6rem; }
  .admin-header { flex-wrap: wrap; gap: 10px; }
  .filter-bar { gap: 14px; }
  .filter-actions { width: 100%; margin-left: 0; }
  .data-card { grid-template-columns: 64px 1fr auto; gap: 14px; padding: 12px; }
  .card-cover-wrap { width: 64px; height: 64px; }
  .card-info { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .admin-page { padding: 24px 20px; }
  .data-card {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .card-cover-wrap { width: 100%; height: 160px; }
  .card-info.no-cover { grid-column: auto; }
  .card-actions { justify-content: flex-start; }
}
</style>
