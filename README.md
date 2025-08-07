<h1 align="center">
  EatWords
</h1>

<p align="center">
  打字背单词
</p>

<p align="center">
  <a href="https://github.com/zyronon/type-word/blob/master/LICENSE"><img src="https://img.shields.io/github/license/zyronon/type-word" alt="License"></a>
  <a><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"/></a>
  <a><img src="https://img.shields.io/badge/Powered%20by-Vue-blue"/></a>
</p>

## 📋 项目说明

本项目是 [TypeWords](https://github.com/zyronon/TypeWords) 的修改版本，基于原项目进行功能扩展。

### 📄 版权声明

- **原项目**: [zyronon/TypeWords](https://github.com/zyronon/TypeWords)
- **许可证**: 基于 [GPL-3.0](https://github.com/zyronon/TypeWords/blob/master/LICENSE) 许可证
- **版权**: 原项目版权归原作者 [@zyronon](https://github.com/zyronon) 所有
- **本版本**: 在遵守GPL-3.0许可证的前提下进行的功能增强

### 🆕 新增功能 (2025年8月7日)

#### 1. **例句练习功能**
- 自动生成英文例句：支持DeepSeek API和免费Qwen模型
- 逐字符打字练习：模仿单词打字的体验
- 防单词截断：确保例句中的单词不会被换行截断
- 自动朗读：例句完成后自动朗读，加深记忆
- 智能换行：支持大字体时的正确换行显示

#### 2. **造句练习功能**
- 用户造句：使用目标单词创建句子
- AI智能评分：1-10分制评分系统
- 详细反馈：提供具体的改进建议
- 快捷键支持：
  - `Ctrl+Enter`: 继续练习
  - `Ctrl+R`: 重新造句
- 目前支持AI模型：DeepSeek和Qwen(HuggingFace)

#### 3. **AI配置增强**
- 双模型支持：DeepSeek API + Qwen(HuggingFace)
- 灵活切换：可在设置中自由选择AI模型
- 环境变量配置：支持API密钥的安全配置

## 📸 在线访问

Github Pages: <https://c-hri-sw-u.github.io/EatWords/>


---


```下面是原项目功能和介绍```

## 🛠 功能列表

### 背单词
可以选择记忆或默写单词，提供了音标显示、发音功能（均可选美音、英音）、错误统计 

### 背文章
内置经典教材书籍，可以练习和背诵文章，逐句输入，自动发音。也可以自行添加、导入文章，提供一键翻译、译文对照功能

### 生词本、错词本、简单词
默写单词时输入错误会自动添加到错词本，以便后续复习。也可以添加到简单词，之后再遇到这个词便会自动跳过，同时也可以将其添加到生词本中，以便巩固复习

### 默写模式
在用户完成一个章节的练习后，如果有错误词，那么会重复练习错误词，直到没有错误词为止。完成之后弹出选项可选择默写本章、重复本章、下一章

### 例句练习 (新增)
- 每个单词自动生成经典英文例句
- 逐字符打字练习，绿色正确，红色错误
- 例句完成后自动朗读
- 支持AI模型自动生成例句

### 造句练习 (新增)
- 使用目标单词造句
- AI智能评分和详细反馈
- 快捷键操作支持
- 可重新造句或继续练习

### 词库
内置了常用的 CET-4 、CET-6 、GMAT 、GRE 、IELTS 、SAT 、TOEFL 、考研英语、专业四级英语、专业八级英语，也有程序员常见英语单词以及多种编程语言API 等词库。 尽可能满足大部分用户对背单词的需求，也非常欢迎社区贡献更多的词库。

## 🚀 运行项目

本项目是基于`Vue`开发的，需要 node 环境来运行。

### 手动安装

1. 安装 NodeJS，参考[官方文档](https://nodejs.org/en/download)
2. 使用 `git clone` 下载项目到本地, 不使用 git 可能因为缺少依赖而无法运行
3. 打开命令行，在项目根目录下，运行`pnpm install`来下载依赖。
4. 执行`pnpm start`来启动项目，项目默认地址为[`http://localhost:3000`](http://localhost:3000)
5. 在浏览器中打开[`http://localhost:3000`](http://localhost:3000) 来访问项目。

### AI功能配置

如需使用例句生成和造句评分功能，请配置以下环境变量：

1. 创建 `.env` 文件
2. 添加以下配置（选择其一）：
   ```
   # DeepSeek API (推荐)
   VITE_DEEPSEEK_API_KEY=your_deepseek_api_key_here
   
   # 或使用免费Qwen模型
   VITE_HF_TOKEN=your_huggingface_token_here
   ```

## 📕 词库列表

- CET-4、CET-6、GMAT、GRE、IELTS、SAT、TOEFL、BEC
- 考研英语、专业四级英语、专业八级英语、商务英语
- Coder Dict 程序员常用词
- 高考、中考、人教版英语 3-9 年级
- 王陆雅思王听力语料库 
- 日语常见词、N1 ～ N5 

## 🙏 致谢

感谢原项目作者 [@zyronon](https://github.com/zyronon) 提供的优秀基础框架
 
 
