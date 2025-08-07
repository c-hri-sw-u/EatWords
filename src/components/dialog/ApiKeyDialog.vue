<script setup lang="ts">
import { $ref } from "vue/macros"
import { ElMessage } from "element-plus"
import Dialog from "@/components/dialog/Dialog.vue"
import { setDeepSeekApiKey, getStoredApiKey, validateApiKey, clearApiKey } from "@/utils/sentenceGenerator"

interface Props {
  show: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  close: []
}>()

let apiKey = $ref('')
let validating = $ref(false)
let showPassword = $ref(false)

// 初始化时加载已保存的API Key
apiKey = getStoredApiKey()

function close() {
  emit('update:show', false)
  emit('close')
}

async function save() {
  if (!apiKey.trim()) {
    ElMessage.warning('请输入API Key')
    return
  }

  validating = true
  try {
    const isValid = await validateApiKey(apiKey.trim())
    if (isValid) {
      setDeepSeekApiKey(apiKey.trim())
      ElMessage.success('API Key 保存成功')
      close()
    } else {
      ElMessage.error('API Key 无效，请检查后重试')
    }
  } catch (error) {
    ElMessage.error('验证API Key失败，请检查网络连接')
  } finally {
    validating = false
  }
}

function clear() {
  clearApiKey()
  apiKey = ''
  ElMessage.success('API Key 已清除')
}

function togglePasswordVisibility() {
  showPassword = !showPassword
}

</script>

<template>
  <Dialog
    :show="show"
    title="DeepSeek API配置"
    @close="close"
    width="500px"
  >
    <div class="api-key-dialog">
      <div class="description">
        <p>配置 DeepSeek API Key 以启用自动例句生成功能。</p>
        <p>您可以：</p>
        <ul>
          <li>设置环境变量 <code>VITE_DEEPSEEK_API_KEY</code></li>
          <li>或在此处手动配置API Key</li>
        </ul>
        <p>
          获取API Key: 
          <a href="https://platform.deepseek.com/" target="_blank" rel="noopener">
            https://platform.deepseek.com/
          </a>
        </p>
      </div>

      <div class="input-group">
        <label>DeepSeek API Key:</label>
        <div class="input-wrapper">
          <el-input
            v-model="apiKey"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入您的DeepSeek API Key"
            clearable
            show-password
            @keyup.enter="save"
          />
        </div>
      </div>

      <div class="actions">
        <el-button @click="clear" type="danger" plain size="small">
          清除
        </el-button>
        <div class="right">
          <el-button @click="close" size="small">
            取消
          </el-button>
          <el-button 
            @click="save" 
            type="primary" 
            size="small"
            :loading="validating"
          >
            {{ validating ? '验证中...' : '保存' }}
          </el-button>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped lang="scss">
.api-key-dialog {
  padding: 20px;

  .description {
    margin-bottom: 20px;
    color: var(--color-font-2);
    font-size: 14px;
    line-height: 1.6;

    p {
      margin: 0 0 10px 0;
    }

    ul {
      margin: 10px 0;
      padding-left: 20px;
    }

    li {
      margin: 5px 0;
    }

    code {
      background: var(--color-bg-2);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }

    a {
      color: var(--el-color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .input-group {
    margin-bottom: 20px;

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--color-font-1);
    }

    .input-wrapper {
      width: 100%;
    }
  }

  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .right {
      display: flex;
      gap: 10px;
    }
  }
}
</style> 