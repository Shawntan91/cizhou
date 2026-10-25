# 词舟 · 线上部署全指南 (Deployment Guide)

本项目已经过全栈整合优化：
- 前端（React + Vite）构建产物位于 `client/dist`。
- 后端（Express + Node.js）直接集成托管前端静态页面与 `/api` 接口。
- 本地 1000 词考研真题精选词库直接保存在 `server/prisma/dev.db` 中。

只需启动一个后端服务（端口 4000），即可对外提供完整的“背单词 + 真题解析 + 词书管理”全站服务！

---

## 目录
1. [方案一：【0元 1分钟】内网穿透（无需买服务器，手机立即背单词）](#方案一0元-1分钟内网穿透)
2. [方案二：【最推荐·正规上线】Linux 云服务器部署（PM2 + Nginx）](#方案二linux-云服务器部署pm2--nginx)
3. [方案三：【小白零命令】宝塔面板可视化部署](#方案三宝塔面板可视化部署)
4. [方案四：【现代化】Docker & Docker Compose 一键部署](#方案四docker-一键部署)
5. [常见问题与排错 (FAQ)](#常见问题与排错)

---

## 方案一：【0元 1分钟】内网穿透

> **适合人群**：不想花钱买云服务器，想直接在自己的手机、iPad 或在图书馆/教室通过公网网址访问本机已经提取好 1000 个真题词的词舟。

### 操作步骤：
1. **本机启动词舟**：双击运行 `启动词舟.bat`（确保服务在 `http://localhost:4000` 正常运行）。
2. **下载内网穿透工具**（以免费的 **cpolar** 为例）：
   - 访问 [cpolar 官网](https://www.cpolar.com/) 注册并下载 Windows 客户端。
3. **映射端口**：
   打开命令行（CMD/PowerShell）执行：
   ```bash
   cpolar http 4000
   ```
4. **获取公网网址**：
   终端会输出一个专属的公网网址（例如 `https://xxxx.cpolar.cn`）。
5. 复制该链接发送到手机微信或浏览器，即可随时随地背单词！

---

## 方案二：【Linux 云服务器部署（PM2 + Nginx）】

> **适合人群**：购买了腾讯云、阿里云或华为云服务器（如 Ubuntu / Debian / CentOS 轻量服务器）。

### 1. 登录服务器并安装基础环境
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# 全局安装 PM2 进程守护工具
sudo npm install -g pm2
```

### 2. 上传项目代码
将本地的 `词舟` 项目目录通过 SCP、Xftp 或 Git 推送到服务器（例如目录 `/var/www/cizhou`）。
> ⚠️ **关键注意**：请务必确保包含刚刚提取好 1000 词的数据库文件：`server/prisma/dev.db`！

### 3. 安装依赖与构建
在服务器上执行：
```bash
# 1. 构建前端
cd /var/www/cizhou/client
npm install
npm run build

# 2. 安装后端依赖
cd /var/www/cizhou/server
npm install --omit=dev
npx prisma generate
```

### 4. 使用 PM2 启动并常驻后台
```bash
cd /var/www/cizhou
# 使用项目自带的 PM2 配置文件启动
pm2 start ecosystem.config.cjs

# 设置开机自启
pm2 save
pm2 startup
```
此时后端已在后台常驻运行于 `127.0.0.1:4000`，即便关闭终端也不会退出。

### 5. 配置 Nginx 反向代理与域名
编辑 Nginx 配置：
```bash
sudo nano /etc/nginx/sites-available/cizhou
```
写入以下内容（也可参考 `docs/nginx.conf.example`）：
```nginx
server {
    listen 80;
    server_name your-domain.com; # 替换成你的域名或服务器公网 IP

    client_max_body_size 50M; # 允许上传真题 PDF

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
启用站点并重启 Nginx：
```bash
sudo ln -s /etc/nginx/sites-available/cizhou /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. 配置 HTTPS 免费证书（可选）
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 方案三：【宝塔面板可视化部署】

> **适合人群**：云服务器安装了“宝塔 Linux 面板”，喜欢可视化鼠标操作的用户。

1. **上传文件**：通过宝塔的「文件」管理器，将项目上传到 `/www/wwwroot/cizhou`。
2. **安装 Node 版本**：在宝塔「软件商店」搜索安装「Node.js 版本管理器」，安装 `v20.x`。
3. **添加 Node 项目**：
   - 进入宝塔左侧「网站」➔「Node 项目」➔「添加 Node 项目」。
   - **项目目录**：选择 `/www/wwwroot/cizhou`
   - **启动选项**：`自定义启动命令` 或直接指定 `server/src/index.js`
   - **项目端口**：`4000`
   - **执行命令**：`node server/src/index.js`
   - **绑定域名**：填入你的域名
4. 点击「提交」，宝塔会自动安装依赖并启动服务，同时自动配置 Nginx 反代！在站点设置中勾选「SSL」即可一键申请免费 Let's Encrypt 证书。

---

## 方案四：【Docker 一键部署】

> **适合人群**：服务器已安装 Docker 与 Docker Compose。

项目已预置多阶段构建 `Dockerfile` 与 `docker-compose.yml`。

在项目根目录执行：
```bash
# 启动容器（后台运行）
docker compose up -d --build
```

- 自动执行前端构建与后端打包；
- 自动持久化挂载 `./server/prisma/dev.db`，1000 个真题词库不会因容器重启丢失；
- 自动映射服务器 4000 端口（若想改为 80 端口，可修改 `docker-compose.yml` 中的 ports 为 `"80:4000"`）。

---

## 常见问题与排错

### Q1: 上传到云端后，真题词库还在不在？
**在！** 因为 1000 个真题词汇存储在本地轻量数据库 `server/prisma/dev.db` 中。只要上传时包含了该文件，上线后登录 `demo@vocab.app` 即可看到完整的词书和单词。此外项目还在 `server/src/data/exam1000Words.json` 保留了全量离线备份。

### Q2: 云服务器无法访问网站怎么办？
1. 检查云厂商控制台（阿里云/腾讯云）的 **安全组规则**，是否开放了对应端口（如 80、443、4000）。
2. 检查服务器内部防火墙（如 `ufw allow 80`、`ufw allow 4000`）。
3. 检查进程是否在线（`pm2 status` 或 `docker compose ps`）。

### Q3: 生产环境需要配置 AI 大模型解析吗？
词舟内置了本地兜底解析词库与 1000 词真题离线释义，不填 API Key 也能正常背诵和学习。如需启用 GPT / DeepSeek 等外部 AI 深度解析，只需在服务器的 `server/.env` 中配置：
```ini
AI_API_KEY=sk-xxxxxx
AI_API_URL=https://api.openai.com   # 或第三方大模型中转地址
AI_MODEL=gpt-4o-mini                # 或 deepseek-chat
```
配置完成后重启服务即可生效。
