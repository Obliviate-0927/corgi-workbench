# 柯基财税工作台 · 每日资讯快报（完全免费）

一个纯静态网页工作台，含**待办 / 网址收藏 / 便签 / 财税计算器 / 财务信息**五大模块。
其中「财务信息」板块由 GitHub Actions **每天北京时间 08:00 自动抓取**国家税务总局、财政部、河南省税务局、财政部会计司、中国人民银行的最新政策公告，生成 `news.json` 并发布到 GitHub Pages，**链接永久固定、完全免费、零服务器**。

点开任意一条快报，都会在新标签页跳转到对应的**官方原文网址**。

---

## 一、5 分钟部署（零基础）

> 全程免费，只需要一个 GitHub 账号（没有就到 https://github.com 用邮箱注册，不花一分钱）。

### 1. 新建仓库
- 登录 GitHub → 右上角 **＋** → **New repository**
- Repository name 填 `corgi-workbench`（或任意英文名，只能字母/数字/横线）
- 选 **Public**（私有仓库 Pages 要付费，公开免费）
- 勾 **Add a README file**（其实我们会覆盖）
- 点 **Create repository**

### 2. 上传文件
在仓库页面点 **Add file → Upload files**，把本目录里的这几个文件拖进去（**保持文件名不变**）：
- `index.html`
- `news.json`
- `fetch-news.js`
- `.github/`（整个文件夹，含 workflow）— 注意：GitHub 网页上传默认不显示点开头的文件夹，请用下面「方式二」

> ⚠️ 网页拖拽上传 `.github` 文件夹容易丢。推荐**方式二（用 Git 客户端）**一次传全：
> ```bash
> git clone https://github.com/<你的用户名>/corgi-workbench.git
> cd corgi-workbench
> # 把本目录所有文件（含 .github）复制进来
> git add -A
> git commit -m "init"
> git push
> ```
> 或者用 GitHub Desktop（图形界面，免费）克隆后把文件拖进去再 Publish。

### 3. 开启 Pages
- 仓库页 → **Settings → Pages**
- Source 选 **GitHub Actions**
- 保存

### 4. 等第一次运行
- 进入仓库 **Actions** 标签页，会看到「每日资讯快报」工作流在跑（首次可能因设置需要点一下 **I understand... enable**）
- 跑完（约 1~2 分钟），你的工作台地址就是：
  ```
  https://<你的用户名>.github.io/corgi-workbench/
  ```
- 把这个链接发给朋友即可，**永远不变**。

---

## 二、每天怎么更新？
- **自动**：Actions 里的 `schedule: '0 0 * * *'`（UTC 0 点 = 北京 8 点）每天自动抓一次并重新发布。你每天早上打开就是当日最新快报。
- **手动**：仓库 **Actions → 每日资讯快报 → Run workflow** 点一下，立刻更新一次（调试或想马上看最新时用）。

---

## 三、本地自用（可选）
不想发朋友、只自己用也可以：
```bash
node fetch-news.js        # 生成本地 news.json
# 直接双击 index.html 打开即可（财务信息读本地 news.json）
```
想每天自动更新本地版？用本智能体的「自动化」功能，每天早 8 点跑 `node fetch-news.js` 即可。

---

## 四、自定义抓取来源
打开 `fetch-news.js`，编辑顶部的 `SOURCES` 数组即可增删部委/栏目（每源可配多个栏目 URL 自动回退）。
> 已知限制：纯静态抓取拿不到**前端动态渲染**的网站（如人社部官网、中国政府网政策库的链接嵌在 JS 中）。这类若要纳入，需要接入其数据接口或浏览器渲染，超出免费静态方案范围。

---

## 五、数据来源与免责
- 数据来自各政府部门公开官网的列表页，点击跳转官方原文。
- 抓取结果为机器提取，**以官方发布为准**；如有遗漏或日期识别偏差，以官网原文日期为准。
- 本工作台不存储、不上传你的任何个人数据（待办/网址/便签均在你的浏览器本地）。
