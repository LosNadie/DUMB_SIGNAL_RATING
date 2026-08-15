<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { commentApi } from '../../api'
import type { CommentItem } from '../../types/models'
import { useAuthStore } from '../../stores/auth'

function formatBeijingTime(timeStr: string): string {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return timeStr
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const y = beijingTime.getUTCFullYear()
  const m = String(beijingTime.getUTCMonth() + 1).padStart(2, '0')
  const d = String(beijingTime.getUTCDate()).padStart(2, '0')
  const h = String(beijingTime.getUTCHours()).padStart(2, '0')
  const min = String(beijingTime.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

const props = defineProps<{
  contentType: string
  contentId: number
}>()

const authStore = useAuthStore()
const comments = ref<CommentItem[]>([])
const content = ref('')
const submitting = ref(false)
const loading = ref(true)

async function loadComments() {
  if (!props.contentId) return
  loading.value = true
  try {
    const res = await commentApi.list(props.contentType, props.contentId)
    comments.value = res.data
  } catch (e: any) {
    ElMessage.error(e?.message || '加载评论失败')
  } finally {
    loading.value = false
  }
}

async function submitComment() {
  if (!content.value.trim()) {
    ElMessage.warning('评论内容不能为空')
    return
  }
  submitting.value = true
  try {
    await commentApi.create({
      contentType: props.contentType,
      contentId: props.contentId,
      content: content.value.trim(),
    })
    ElMessage.success('评论发布成功')
    content.value = ''
    await loadComments()
  } catch (e: any) {
    ElMessage.error(e?.message || '发布评论失败')
  } finally {
    submitting.value = false
  }
}

async function deleteComment(commentId: number) {
  try {
    await commentApi.remove(commentId)
    ElMessage.success('评论删除成功')
    await loadComments()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除评论失败')
  }
}

onMounted(() => {
  void loadComments()
})

watch(() => props.contentId, () => {
  void loadComments()
})
</script>

<template>
  <section class="comment-section">
    <div class="section-header">
      <h3>评论</h3>
      <span class="comment-count" v-if="comments.length > 0">{{ comments.length }} 条</span>
    </div>

    <!-- 评论输入区 -->
    <div class="comment-input-area" v-if="authStore.isLoggedIn">
      <div class="input-avatar">
        {{ authStore.userInfo?.username?.charAt(0).toUpperCase() || 'U' }}
      </div>
      <div class="input-body">
        <el-input
          v-model="content"
          type="textarea"
          :rows="3"
          placeholder="写下你的观点..."
          resize="none"
          maxlength="500"
          show-word-limit
        />
        <div class="input-actions">
          <el-button
            type="primary"
            :loading="submitting"
            @click="submitComment"
            class="submit-btn"
          >
            发布评论
          </el-button>
        </div>
      </div>
    </div>

    <div class="guest-tip" v-else>
      <span class="tip-icon">💬</span>
      <span>登录后可参与评论</span>
    </div>

    <!-- 评论列表 -->
    <div
      class="comment-list-wrapper"
      :class="{ 'comments-ready': !loading }"
      v-loading="loading"
    >
      <div v-if="comments.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <p class="empty-text">还没有评论，来抢沙发吧</p>
      </div>

      <div v-else class="comment-list">
        <div
          v-for="item in comments"
          :key="item.id"
          class="comment-card"
        >
          <div class="comment-avatar">
            {{ (item.username || 'U').charAt(0).toUpperCase() }}
          </div>

          <div class="comment-main">
            <div class="comment-head">
              <span class="comment-user">{{ item.username || `用户${item.userId}` }}</span>
              <span class="comment-time">{{ formatBeijingTime(item.createTime) }}</span>
            </div>

            <p class="comment-text">{{ item.content }}</p>

            <div class="comment-foot">
              <el-button
                v-if="authStore.isLoggedIn"
                type="danger"
                link
                size="small"
                class="delete-btn"
                @click="deleteComment(item.id)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.comment-section {
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.section-header h3 {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: #fff;
}

.comment-count {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'Inter', sans-serif;
}

/* ═══ 输入区 ═══ */
.comment-input-area {
  display: flex;
  gap: 14px;
  margin-bottom: 32px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
}

.input-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #333 0%, #555 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  font-family: 'Inter', sans-serif;
}

.input-body {
  flex: 1;
}

.input-body :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #e0e0e0;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  padding: 12px 14px;
  box-shadow: none !important;
}

.input-body :deep(.el-textarea__inner::placeholder) {
  color: rgba(255, 255, 255, 0.25);
}

.input-body :deep(.el-textarea__inner:focus) {
  border-color: rgba(255, 255, 255, 0.2);
}

.input-body :deep(.el-input__count) {
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.75rem;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.submit-btn {
  background: #fff !important;
  border-color: #fff !important;
  color: #000 !important;
  font-weight: 500;
  border-radius: 8px;
  padding: 8px 22px;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
}

.submit-btn:hover {
  background: #ccc !important;
  border-color: #ccc !important;
}

/* ═══ 游客提示 ═══ */
.guest-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
}

.tip-icon {
  font-size: 1.1rem;
}

/* ═══ 评论列表 ═══ */
.comment-list-wrapper {
  min-height: 120px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 280ms ease, transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.comment-list-wrapper.comments-ready {
  opacity: 1;
  transform: translateY(0);
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-card {
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.comment-card:hover {
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(255, 255, 255, 0.08);
}

.comment-avatar {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a2a2a 0%, #444 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Inter', sans-serif;
}

.comment-main {
  flex: 1;
  min-width: 0;
}

.comment-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.comment-user {
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  font-family: 'Inter', sans-serif;
}

.comment-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'Inter', sans-serif;
}

.comment-text {
  margin: 0 0 10px;
  font-size: 0.9rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Inter', sans-serif;
  word-break: break-word;
}

.comment-foot {
  display: flex;
  justify-content: flex-end;
}

.delete-btn {
  color: rgba(220, 60, 60, 0.7) !important;
  font-size: 0.78rem;
}

.delete-btn:hover {
  color: #e06060 !important;
}

/* ═══ Element Plus dark overrides ═══ */
.comment-section :deep(.el-empty__description) {
  color: rgba(255, 255, 255, 0.25);
}

/* ═══ 空状态 ═══ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 12px;
}

.empty-icon {
  font-size: 2.4rem;
  opacity: 0.6;
  filter: grayscale(0.3);
}

.empty-text {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.35);
  font-family: 'Inter', sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  .comment-list-wrapper {
    transform: none;
    transition: none;
  }
}
</style>
