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

## 注意事项

1. **跨域问题**：确保后端签名接口支持 CORS 或使用代理
2. **URL 一致性**：签名 URL 必须与当前页面 URL 完全一致（不含 hash）
3. **HTTPS**：微信要求所有页面必须使用 HTTPS
4. **开放标签**：使用开放标签需在微信公众平台申请
5. **图标大小**：微信分享图标建议尺寸 200×200 像素