/**
 * 微信分享 SDK 封装
 * @param {Object} options 配置选项
 * @returns {Promise} 返回 Promise 对象
 */
const wxSDK = (options = {}) => {
  return new Promise((resolve, reject) => {
    // 环境检测
    const w = typeof window !== 'undefined' ? window : self
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

    // 合并配置（深度合并回调函数）
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
      return reject(new Error('apiUrl is required'))
    }

    // 处理分享图标（使用 let 声明）
    let { shareIcon } = config
    try {
      const favicon = document.querySelector('link[rel="shortcut icon"], link[rel="icon"]')
      if (favicon && favicon.href) {
        shareIcon = favicon.href
      }
    } catch (e) {
      console.warn('Favicon detection failed:', e)
    }

    // SDK 加载管理
    const scriptId = 'Pd_share'
    let scriptTag = document.getElementById(scriptId)
    let loadTimeout

    const cleanup = () => {
      clearTimeout(loadTimeout)
      scriptTag.onload = null
      scriptTag.onerror = null
    }

    const loadSDK = () => {
      cleanup()

      scriptTag = document.createElement('script')
      scriptTag.id = scriptId
      scriptTag.src = sdk
      scriptTag.async = true
      scriptTag.defer = true

      // 超时处理
      loadTimeout = setTimeout(() => {
        cleanup()
        document.head.removeChild(scriptTag)
        reject(new Error(`微信JSSDK加载超时 ${timeout}ms`))
      }, timeout)

      scriptTag.onload = () => {
        cleanup()
        initWeChat()
      }

      scriptTag.onerror = err => {
        cleanup()
        document.head.removeChild(scriptTag)
        reject(new Error('微信JSSDK加载错误'))
      }

      document.head.appendChild(scriptTag)
    }

    // 微信初始化
    const initWeChat = () => {
      if (!w.wx) {
        return reject(new Error('微信JSSDK加载不正确'))
      }

      // 参数处理
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

      // API 列表处理
      const baseApiList = ['updateTimelineShareData', 'updateAppMessageShareData']
      const fullApiList = [...new Set([...baseApiList, ...jsApiList])]
      const fullOpenTagList = ['wx-open-launch-app', ...openTagList]

      // 获取签名
      fetch(`${apiUrl}${w.location.href.split('#')[0]}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`网络请求失败 (${response.status})`)
          }
          return response.json()
        })
        .then(res => {
          const { appId, timestamp, nonceStr, signature } = res || {}
          if (!appId || !timestamp || !nonceStr || !signature) {
            throw new Error('接口响应格式错误')
          }

          // 微信配置
          w.wx.config({
            debug,
            appId,
            timestamp,
            nonceStr,
            signature,
            jsApiList: fullApiList,
            openTagList: fullOpenTagList,
          })

          w.wx.error(err => {
            callback.error?.(err)
            reject(err)
          })

          w.wx.ready(() => {
            try {
              const shareOperations = []

              // 朋友圈分享
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

              // 好友分享
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
                  resolve(w.wx)
                })
                .catch(e => {
                  console.error('分享设置失败:', e)
                  callback.ready?.()
                  resolve(w.wx) // 仍返回wx对象
                })
            } catch (e) {
              reject(e)
            }
          })
        })
        .catch(err => {
          reject(new Error(`签名接口请求错误: ${err.message}`))
        })
    }

    // 加载SDK
    if (typeof w.wx === 'object' && w.wx.config) {
      // 已加载SDK
      initWeChat()
    } else if (scriptTag) {
      // 正在加载中
      scriptTag.onload = initWeChat
      scriptTag.onerror = err => {
        cleanup()
        reject(new Error('微信JSSDK加载失败'))
      }
    } else {
      // 全新加载
      loadSDK()
    }
  })
}

export default wxSDK
