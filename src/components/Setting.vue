<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref, watch } from "vue";
import { useSettingStore } from "@/stores/setting.ts";
import { getAudioFileUrl, useChangeAllSound, usePlayAudio, useWatchAllSound } from "@/hooks/sound.ts";
import { getShortcutKey, useDisableEventListener, useEventListener } from "@/hooks/event.ts";
import { $computed, $ref } from "vue/macros";
import { cloneDeep } from "lodash-es";
import { DefaultShortcutKeyMap, Dict, DictType, ShortcutKey } from "@/types.ts";
import BaseButton from "@/components/BaseButton.vue";
import { APP_NAME, EXPORT_DATA_KEY, SAVE_DICT_KEY, SAVE_SETTING_KEY, SoundFileOptions } from "@/utils/const.ts";
import VolumeIcon from "@/components/icon/VolumeIcon.vue";
import { BaseState, useBaseStore } from "@/stores/base.ts";
import * as copy from "copy-to-clipboard";
import { saveAs } from "file-saver";
import { checkAndUpgradeSaveDict, checkAndUpgradeSaveSetting, shakeCommonDict } from "@/utils";
import { dayjs } from "element-plus";
import { 
  getStoredApiKey, setDeepSeekApiKey, clearApiKey, validateApiKey,
  getStoredHfToken, setHuggingFaceToken, clearHfToken, validateQwenToken 
} from "@/utils/sentenceGenerator";


const emit = defineEmits<{
  toggleDisabledDialogEscKey: [val: boolean]
}>()

const tabIndex = $ref(0)
const settingStore = useSettingStore()
const store = useBaseStore()
//@ts-ignore
const gitLastCommitHash = ref(LATEST_COMMIT_HASH);

useDisableEventListener(() => undefined)
useWatchAllSound()

let editShortcutKey = $ref('')

// API配置相关状态
let apiKey = $ref('')
let apiKeyValidating = $ref(false)
let apiKeyStatus = $ref('') // 'valid', 'invalid', ''

// HuggingFace Token 相关
let hfToken = $ref('')
let hfTokenValidating = $ref(false)
let hfTokenStatus = $ref('') // 'valid', 'invalid', ''

// 初始化API Key和Token
apiKey = getStoredApiKey()
hfToken = getStoredHfToken()

// 调试信息
console.log('Setting组件初始化:', {
  aiModel: settingStore.aiModel,
  enableSentencePractice: settingStore.enableSentencePractice
})

// 如果aiModel值异常，重置为默认值
if (!settingStore.aiModel || (settingStore.aiModel !== 'deepseek' && settingStore.aiModel !== 'qwen')) {
  console.log('重置aiModel为默认值')
  settingStore.aiModel = 'deepseek'
}

const disabledDefaultKeyboardEvent = $computed(() => {
  return editShortcutKey && tabIndex === 2
})

watch(() => disabledDefaultKeyboardEvent, v => {
  emit('toggleDisabledDialogEscKey', !!v)
})

useEventListener('keydown', (e: KeyboardEvent) => {
  if (!disabledDefaultKeyboardEvent) return
  e.preventDefault()

  let shortcutKey = getShortcutKey(e)
  // console.log('e', e, e.keyCode, e.ctrlKey, e.altKey, e.shiftKey)
  // console.log('key', shortcutKey)

  // if (shortcutKey[shortcutKey.length-1] === '+') {
  //   settingStore.shortcutKeyMap[editShortcutKey] = DefaultShortcutKeyMap[editShortcutKey]
  //   return ElMessage.warning('设备失败！')
  // }

  if (editShortcutKey) {
    if (shortcutKey === 'Delete') {
      settingStore.shortcutKeyMap[editShortcutKey] = ''
    } else {
      for (const [k, v] of Object.entries(settingStore.shortcutKeyMap)) {
        if (v === shortcutKey && k !== editShortcutKey) {
          settingStore.shortcutKeyMap[editShortcutKey] = DefaultShortcutKeyMap[editShortcutKey]
          return ElMessage.warning('快捷键重复！')
        }
      }
      settingStore.shortcutKeyMap[editShortcutKey] = shortcutKey
    }
  }
})

function resetShortcutKeyMap() {
  editShortcutKey = ''
  settingStore.shortcutKeyMap = cloneDeep(DefaultShortcutKeyMap)
  ElMessage.success('恢复成功')
}

function exportData() {
  let data = {
    version: EXPORT_DATA_KEY.version,
    val: {
      setting: {
        version: SAVE_SETTING_KEY.version,
        val: settingStore.$state
      },
      dict: {
        version: SAVE_DICT_KEY.version,
        val: shakeCommonDict(store.$state)
      }
    }
  }
  let blob = new Blob([JSON.stringify(data)], {type: "text/plain;charset=utf-8"});
  let date = new Date()
  let dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`
  saveAs(blob, `${APP_NAME}-User-Data-${dateStr}.json`);
  ElMessage.success('导出成功！')
}

function importData(e) {
  let file = e.target.files[0]
  if (!file) return
  // no()
  let reader = new FileReader();
  reader.onload = function (v) {
    let str = v.target.result;
    if (str && typeof str === 'string') {
      let obj = JSON.parse(str)
      if (obj.version === EXPORT_DATA_KEY.version) {

      } else {
        //TODO
      }
      let data = obj.val
      let settingState = checkAndUpgradeSaveSetting(data.setting)
      settingStore.setState(settingState)
      let dictState = checkAndUpgradeSaveDict(data.dict)
      store.init(dictState)
      ElMessage.success('导入成功！')
    }
  }
  reader.readAsText(file);
}

// API配置相关函数
async function saveApiKey() {
  if (!apiKey.trim()) {
    ElMessage.warning('请输入API Key')
    return
  }

  apiKeyValidating = true
  apiKeyStatus = ''
  
  try {
    const isValid = await validateApiKey(apiKey.trim())
    if (isValid) {
      setDeepSeekApiKey(apiKey.trim())
      apiKeyStatus = 'valid'
      ElMessage.success('API Key 保存成功')
    } else {
      apiKeyStatus = 'invalid'
      ElMessage.error('API Key 无效，请检查后重试')
    }
  } catch (error) {
    apiKeyStatus = 'invalid'
    ElMessage.error('验证API Key失败，请检查网络连接')
  } finally {
    apiKeyValidating = false
  }
}

function clearApiKeyAction() {
  clearApiKey()
  apiKey = ''
  apiKeyStatus = ''
  ElMessage.success('API Key 已清除')
}

// HuggingFace Token 相关函数
async function testHfToken() {
  if (!hfToken.trim()) {
    ElMessage.warning('请输入 HuggingFace Token')
    return
  }
  
  hfTokenValidating = true
  hfTokenStatus = ''
  
  try {
    const isValid = await validateQwenToken(hfToken.trim())
    hfTokenStatus = isValid ? 'valid' : 'invalid'
    ElMessage({
      type: isValid ? 'success' : 'error',
      message: isValid ? 'Token 验证成功' : 'Token 验证失败，请检查是否正确'
    })
  } catch (error) {
    hfTokenStatus = 'invalid'
    ElMessage.error('Token 验证失败')
  } finally {
    hfTokenValidating = false
  }
}

function saveHfToken() {
  if (!hfToken.trim()) {
    ElMessage.warning('请输入 HuggingFace Token')
    return
  }
  
  setHuggingFaceToken(hfToken.trim())
  ElMessage.success('Token 已保存')
}

function clearHfTokenAction() {
  clearHfToken()
  hfToken = ''
  hfTokenStatus = ''
  ElMessage.success('Token 已清除')
}

async function testApiKey() {
  if (!apiKey.trim()) {
    ElMessage.warning('请先输入API Key')
    return
  }

  apiKeyValidating = true
  apiKeyStatus = ''
  
  try {
    const isValid = await validateApiKey(apiKey.trim())
    if (isValid) {
      apiKeyStatus = 'valid'
      ElMessage.success('API Key 有效')
    } else {
      apiKeyStatus = 'invalid'
      ElMessage.error('API Key 无效')
    }
  } catch (error) {
    apiKeyStatus = 'invalid'
    ElMessage.error('测试失败，请检查网络连接')
  } finally {
    apiKeyValidating = false
  }
}
</script>

<template>
  <div class="setting">
    <div class="left">
      <div class="tabs">
        <div class="tab" :class="tabIndex === 0 && 'active'" @click="tabIndex = 0">
          <Icon icon="bx:headphone" width="20" color="#0C8CE9"/>
          <span>音效设置</span>
        </div>
        <div class="tab" :class="tabIndex === 2 && 'active'" @click="tabIndex = 2">
          <Icon icon="material-symbols:keyboard-outline" width="20" color="#0C8CE9"/>
          <span>快捷键设置</span>
        </div>
        <div class="tab" :class="tabIndex === 1 && 'active'" @click="tabIndex = 1">
          <Icon icon="icon-park-outline:setting-config" width="20" color="#0C8CE9"/>
          <span>其他设置</span>
        </div>
        <div class="tab" :class="tabIndex === 5 && 'active'" @click="tabIndex = 5">
          <Icon icon="mdi:school" width="20" color="#0C8CE9"/>
          <span>学习模式</span>
        </div>
        <div class="tab" :class="tabIndex === 4 && 'active'" @click="tabIndex = 4">
          <Icon icon="ri:openai-line" width="20" color="#0C8CE9"/>
          <span>AI配置</span>
        </div>
        <div class="tab" :class="tabIndex === 3 && 'active'" @click="tabIndex = 3">
          <Icon icon="mdi:database-cog-outline" width="20" color="#0C8CE9"/>
          <span>数据管理</span>
        </div>
      </div>
      <div class="git-log">
        Build {{ gitLastCommitHash }}
      </div>
    </div>
    <div class="content">
    <div v-if="tabIndex === 0">
      <div class="row">
        <label class="main-title">所有音效</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.allSound"
                      @change="useChangeAllSound"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="line"></div>
      <div class="row">
        <label class="item-title">单词/句子自动发音</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.wordSound"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="row">
        <label class="sub-title">单词/句子发音口音</label>
        <div class="wrapper">
          <el-select v-model="settingStore.wordSoundType"
                      placeholder="请选择"
          >
            <el-option label="美音" value="us"/>
            <el-option label="英音" value="uk"/>
          </el-select>
        </div>
      </div>
      <div class="row">
        <label class="sub-title">音量</label>
        <div class="wrapper">
          <el-slider v-model="settingStore.wordSoundVolume"/>
          <span>{{ settingStore.wordSoundVolume }}%</span>
        </div>
      </div>
      <div class="row">
        <label class="sub-title">倍速</label>
        <div class="wrapper">
          <el-slider v-model="settingStore.wordSoundSpeed" :step="0.1" :min="0.5" :max="3"/>
          <span>{{ settingStore.wordSoundSpeed }}</span>
        </div>
      </div>
      <div class="line"></div>
      <div class="row">
        <label class="item-title">按键音</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.keyboardSound"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="row">
        <label class="item-title">按键音效</label>
        <div class="wrapper">
          <el-select v-model="settingStore.keyboardSoundFile"
                      placeholder="请选择"
          >
            <el-option
                v-for="item in SoundFileOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
            >
              <div class="el-option-row">
                <span>{{ item.label }}</span>
                <VolumeIcon
                    :time="100"
                    @click="usePlayAudio(getAudioFileUrl(item.value)[0])"/>
              </div>
            </el-option>
          </el-select>
        </div>
      </div>
      <div class="row">
        <label class="sub-title">音量</label>
        <div class="wrapper">
          <el-slider v-model="settingStore.keyboardSoundVolume"/>
          <span>{{ settingStore.keyboardSoundVolume }}%</span>
        </div>
      </div>
      <div class="line"></div>
      <!--          <div class="row">-->
      <!--            <label class="item-title">释义发音</label>-->
      <!--            <div class="wrapper">-->
      <!--              <el-switch v-model="settingStore.translateSound"-->
      <!--                         inline-prompt-->
      <!--                         active-text="开"-->
      <!--                         inactive-text="关"-->
      <!--              />-->
      <!--            </div>-->
      <!--          </div>-->
      <!--          <div class="row">-->
      <!--            <label class="sub-title">音量</label>-->
      <!--            <div class="wrapper">-->
      <!--              <el-slider v-model="settingStore.translateSoundVolume"/>-->
      <!--              <span>{{ settingStore.translateSoundVolume }}%</span>-->
      <!--            </div>-->
      <!--          </div>-->
      <div class="line"></div>
      <div class="row">
        <label class="item-title">效果音（章节结算页烟花音效）</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.effectSound"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="row">
        <label class="sub-title">音量</label>
        <div class="wrapper">
          <el-slider v-model="settingStore.effectSoundVolume"/>
          <span>{{ settingStore.effectSoundVolume }}%</span>
        </div>
      </div>
    </div>
    <div v-if="tabIndex === 1">
      <div class="row">
        <label class="item-title">显示上一个/下一个单词</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.showNearWord"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="desc">
        开启后，练习中会在上方显示上一个/下一个单词
      </div>
      <div class="line"></div>
      <div class="row">
        <label class="item-title">忽略大小写</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.ignoreCase"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="desc">
        开启后，输入时不区分大小写，如输入“hello”和“Hello”都会被认为是正确的
      </div>
      <div class="line"></div>
      <div class="row">
        <label class="item-title">允许默写模式下显示提示</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.allowWordTip"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="desc">
        开启后，可以通过鼠标 hover 单词或者按 {{ settingStore.shortcutKeyMap[ShortcutKey.ShowWord] }} 显示正确答案
      </div>
      <div class="line"></div>
      <div class="row">
        <label class="item-title">字体设置(仅可调整单词练习)</label>
      </div>
      <div class="row">
        <label class="sub-title">外语字体</label>
        <div class="wrapper">
          <el-slider
              :min="10"
              :max="100"
              v-model="settingStore.fontSize.wordForeignFontSize"/>
          <span>{{ settingStore.fontSize.wordForeignFontSize }}</span>
        </div>
      </div>
      <div class="row">
        <label class="sub-title">中文字体</label>
        <div class="wrapper">
          <el-slider
              :min="10"
              :max="100"
              v-model="settingStore.fontSize.wordTranslateFontSize"/>
          <span>{{ settingStore.fontSize.wordTranslateFontSize }}</span>
        </div>
      </div>

      <div class="line"></div>
      <div class="row">
        <label class="item-title">其他设置</label>
      </div>
      <div class="row">
        <label class="sub-title">是否自动切换到下一个单词</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.autoNext"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="desc">
        关闭后，当完成单词输入时，需要再次按下空格键切换下一个
      </div>
      <div class="row">
        <label class="sub-title">自动切换下一个单词延迟</label>
        <div class="wrapper">
          <el-input-number v-model="settingStore.waitTimeForChangeWord"
                            :min="0"
                            type="number"
          />
          <span>毫秒</span>
        </div>
      </div>

      <div class="row">
        <label class="sub-title">默写时是否显示单词长度</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.dictationShowWordLength"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="desc">
        默写时用下划线 _ 来显示每个字符。关闭后，用空格代替，用户将无法判断单词长度
      </div>

    </div>
    <div class="body" v-if="tabIndex === 2">
      <div class="row">
        <label class="main-title">功能</label>
        <div class="wrapper">快捷键(点击可修改)</div>
      </div>
      <div class="scroll">
        <div class="row" v-for="item of Object.entries(settingStore.shortcutKeyMap)">
          <label class="item-title">{{ $t(item[0]) }}</label>
          <div class="wrapper" @click="editShortcutKey = item[0]">
            <div class="set-key" v-if="editShortcutKey === item[0]">
              <input :value="item[1]?item[1]:'未设置快捷键'" readonly type="text" @blur="editShortcutKey = ''">
              <span @click.stop="editShortcutKey = ''">直接按键盘进行设置</span>
            </div>
            <div v-else>
              <div v-if="item[1]">{{ item[1] }}</div>
              <span v-else>未设置快捷键</span>
            </div>
          </div>
        </div>
      </div>
      <div class="row footer">
        <label class="item-title"></label>
        <div class="wrapper">
          <BaseButton @click="resetShortcutKeyMap">恢复默认</BaseButton>
        </div>
      </div>
    </div>
    <div v-if="tabIndex === 5">
      <div class="row">
        <label class="main-title">学习模式设置</label>
      </div>
      <div class="row">
        <label class="item-title">启用例句练习</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.enableSentencePractice"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="desc">
        开启后，每个单词练习完成后会自动生成例句进行练习。需要配置 AI API Key（在 AI配置 选项卡中）
      </div>
      <div class="line"></div>
      <div class="row">
        <label class="item-title">启用造句练习</label>
        <div class="wrapper">
          <el-switch v-model="settingStore.enableCreationPractice"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
          />
        </div>
      </div>
      <div class="desc">
        开启后，完成例句练习后会进入造句练习环节，让您用刚学的单词造句，AI会给出评分和建议
      </div>
    </div>
    <div v-if="tabIndex === 4" class="ai-config-container">
        <div class="config-section">
          <div class="section-header">
            <h3 class="section-title">AI 模型选择</h3>
            <p class="section-desc">选择您要使用的AI模型来生成例句和评分造句</p>
          </div>
          
          <div class="model-selection">
            <el-radio-group v-model="settingStore.aiModel" class="model-options">
              <div class="model-option">
                <el-radio label="deepseek" class="model-radio">
                  <div class="model-info">
                    <span class="model-name">DeepSeek</span>
                    <span class="model-badge premium">付费</span>
                    <span class="model-badge quality">质量高</span>
                  </div>
                  <p class="model-desc">专业AI模型，响应快速，例句质量优秀</p>
                </el-radio>
              </div>
              <div class="model-option">
                <el-radio label="qwen" class="model-radio">
                  <div class="model-info">
                    <span class="model-name">Qwen</span>
                    <span class="model-badge free">免费</span>
                    <span class="model-badge provider">HuggingFace</span>
                  </div>
                  <p class="model-desc">开源免费模型，功能完整，适合日常学习</p>
                </el-radio>
              </div>
            </el-radio-group>
          </div>
        </div>
        
        
        <!-- DeepSeek API 配置 -->
        <div v-if="settingStore.aiModel === 'deepseek'" class="config-section">
          <div class="section-header">
            <h3 class="section-title">DeepSeek API 配置</h3>
            <p class="section-desc">配置 DeepSeek API Key 以启用自动例句生成功能</p>
          </div>
          
          <div class="api-config-card">
            <div class="config-item">
              <label class="config-label">获取 API Key</label>
              <div class="config-content">
                <a href="https://platform.deepseek.com/" target="_blank" rel="noopener" class="external-link">
                  <Icon icon="mdi:open-in-new" width="16" />
                  访问 DeepSeek 官网
                </a>
              </div>
            </div>
            
            <div class="config-item">
              <label class="config-label">API Key</label>
              <div class="config-content">
                <div class="api-input-group">
                  <el-input
                    v-model="apiKey"
                    type="password"
                    placeholder="请输入您的 DeepSeek API Key"
                    show-password
                    clearable
                    @keyup.enter="saveApiKey"
                    class="api-input"
                  />
                  <div class="status-indicator" v-if="apiKeyStatus">
                    <Icon 
                      v-if="apiKeyStatus === 'valid'" 
                      icon="mdi:check-circle" 
                      width="20" 
                      color="#67C23A"
                      title="API Key 有效"
                    />
                    <Icon 
                      v-if="apiKeyStatus === 'invalid'" 
                      icon="mdi:close-circle" 
                      width="20" 
                      color="#F56C6C"
                      title="API Key 无效"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div class="config-item">
              <label class="config-label">操作</label>
              <div class="config-content">
                <div class="button-group">
                  <BaseButton 
                    @click="testApiKey" 
                    :loading="apiKeyValidating"
                    size="small"
                  >
                    {{ apiKeyValidating ? '测试中...' : '测试' }}
                  </BaseButton>
                  <BaseButton 
                    @click="saveApiKey" 
                    type="primary"
                    :loading="apiKeyValidating"
                    size="small"
                  >
                    {{ apiKeyValidating ? '保存中...' : '保存' }}
                  </BaseButton>
                  <BaseButton 
                    @click="clearApiKeyAction" 
                    plain
                    size="small"
                  >
                    清除
                  </BaseButton>
                </div>
                <p class="config-hint">
                  您也可以通过设置环境变量 <code>VITE_DEEPSEEK_API_KEY</code> 来配置 API Key
                </p>
              </div>
            </div>
          </div>
          
          <div class="feature-info">
            <h4 class="feature-title">功能说明</h4>
            <ul class="feature-list">
              <li>每个单词练习完成后，会自动生成一个包含该单词的英文例句</li>
              <li>例句风格：简单易懂、经典常用、不需要中文翻译也能理解</li>
              <li>需要完整打完例句才能进入下一个单词的练习</li>
              <li>如果API调用失败，会使用内置的备用例句模板</li>
            </ul>
          </div>
        </div>
      
      <!-- Qwen API 配置 -->
      <div v-else-if="settingStore.aiModel === 'qwen'" class="config-section">
        <div class="section-header">
          <h3 class="section-title">Qwen API 配置</h3>
          <p class="section-desc">配置 HuggingFace Token 以使用免费的 Qwen 模型</p>
        </div>
        
        <div class="api-config-card">
          <div class="config-item">
            <label class="config-label">获取 Token</label>
            <div class="config-content">
              <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener" class="external-link">
                <Icon icon="mdi:open-in-new" width="16" />
                访问 HuggingFace 获取 Token
              </a>
            </div>
          </div>
          
          <div class="config-item">
            <label class="config-label">HuggingFace Token</label>
            <div class="config-content">
              <div class="api-input-group">
                <el-input
                  v-model="hfToken"
                  type="password"
                  placeholder="请输入您的 HuggingFace Token"
                  show-password
                  clearable
                  class="api-input"
                />
                <div class="status-indicator" v-if="hfTokenStatus">
                  <Icon 
                    v-if="hfTokenStatus === 'valid'" 
                    icon="mdi:check-circle" 
                    color="#67C23A" 
                    width="20" 
                  />
                  <Icon 
                    v-else-if="hfTokenStatus === 'invalid'" 
                    icon="mdi:close-circle" 
                    color="#F56C6C" 
                    width="20" 
                  />
                  <span :class="['status-text', hfTokenStatus]">
                    {{ hfTokenStatus === 'valid' ? '有效' : '无效' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="config-item">
            <label class="config-label">操作</label>
            <div class="config-content">
              <div class="button-group">
                <BaseButton 
                  @click="testHfToken" 
                  :loading="hfTokenValidating"
                  size="small"
                >
                  {{ hfTokenValidating ? '测试中...' : '测试' }}
                </BaseButton>
                <BaseButton 
                  @click="saveHfToken" 
                  type="primary"
                  :loading="hfTokenValidating"
                  size="small"
                >
                  {{ hfTokenValidating ? '保存中...' : '保存' }}
                </BaseButton>
                <BaseButton 
                  @click="clearHfTokenAction" 
                  plain
                  size="small"
                >
                  清除
                </BaseButton>
              </div>
              <p class="config-hint">
                您也可以通过设置环境变量 <code>VITE_HF_TOKEN</code> 来配置 Token
              </p>
            </div>
          </div>
        </div>
        
        <div class="feature-info">
          <h4 class="feature-title">功能说明</h4>
          <ul class="feature-list">
            <li>使用 HuggingFace 提供的免费 Qwen 3.5 模型</li>
            <li>功能与 DeepSeek 完全相同：自动生成例句和造句评分</li>
            <li>完全免费，但可能响应速度稍慢</li>
            <li>需要注册 HuggingFace 账号并获取免费 Token</li>
          </ul>
        </div>
      </div>
    </div>
    <div v-if="tabIndex === 3">
      <div class="row">
        <div class="main-title">数据导出</div>
      </div>
      <div class="row">
        <label class="sub-title">
          目前用户的所有数据(自定义设置、自定义词典、练习进度等)
          <b>仅保存在本地</b>
          。如果您需要在不同的设备、浏览器或者其他非官方部署上使用 {{ APP_NAME }}， 您需要手动进行数据同步和保存。
        </label>
      </div>
      <div class="row">
        <BaseButton @click="exportData">数据导出</BaseButton>
      </div>
      <div class="row">
        <div class="main-title">数据导入</div>
      </div>
      <div class="row">
        <label class="sub-title">
          请注意，导入数据将
          <b style="color: red"> 完全覆盖 </b>
          当前数据。请谨慎操作。
        </label>
      </div>
      <div class="row">
        <div class="import hvr-grow">
          <BaseButton>数据导入</BaseButton>
          <input type="file"
                  accept="application/json"
                  @change="importData">
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped lang="scss">
@import "@/assets/css/variable";

.setting {
  width: 40vw;
  height: 70vh;
  display: flex;
  color: var(--color-font-1);

  .left {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;

    .tabs {
      padding: 10rem 20rem;
      display: flex;
      flex-direction: column;
      //align-items: center;
      //justify-content: center;
      gap: 10rem;

      .tab {
        cursor: pointer;
        padding: 10rem 15rem;
        border-radius: 8rem;
        display: flex;
        align-items: center;
        gap: 10rem;

        &.active {
          background: var(--color-item-bg);
        }
      }
    }

    .git-log {
      font-size: 10rem;
      color: gray;
      margin-bottom: 5rem;
    }
  }

  .content {
    background: var(--color-header-bg);
    flex: 1;
    height: 100%;
    overflow: auto;
    padding: 10rem var(--space);

    .row {
      min-height: 40rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: calc(var(--space) * 5);

      .wrapper {
        height: 30rem;
        flex: 1;
        display: flex;
        justify-content: flex-end;
        gap: var(--space);

        span {
          text-align: right;
          //width: 30rem;
          font-size: 12rem;
          color: gray;
        }

        .set-key {
          align-items: center;

          input {
            width: 150rem;
            box-sizing: border-box;
            margin-right: 10rem;
            height: 28rem;
            outline: none;
            font-size: 16rem;
            border: 1px solid gray;
            border-radius: 3rem;
            padding: 0 5rem;
            background: var(--color-second-bg);
            color: var(--color-font-1);
          }
        }
      }

      .main-title {
        font-size: 22rem;
      }

      .item-title {
        font-size: 16rem;
      }

      .sub-title {
        font-size: 14rem;
      }
    }

    // API配置相关样式
    .api-input {
      display: flex;
      align-items: center;
      gap: 10rem;
      flex: 1;
    }

    .button-group {
      display: flex;
      gap: 10rem;
      align-items: center;
    }

    a {
      color: var(--el-color-primary);
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }

         code {
       background: var(--color-bg-2);
       padding: 2rem 6rem;
       border-radius: 4rem;
       font-family: monospace;
       font-size: 12rem;
     }

    .body {
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .scroll {
      flex: 1;
      padding-right: 10rem;
      overflow: auto;
    }

    .footer {
      margin-bottom: 20rem;
    }

    .desc {
      margin-bottom: 10rem;
      font-size: 12rem;
    }

    .line {
      border-bottom: 1px solid #c4c3c3;
    }
  }
}

.el-option-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .icon-wrapper {
    transform: translateX(10rem);
  }
}

.import {
  display: inline-flex;
  position: relative;

  input {
    position: absolute;
    height: 100%;
    width: 100%;
    opacity: 0;
  }
}

// AI配置页面样式
.ai-config-container {
  padding: 20rem;
  max-width: 800rem;
}

.config-section {
  margin-bottom: 32rem;

  .section-header {
    margin-bottom: 24rem;
    
    .section-title {
      font-size: 20rem;
      font-weight: 600;
      margin: 0 0 8rem 0;
      color: var(--color-font-1);
    }
    
    .section-desc {
      font-size: 14rem;
      color: var(--color-font-3);
      margin: 0;
      line-height: 1.5;
    }
  }
}

.model-selection {
  .model-options {
    display: flex;
    flex-direction: column;
    gap: 16rem;
  }
  
  .model-option {
    border: 2rem solid var(--color-bg-3);
    border-radius: 8rem;
    padding: 20rem;
    transition: all 0.3s ease;
    background: var(--color-bg-1);
    
    &:hover {
      border-color: var(--el-color-primary-light-7);
      box-shadow: 0 2rem 8rem rgba(64, 158, 255, 0.1);
    }
    
    .model-radio {
      width: 100%;
      margin: 0;
      
      :deep(.el-radio__label) {
        width: 100%;
        padding-left: 16rem;
      }
    }
    
    .model-info {
      display: flex;
      align-items: center;
      gap: 12rem;
      margin-bottom: 8rem;
      
      .model-name {
        font-size: 16rem;
        font-weight: 500;
        color: var(--color-font-1);
      }
      
      .model-badge {
        padding: 2rem 8rem;
        border-radius: 12rem;
        font-size: 12rem;
        font-weight: 500;
        
        &.premium {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        &.quality {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }
        
        &.free {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }
        
        &.provider {
          background: var(--color-bg-3);
          color: var(--color-font-2);
        }
      }
    }
    
    .model-desc {
      font-size: 13rem;
      color: var(--color-font-3);
      margin: 0;
      line-height: 1.4;
    }
  }
}

.api-config-card {
  background: var(--color-bg-1);
  border: 1rem solid var(--color-bg-3);
  border-radius: 12rem;
  overflow: hidden;
  margin-bottom: 24rem;
  
  .config-item {
    padding: 20rem 24rem;
    border-bottom: 1rem solid var(--color-bg-3);
    
    &:last-child {
      border-bottom: none;
    }
    
    .config-label {
      display: block;
      font-size: 14rem;
      font-weight: 500;
      color: var(--color-font-1);
      margin-bottom: 12rem;
    }
    
    .config-content {
      .external-link {
        display: inline-flex;
        align-items: center;
        gap: 6rem;
        color: var(--el-color-primary);
        text-decoration: none;
        font-size: 14rem;
        
        &:hover {
          text-decoration: underline;
        }
      }
      
      .api-input-group {
        display: flex;
        align-items: center;
        gap: 12rem;
        
        .api-input {
          flex: 1;
          max-width: 400rem;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6rem;
          
          .status-text {
            font-size: 13rem;
            font-weight: 500;
            
            &.valid {
              color: #67C23A;
            }
            
            &.invalid {
              color: #F56C6C;
            }
          }
        }
      }
      
      .button-group {
        display: flex;
        gap: 12rem;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 12rem;
      }
      
      .config-hint {
        font-size: 12rem;
        color: var(--color-font-3);
        margin: 0;
        line-height: 1.4;
      }
    }
  }
}

.feature-info {
  background: var(--color-bg-2);
  border-radius: 8rem;
  padding: 20rem;
  
  .feature-title {
    font-size: 16rem;
    font-weight: 500;
    color: var(--color-font-1);
    margin: 0 0 16rem 0;
  }
  
  .feature-list {
    margin: 0;
    padding-left: 20rem;
    
    li {
      font-size: 13rem;
      color: var(--color-font-2);
      line-height: 1.6;
      margin-bottom: 8rem;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

</style>