// app.js
const { isImageSource } = require('./utils/avatar.js')

App({
  userInfoReadyCallbacks: [],
  onLaunch() {
    // 性能优化：启用被动事件监听
    wx.setEnableDebug({ enableDebug: false })

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-1gyl0lph122c729a',
        traceUser: true,
      })
    }

    // 初始化全局数据，从本地存储恢复购物车
    this.syncCartState(wx.getStorageSync('cart') || [])
    this._login()

    // 性能监控
    this._setupPerformanceMonitor()
  },

  _setupPerformanceMonitor() {
    // 监听页面性能
    const performance = wx.getPerformance()
    const observer = performance.createObserver((entryList) => {
      // 可以在这里记录性能数据
    })
    observer.observe({ entryTypes: ['navigation', 'render', 'script'] })
  },

  _login() {
    // 静默登录，只获取 openid
    wx.cloud.callFunction({
      name: 'login',
      success: async res => {
        if (res.result && res.result.success && res.result.userInfo) {
          await this.handleSessionResult(res.result.userInfo, res.result.partnerInfo)
        }
      },
      fail: err => {
        console.error('登录失败', err)
      }
    })
  },

  waitForUserInfo() {
    if (this.globalData.userInfo) {
      return Promise.resolve(this.globalData.userInfo)
    }
    return new Promise(resolve => {
      if (!this.userInfoReadyCallbacks) {
        this.userInfoReadyCallbacks = []
      }
      this.userInfoReadyCallbacks.push(resolve)
    })
  },

  notifyUserInfoReady(userInfo) {
    if (this.userInfoReadyCallback) {
      this.userInfoReadyCallback(userInfo)
    }
    if (this.userInfoReadyCallbacks && this.userInfoReadyCallbacks.length > 0) {
      this.userInfoReadyCallbacks.forEach(callback => callback(userInfo))
      this.userInfoReadyCallbacks = []
    }
  },

  isCloudFileId(value) {
    return typeof value === 'string' && value.startsWith('cloud://')
  },

  async resolveFileSource(src) {
    if (!src || typeof src !== 'string') return ''
    if (!this.isCloudFileId(src)) return isImageSource(src) ? src : ''

    const cache = this.globalData.fileUrlCache || {}
    if (cache[src]) return cache[src]

    try {
      const { fileList } = await wx.cloud.getTempFileURL({
        fileList: [src]
      })
      const tempUrl = fileList && fileList[0] && fileList[0].tempFileURL
      if (tempUrl) {
        this.globalData.fileUrlCache[src] = tempUrl
        return tempUrl
      }
    } catch (error) {
      console.error('解析云文件地址失败', src, error)
    }

    return ''
  },

  async enrichUserProfile(profile) {
    if (!profile) return null
    const avatarDisplay = await this.resolveFileSource(profile.avatar)
    return {
      ...profile,
      avatarDisplay: avatarDisplay || (isImageSource(profile.avatar) ? profile.avatar : '')
    }
  },

  async handleSessionResult(userInfo, partnerInfo) {
    const nextUserInfo = await this.enrichUserProfile(userInfo)
    const nextPartnerInfo = partnerInfo === undefined
      ? undefined
      : await this.enrichUserProfile(partnerInfo)
    return this.applyUserState(nextUserInfo, nextPartnerInfo, { forcePartnerSync: true })
  },

  applyUserState(userInfo, partnerInfo, options = {}) {
    const { forcePartnerSync = false } = options
    const prevPartnerId = this.globalData.userInfo?.partnerId || null

    this.globalData.userInfo = userInfo || null
    this.globalData.originalUserInfo = userInfo || null

    if (!userInfo || !userInfo.partnerId) {
      this.globalData.partnerInfo = null
    } else if (forcePartnerSync || partnerInfo !== undefined) {
      this.globalData.partnerInfo = partnerInfo || null
    } else if (prevPartnerId !== (userInfo.partnerId || null)) {
      this.globalData.partnerInfo = null
    }

    if (userInfo) {
      this.globalData.manualLogout = false
      this.notifyUserInfoReady(userInfo)
    }

    return this.globalData.userInfo
  },

  hasCompletedLogin(userInfo = this.globalData.userInfo) {
    return !!(userInfo && userInfo._id)
  },

  clearUserState() {
    this.globalData.userInfo = null
    this.globalData.partnerInfo = null
    this.globalData.originalUserInfo = null
    this.userInfoReadyCallbacks = []
    this.globalData.fileUrlCache = {}
    this.globalData.manualLogout = true
    this.clearCartState()
  },

  async refreshUserInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login'
      })

      if (res.result && res.result.success && res.result.userInfo) {
        return await this.handleSessionResult(res.result.userInfo, res.result.partnerInfo)
      }
    } catch (err) {
      console.error('刷新用户信息失败', err)
    }

    return this.globalData.userInfo
  },

  async loadPartnerInfo() {
    const userInfo = await this.waitForUserInfo()
    if (!userInfo || !userInfo.partnerId) {
      this.globalData.partnerInfo = null
      return null
    }

    // 已有缓存且 ID 匹配，直接返回
    if (this.globalData.partnerInfo && this.globalData.partnerInfo._id === userInfo.partnerId) {
      return this.globalData.partnerInfo
    }

    // 通过 refreshUserInfo 触发云函数重新拉取（云函数内无权限限制）
    await this.refreshUserInfo()
    return this.globalData.partnerInfo || null
  },

  async getCoupleOpenIds() {
    const userInfo = await this.waitForUserInfo()
    if (!userInfo) return []

    const openids = []
    // 修复：使用 openid 而不是 _openid
    if (userInfo.openid) openids.push(userInfo.openid)

    const partnerInfo = await this.loadPartnerInfo()
    if (partnerInfo && partnerInfo.openid && !openids.includes(partnerInfo.openid)) {
      openids.push(partnerInfo.openid)
    }

    return openids
  },

  // 用户授权后更新用户信息
  async updateUserInfo(userProfile, phoneCode) {
    try {
      const data = {}
      if (userProfile) {
        data.nickname = userProfile.nickName
        data.avatar = userProfile.avatarUrl
      }
      if (phoneCode) {
        data.phoneCode = phoneCode
      }

      const res = await wx.cloud.callFunction({
        name: 'login',
        data
      })

      if (res.result && res.result.success && res.result.userInfo) {
        await this.handleSessionResult(res.result.userInfo, res.result.partnerInfo)
        return true
      }
      return false
    } catch (err) {
      console.error('更新用户信息失败', err)
      return false
    }
  },

  // 切换测试身份
  switchTestRole() {
    if (!this.globalData.isTestMode) return false

    const currentRole = this.globalData.currentRole
    if (currentRole === 'self') {
      // 切换到伙伴身份
      this.globalData.currentRole = 'partner'
      // 交换 userInfo 和 partnerInfo
      const temp = this.globalData.userInfo
      this.globalData.userInfo = this.globalData.partnerInfo
      this.globalData.partnerInfo = temp
    } else {
      // 切换回自己
      this.globalData.currentRole = 'self'
      // 交换回来
      const temp = this.globalData.userInfo
      this.globalData.userInfo = this.globalData.partnerInfo
      this.globalData.partnerInfo = temp
    }

    return true
  },

  // 获取当前用户信息
  getCurrentUser() {
    return this.globalData.userInfo
  },

  // 获取伙伴信息
  getPartner() {
    return this.globalData.partnerInfo
  },

  getCartState() {
    const cart = wx.getStorageSync('cart') || this.globalData.cart || []
    this.globalData.cart = Array.isArray(cart) ? cart : []
    return this.globalData.cart
  },

  syncCartState(cartItems = []) {
    const nextCart = Array.isArray(cartItems) ? cartItems : []
    this.globalData.cart = nextCart
    wx.setStorageSync('cart', nextCart)
    return nextCart
  },

  clearCartState() {
    this.globalData.cart = []
    wx.removeStorageSync('cart')
    return []
  },

  globalData: {
    userInfo: null,
    partnerInfo: null,
    originalUserInfo: null, // 保存原始用户信息
    cart: [],
    fileUrlCache: {},
    manualLogout: false,
    isTestMode: false, // 测试模式标记
    currentRole: 'self', // 当前角色：'self' 或 'partner'
  }
})
