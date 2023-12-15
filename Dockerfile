# 選擇一個 Node.js 基礎映像
FROM node:14

# 設置工作目錄
WORKDIR /usr/src/app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝應用依賴項
RUN npm install

# 複製應用源代碼
COPY . .

# 應用運行時監聽的端口
EXPOSE 3000

# 定義運行應用的命令
CMD ["npm", "start"]
