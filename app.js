// app.js
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
    this.globalData.cart = wx.getStorageSync('cart') || []
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
      success: res => {
        if (res.result && res.result.success && res.result.userInfo) {
          this.applyUserState(res.result.userInfo, res.result.partnerInfo, { forcePartnerSync: true })
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
      this.notifyUserInfoReady(userInfo)
    }

    return this.globalData.userInfo
  },

  clearUserState() {
    this.globalData.userInfo = null
    this.globalData.partnerInfo = null
    this.globalData.originalUserInfo = null
    this.userInfoReadyCallbacks = []
  },

  async refreshUserInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login'
      })

      if (res.result && res.result.success && res.result.userInfo) {
        return this.applyUserState(res.result.userInfo, res.result.partnerInfo, { forcePartnerSync: true })
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
        this.applyUserState(res.result.userInfo, res.result.partnerInfo, { forcePartnerSync: true })
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

  globalData: {
    userInfo: null,
    partnerInfo: null,
    originalUserInfo: null, // 保存原始用户信息
    cart: [],
    isTestMode: false, // 测试模式标记
    currentRole: 'self', // 当前角色：'self' 或 'partner'
  }
})
