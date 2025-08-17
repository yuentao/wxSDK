/**
 * 微信分享 SDK 封装
 * @param {Object} options 配置选项
 * @returns {Promise} 返回 Promise 对象
 */
const wxSDK = (options = {}) => {
  return new Promise((resolve, reject) => {
    // 环境检测
    const globalThis = typeof global !== 'undefined' ? global : self
    const w = typeof window !== 'undefined' ? window : globalThis
    if (!w.document) {
      return reject(new Error('wxSDK只能在浏览器环境下使用'))
    }

    // 默认配置
    const defaultConfig = {
      apiUrl: null,
      sdk: 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js',
      title: ['分享至朋友圈', '分享至好友'],
      desc: '万事皆虚，万物皆允',
      shareIcon: `https://src.pandorastudio.cn/favicon.jpg`,
      shareLinks: w.location.href,
      debug: false,
      jsApiList: [],
      openTagList: [],
      timeout: 5000,
      callback: {
        ready: null,
        success: null,
        error: null,
      },
    }

    // 深度合并配置
    const config = {
      ...defaultConfig,
      ...options,
      callback: {
        ...defaultConfig.callback,
        ...(options.callback || {}),
      },
    }

    const { apiUrl, sdk, title, desc, shareLinks, debug, jsApiList, openTagList, callback, timeout } = config

    // 参数校验
    if (!apiUrl) {
      return reject(new Error('apiUrl为必填参数'))
    }

    // 处理分享图标
    let { shareIcon } = config
    try {
      const favicon = document.querySelector('link[rel*="icon"]')
      if (favicon && favicon.href) {
        shareIcon = favicon.href
      }
    } catch (e) {
      console.warn('网站图标检测失败:', e)
    }

    // 常量定义
    const SCRIPT_ID = 'wxShareSDK'
    const BASE_API_LIST = ['updateTimelineShareData', 'updateAppMessageShareData']
    const DEFAULT_OPEN_TAGS = ['wx-open-launch-app']

    // 清理资源
    let scriptTag = document.getElementById(SCRIPT_ID)
    let timeoutId

    const cleanup = () => {
      clearTimeout(timeoutId)
      if (scriptTag) {
        scriptTag.onload = null
        scriptTag.onerror = null
      }
    }

    // 加载微信SDK
    const loadSDK = () => {
      cleanup()

      scriptTag = document.createElement('script')
      scriptTag.id = SCRIPT_ID
      scriptTag.src = sdk
      scriptTag.async = true
      scriptTag.defer = true

      return new Promise((loadResolve, loadReject) => {
        // 加载超时处理
        timeoutId = setTimeout(() => {
          cleanup()
          document.head.removeChild(scriptTag)
          loadReject(new Error(`微信JSSDK加载超时 (${timeout}ms)`))
        }, timeout)

        scriptTag.onload = () => {
          cleanup()
          loadResolve()
        }

        scriptTag.onerror = err => {
          cleanup()
          document.head.removeChild(scriptTag)
          loadReject(new Error('微信JSSDK加载失败'))
        }

        document.head.appendChild(scriptTag)
      })
    }

    // 获取微信签名
    const fetchSignature = async () => {
      const controller = new AbortController()
      const fetchTimeout = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(`${apiUrl}${encodeURIComponent(w.location.href.split('#')[0])}`, {
          signal: controller.signal,
        })

        clearTimeout(fetchTimeout)

        if (!response.ok) {
          throw new Error(`网络请求失败 (${response.status})`)
        }

        const res = await response.json()
        const { appId, timestamp, nonceStr, signature } = res || {}

        if (!appId || !timestamp || !nonceStr || !signature) {
          throw new Error('接口响应格式错误')
        }

        return { appId, timestamp, nonceStr, signature }
      } catch (err) {
        clearTimeout(fetchTimeout)
        throw new Error(`签名接口请求错误: ${err.message}`)
      }
    }

    // 配置微信分享
    const configureWeChat = async () => {
      if (!w.wx || typeof w.wx.config !== 'function') {
        throw new Error('微信JSSDK未正确加载')
      }

      // 获取签名
      const signatureData = await fetchSignature()

      // 准备分享配置
      const timelineConfig = {
        title: Array.isArray(title) ? title[0] : title,
        link: Array.isArray(shareLinks) ? shareLinks[0] : shareLinks.split('#')[0],
        imgUrl: Array.isArray(shareIcon) ? shareIcon[0] : shareIcon,
      }

      const messageConfig = {
        title: Array.isArray(title) ? title[1] : title,
        link: Array.isArray(shareLinks) ? shareLinks[1] : shareLinks.split('#')[0],
        imgUrl: Array.isArray(shareIcon) ? shareIcon[1] : shareIcon,
        desc,
      }

      // 合并API列表
      const fullApiList = [...new Set([...BASE_API_LIST, ...jsApiList])]
      const fullOpenTagList = [...new Set([...DEFAULT_OPEN_TAGS, ...openTagList])]

      // 初始化微信配置
      w.wx.config({
        debug,
        ...signatureData,
        jsApiList: fullApiList,
        openTagList: fullOpenTagList,
      })

      // 返回封装后的wx对象
      return new Promise((wxResolve, wxReject) => {
        w.wx.error(wxReject)

        w.wx.ready(() => {
          const shareOperations = []

          // 配置朋友圈分享
          if (w.wx.updateTimelineShareData) {
            shareOperations.push(
              new Promise(shareResolve => {
                w.wx.updateTimelineShareData({
                  ...timelineConfig,
                  success: () => {
                    callback.success?.('timeline')
                    shareResolve()
                  },
                  fail: err => {
                    callback.error?.(err)
                    shareResolve() // 不阻断流程
                  },
                })
              })
            )
          }

          // 配置好友分享
          if (w.wx.updateAppMessageShareData) {
            shareOperations.push(
              new Promise(shareResolve => {
                w.wx.updateAppMessageShareData({
                  ...messageConfig,
                  success: () => {
                    callback.success?.('message')
                    shareResolve()
                  },
                  fail: err => {
                    callback.error?.(err)
                    shareResolve() // 不阻断流程
                  },
                })
              })
            )
          }

          // 等待所有分享配置完成
          Promise.all(shareOperations)
            .then(() => {
              callback.ready?.()
              wxResolve(w.wx)
            })
            .catch(e => {
              console.error('分享设置部分失败:', e)
              callback.ready?.()
              wxResolve(w.wx) // 仍返回wx对象
            })
        })
      })
    }

    // 主执行流程
    const initialize = async () => {
      try {
        // 加载SDK（如果需要）
        if (!w.wx || typeof w.wx.config !== 'function') {
          if (scriptTag && scriptTag.parentNode) {
            // 等待正在加载的SDK
            await new Promise((resolve, reject) => {
              scriptTag.onload = resolve
              scriptTag.onerror = () => reject(new Error('SDK加载失败'))
            })
          } else {
            await loadSDK()
          }
        }

        // 配置微信功能
        const wxInstance = await configureWeChat()
        resolve(wxInstance)
      } catch (err) {
        callback.error?.(err)
        reject(err)
      }
    }

    // 启动初始化
    initialize()
  })
}

export default wxSDK
