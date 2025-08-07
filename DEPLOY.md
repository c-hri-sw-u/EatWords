# EatWords GitHub Pages 部署指南

## 🚀 自动部署

本项目已配置GitHub Actions自动部署到GitHub Pages。

### 部署步骤：

1. **推送代码到GitHub**
   ```bash
   git add .
   git commit -m "feat: 添加GitHub Pages自动部署"
   git push origin master
   ```

2. **启用GitHub Pages**
   - 进入您的GitHub仓库
   - 点击 `Settings` → `Pages`
   - 在 `Source` 下选择 `Deploy from a branch`
   - 选择 `gh-pages` 分支
   - 点击 `Save`

3. **等待构建完成**
   - GitHub Actions会自动构建项目
   - 构建完成后，网站将在 `https://yourusername.github.io/EatWords/` 访问

## 🔧 本地构建测试

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm run build

# 预览构建结果
pnpm run preview
```

## 🔑 环境变量配置

如果需要API密钥，在GitHub仓库设置中添加Secrets：

1. 进入 `Settings` → `Secrets and variables` → `Actions`
2. 添加以下secrets（如果需要）：
   - `VITE_DEEPSEEK_API_KEY`: DeepSeek API密钥
   - `VITE_HF_TOKEN`: HuggingFace Token

然后取消注释 `.github/workflows/deploy.yml` 中的环境变量配置。

## 📝 注意事项

- 项目使用pnpm作为包管理器
- 构建输出在 `dist` 目录
- 生产环境base URL设置为 `/EatWords/`
- `.nojekyll` 文件防止Jekyll处理 