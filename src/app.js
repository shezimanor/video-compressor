// 加載環境變量
require('dotenv').config();
// 引入套件
const express = require('express');
const cors = require('cors');
// 引入 multer: 處理上傳文件的存儲位置和文件名
const multer = require('multer');
// 引入 fluent-ffmpeg
const ffmpeg = require('fluent-ffmpeg');
const app = express();
const fs = require('fs');
const path = require('path');
const os = require('os');
// 排程套件
const cron = require('node-cron');
// 資料夾名稱
const inputDir = 'vc-input';
const outputDir = 'vc-output';
// Port
const PORT = process.env.PORT || 3000;
// IP
const IP = getIPAddress();

// 自動建立資料夾
if (!fs.existsSync(`./${inputDir}`)) {
  fs.mkdirSync(`./${inputDir}`, { recursive: true });
}
if (!fs.existsSync(`./${outputDir}`)) {
  fs.mkdirSync(`./${outputDir}`, { recursive: true });
}

// ip
function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];

    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }

  return '0.0.0.0';
}

// 設置 multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 上傳文件的存儲目錄
    cb(null, `${inputDir}/`);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  }
});

// 創建 multer 實例
const upload = multer({ storage: storage });

// 刪除 outputDir 底下的所有檔案
const clearOutputDir = () => {
  fs.readdir(outputDir, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(outputDir, file), (err) => {
        if (err) throw err;
      });
    }
  });
};

// 安排定時任務 - 台灣時區每天凌晨 1 點執行
cron.schedule(
  '0 1 * * *',
  () => {
    console.log('Running a job at 01:00 in Taiwan timezone');
    clearOutputDir();
  },
  {
    scheduled: true,
    timezone: 'Asia/Taipei'
  }
);

// 設置 cors
app.use(cors());

// 為了處理 JSON 請求體
app.use(express.json());

// router
app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.get('/hehes', (req, res) => {
  res.status(200).json({ message: 'Hello World!' });
});
app.post('/videos', upload.single('file'), (req, res) => {
  // 上傳的文件信息在 req.file
  console.log('video:', req.file);

  // 不是影片，回傳錯誤
  if (req.file.mimetype !== 'video/mp4') {
    return res.status(415).json({ message: 'Not a video' });
  }

  // 輸出文件的路徑
  const outputPath = `${outputDir}/${req.file.filename}`;

  // 壓縮這個影片
  ffmpeg(req.file.path)
    .size('?x480')
    .output(outputPath)
    .on('end', function (err) {
      // 發送文件給用戶
      res.download(outputPath, (err) => {
        if (err) {
          console.log('Error in sending file', err);
          res.status(500).send('Unable to download the video');
        } else {
          // 刪除原始上傳的影片
          fs.unlink(req.file.path, (err) => {
            if (err) {
              console.error('Error deleting original file: ', err);
            }
          });
        }
      });
    })
    .on('error', function (err) {
      console.log('error: ', err);
      res.status(500).json({ message: 'Video processing error' });
    })
    .run();
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
});
