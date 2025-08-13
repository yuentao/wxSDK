# 微信分享 SDK

[![npm version](https://img.shields.io/npm/v/wxsdk-pure.svg)](https://www.npmjs.com/package/wxsdk-pure)
[![license](https://img.shields.io/npm/l/wxsdk-pure.svg)](https://github.com/yourusername/wxsdk-pure/blob/main/LICENSE)

一个轻量级、健壮的微信分享 SDK 封装，支持朋友圈分享、好友分享和微信开放标签功能。

## 功能特性

- 🚀 **一键初始化**：简化微信分享配置流程
- 🔒 **安全可靠**：完善的错误处理和参数校验
- ⚡ **智能加载**：避免重复加载微信 SDK
- ⏱️ **超时控制**：防止加载卡死
- 🔄 **Promise API**：支持 async/await 调用
- 📱 **微信开放标签**：支持最新开放标签功能

## 安装

```bash
npm install wxsdk-pure
```

## 使用方法

### 基本使用

```javascript
import wxSDK from 'wxsdk-pure';

wxSDK({
  apiUrl: 'https://your-api.com/wx-signature',
  title: ['朋友圈标题', '好友分享标题'],
  desc: '分享描述内容',
  shareIcon: [
    'https://example.com/timeline-icon.jpg',
    'https://example.com/message-icon.jpg'
  ],
  debug: true
})
.then(wx => {
  console.log('微信 SDK 初始化成功');
})
.catch(err => {
  console.error('初始化失败:', err);
});
```

### 高级配置

```javascript
wxSDK({
  apiUrl: 'https://your-api.com/wx-signature',
  sdk: 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js',
  title: '默认标题',
  desc: '分享描述内容',
  shareLinks: [
    'https://your-domain.com/timeline-url',
    'https://your-domain.com/message-url'
  ],
  jsApiList: ['chooseImage', 'previewImage'],
  openTagList: ['wx-open-launch-weapp'],
  timeout: 10000,
  callback: {
    ready: () => console.log('分享配置就绪'),
    success: (type) => console.log(`${type} 分享配置成功`),
    error: (err) => console.error('分享配置失败', err)
  }
});
```

## 配置选项

| 参数 | 类型 | 默认值 | 必填 | 描述 |
|------|------|---------|------|------|
| `apiUrl` | string | - | 是 | 后端签名接口地址 |
| `sdk` | string | `https://res.wx.qq.com/open/js/jweixin-1.6.0.js` | 否 | 微信 SDK URL |
| `title` | string \| string[] | `['分享至朋友圈', '分享至好友']` | 否 | 分享标题 |
| `desc` | string | `'万事皆虚，万物皆允'` | 否 | 分享描述 |
| `shareIcon` | string \| string[] | 网站图标 | 否 | 分享图标 URL |
| `shareLinks` | string \| string[] | 当前页面 URL | 否 | 分享链接 |
| `debug` | boolean | `false` | 否 | 启用调试模式 |
| `jsApiList` | string[] | `[]` | 否 | 微信 JS API 列表 |
| `openTagList` | string[] | `[]` | 否 | 微信开放标签列表 |
| `timeout` | number | `5000` | 否 | SDK 加载超时时间(ms) |
| `callback.ready` | function | - | 否 | SDK 就绪回调 |
| `callback.success` | function | - | 否 | 分享成功回调 |
| `callback.error` | function | - | 否 | 错误回调 |

## 回调函数

### `callback.ready()`
当微信 SDK 初始化完成且分享配置就绪时触发

### `callback.success(type)`
- `type`: `'timeline'` 或 `'message'`
当朋友圈或好友分享配置成功时触发

### `callback.error(error)`
当发生错误时触发，参数为错误对象

## 注意事项

1. **跨域问题**：确保后端签名接口支持 CORS 或使用代理
2. **URL 一致性**：签名 URL 必须与当前页面 URL 完全一致（不含 hash）
3. **HTTPS**：微信要求所有页面必须使用 HTTPS
4. **开放标签**：使用开放标签需在微信公众平台申请
5. **图标大小**：微信分享图标建议尺寸 200×200 像素

## 后端接口要求

SDK 需要调用后端接口获取微信签名，接口应返回以下格式的 JSON 数据：

```json
{
  "appId": "YOUR_WECHAT_APPID",
  "timestamp": 1620000000,
  "nonceStr": "RANDOM_STRING",
  "signature": "WEIXIN_SIGNATURE"
}
```

## 后端 Express 实现

### 环境要求

1. Node.js 14+
2. Express 4.x
3. Axios 1.x

### 安装依赖

```bash
npm install express axios
```

### 具体实现

```javascript
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

// 缓存 access_token 和 ticket
let cacheToken = null;
let cacheTicket = null;
let tokenExpireTime = 0;
let ticketExpireTime = 0;

// 微信分享签名接口
router.get('/wxShare', async (req, res) => {
  // 微信公众号配置
  const appId = 'appId';
  const appsecret = 'appsecret';
  
  // 获取前端传递的当前页面 URL
  const { url } = req.query;
  
  // 验证参数
  if (!url) {
    return res.status(400).json({
      code: 400,
      message: 'URL参数不能为空'
    });
  }

  try {
    // 检查并刷新 access_token
    const now = Math.floor(Date.now() / 1000);
    if (!cacheToken || now >= tokenExpireTime) {
      const tokenResponse = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appsecret}`
      );
      
      if (tokenResponse.data.errcode) {
        throw new Error(`获取access_token失败: ${tokenResponse.data.errmsg}`);
      }
      
      cacheToken = tokenResponse.data.access_token;
      // 提前10分钟过期
      tokenExpireTime = now + tokenResponse.data.expires_in - 600;
    }

    // 检查并刷新 ticket
    if (!cacheTicket || now >= ticketExpireTime) {
      const ticketResponse = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${cacheToken}&type=jsapi`
      );
      
      if (ticketResponse.data.errcode !== 0) {
        throw new Error(`获取ticket失败: ${ticketResponse.data.errmsg}`);
      }
      
      cacheTicket = ticketResponse.data.ticket;
      // 提前10分钟过期
      ticketExpireTime = now + ticketResponse.data.expires_in - 600;
    }

    // 生成签名
    const nonceStr = generateNonceStr(16);
    const timestamp = Math.floor(Date.now() / 1000);
    
    const signature = generateSignature({
      jsapi_ticket: cacheTicket,
      noncestr: nonceStr,
      timestamp,
      url
    });

    res.json({
      appId,
      nonceStr,
      timestamp,
      signature
    });
    
  } catch (err) {
    console.error('微信分享签名错误:', err);
    
    // 重置缓存
    cacheToken = null;
    cacheTicket = null;
    
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: err.message
    });
  }
});

// 生成随机字符串
function generateNonceStr(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonceStr = '';
  
  for (let i = 0; i < length; i++) {
    nonceStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return nonceStr;
}

// 生成签名
function generateSignature(params) {
  const string = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return crypto.createHash('sha1').update(string).digest('hex');
}

module.exports = router;
```

### 错误响应

```json
{
  "code": 400,
  "message": "URL参数不能为空"
}
```

```json
{
  "code": 500,
  "message": "服务器内部错误",
  "error": "获取access_token失败: invalid appid"
}
```

### 启动服务

在 `app.js` 中集成路由：

```javascript
const express = require('express');
const wxShareRouter = require('./routes/wxShare');

const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api', wxShareRouter);

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('服务器错误');
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
```

## 常见问题

### 1. 签名无效 (invalid signature)

可能原因：
- URL 不一致（前端传入的 URL 必须与当前页面完全一致）
- 时间戳不一致（确保服务器时间准确）
- 签名算法错误（严格按照微信文档实现）

解决方案：
- 验证前端传入的 URL 是否去除 hash 部分
- 检查服务器时间是否同步
- 使用微信官方签名校验工具验证