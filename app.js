// app.js
App({
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
    this.globalData = {
      cart: wx.getStorageSync('cart') || []
    }
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
        if (res.result && res.result.success) {
          this.globalData.userInfo = res.result.userInfo
          this.globalData.originalUserInfo = res.result.userInfo // 保存原始用户信息
          // 通知所有等待用户信息的页面
          if (this.userInfoReadyCallback) {
            this.userInfoReadyCallback(res.result.userInfo)
          }
        }
      },
      fail: err => {
        console.error('登录失败', err)
      }
    })
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

      if (res.result && res.result.success) {
        this.globalData.userInfo = res.result.userInfo
        this.globalData.originalUserInfo = res.result.userInfo
        // 通知所有等待用户信息的页面
        if (this.userInfoReadyCallback) {
          this.userInfoReadyCallback(res.result.userInfo)
        }
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
