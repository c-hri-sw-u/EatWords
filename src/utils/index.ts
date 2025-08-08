import localforage from "localforage";
import {SAVE_DICT_KEY, SAVE_SETTING_KEY} from "@/utils/const.ts";
import {BaseState, DefaultBaseState} from "@/stores/base.ts";
import {DefaultSettingState, SettingState} from "@/stores/setting.ts";
import {cloneDeep} from "lodash-es";
import {Dict, DictType} from "@/types.ts";

export function getRandom(a: number, b: number): number {
    return Math.random() * (b - a) + a;
}

export function no() {
    ElMessage.warning('未现实')
}

export function checkAndUpgradeSaveDict(val: string) {
    // console.log(configStr)
    // console.log('s', new Blob([val]).size)
    // val = ''
    if (val) {
        try {
            let data
            if (typeof val === 'string') {
                data = JSON.parse(val)
            } else {
                data = val
            }
            let state: BaseState = data.val
            if (typeof state !== 'object') {
                return {}
            }
            if (!data.version) {
                return {}
            }
            state.load = false
            let version = Number(data.version)
            // console.log('state', state)
            let defaultBaseState = DefaultBaseState()
            if (version === SAVE_DICT_KEY.version) {
                //防止人为删除数据，导致数据不完整报错
                for (const [key, value] of Object.entries(defaultBaseState)) {
                    if (state[key] !== undefined) defaultBaseState[key] = state[key]
                }
                return defaultBaseState
            } else {
                //防止人为删除数据，导致数据不完整报错
                for (const [key, value] of Object.entries(defaultBaseState)) {
                    if (state[key] !== undefined) defaultBaseState[key] = state[key]
                }
                return defaultBaseState
            }
        } catch (e) {
            return {}
        }
    }
    return {}
}

export function checkAndUpgradeSaveSetting(val: string) {
    // console.log(configStr)
    // console.log('s', new Blob([val]).size)
    // val = ''
    if (val) {
        try {
            let data
            if (typeof val === 'string') {
                data = JSON.parse(val)
            } else {
                data = val
            }
            let state: SettingState = data.val
            if (typeof state !== 'object') {
                return {}
            }
            if (!data.version) {
                return {}
            }
            state.load = false
            let version = Number(data.version)
            let defaultSettingState = DefaultSettingState()
            if (version === SAVE_SETTING_KEY.version) {
                //防止人为删除数据，导致数据不完整报错
                for (const [key, value] of Object.entries(defaultSettingState)) {
                    if (state[key] !== undefined) defaultSettingState[key] = state[key]
                }
                return defaultSettingState
            } else {
                //为了保持永远是最新的快捷键选项列表，但保留住用户的自定义设置，去掉无效的快捷键选项
                //例: 2版本，可能有快捷键A。3版本没有了
                for (const [key, value] of Object.entries(defaultSettingState.shortcutKeyMap)) {
                    if (state.shortcutKeyMap[key] !== undefined) defaultSettingState.shortcutKeyMap[key] = state.shortcutKeyMap[key]
                }
                delete state.shortcutKeyMap

                for (const [key, value] of Object.entries(defaultSettingState)) {
                    if (state[key] !== undefined) defaultSettingState[key] = state[key]
                }
                return defaultSettingState
            }
        } catch (e) {
            return {}
        }
    }
    return {}
}

//筛选未自定义的词典，未自定义的词典不需要保存单词，用的时候再下载
export function shakeCommonDict(n: BaseState): BaseState {
    let data: BaseState = cloneDeep(n)
    data.myDictList.map((v: Dict) => {
        if (v.isCustom) {
            if (v.type === DictType.article) {
                v.articles.map(s => {
                    delete s.sections
                })
            }
        } else {
            if (v.type === DictType.word) v.originWords = []
            if (v.type === DictType.article) v.articles = []
            v.words = []
            v.chapterWords = []
        }
    })
    return data
}

/**
 * 标准化引号字符，让不同形态的引号能够互相匹配
 * @param char 需要标准化的字符
 * @returns 标准化后的字符
 */
export function normalizeQuote(char: string): string {
  // 使用Unicode码点来确保正确的字符映射
  const charCode = char.charCodeAt(0)
  
  // 单引号标准化 - 所有变体都映射到标准英文单引号 (U+0027)
  if ([0x0027, 0x2018, 0x2019, 0x201A, 0x201B, 0x2032, 0x2035, 0x2039, 0x203A].includes(charCode)) {
    return "'"
  }
  
  // 双引号标准化 - 所有变体都映射到标准英文双引号 (U+0022)
  if ([0x0022, 0x201C, 0x201D, 0x201E, 0x201F, 0x2033, 0x2036, 0x2037, 0x2038].includes(charCode)) {
    return '"'
  }
  
  return char
}

/**
 * 标准化字符串中的所有引号
 * @param str 需要标准化的字符串
 * @returns 标准化后的字符串
 */
export function normalizeQuotes(str: string): string {
  return str.split('').map(normalizeQuote).join('')
}

/**
 * 比较两个字符串，忽略引号差异
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @param ignoreCase 是否忽略大小写
 * @returns 是否相等
 */
export function compareStringsIgnoreQuotes(str1: string, str2: string, ignoreCase: boolean = false): boolean {
  const normalized1 = normalizeQuotes(ignoreCase ? str1.toLowerCase() : str1)
  const normalized2 = normalizeQuotes(ignoreCase ? str2.toLowerCase() : str2)
  return normalized1 === normalized2
}