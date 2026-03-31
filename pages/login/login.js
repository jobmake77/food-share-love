const app = getApp()

Page({
  data: {
    loading: false,
    isColdStart: false,
    agreed: false,
    loginStep: 'profile',
    pendingUserProfile: null,
    phoneRequiredNotice: '',
  },

  onLoad() {
    if (app.hasCompletedLogin()) {
      this._goHome()
      return
    }

    this.setData({ isColdStart: true })
    app.waitForUserInfo().then(userInfo => {
      this._syncLoginStep(userInfo)
      if (app.hasCompletedLogin(userInfo)) {
        this._goHome()
      }
    })
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    this._syncLoginStep(userInfo)

    if (app.hasCompletedLogin(userInfo)) {
      this._goHome()
    }
  },

  _syncLoginStep(userInfo) {
    if (userInfo && !userInfo.phone) {
      this.setData({
        loginStep: 'phone',
        pendingUserProfile: null,
        phoneRequiredNotice: '还差一步，需完成手机号授权后才能进入小程序。'
      })
      return
    }

    this.setData({
      loginStep: 'profile',
      phoneRequiredNotice: ''
    })
  },

  async handleLogin() {
    if (this.data.loading) return
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意用户协议', icon: 'none', duration: 2000 })
      return
    }

    wx.vibrateShort({ type: 'light' })
    this.setData({ loading: true })

    try {
      const { userInfo: wxUserInfo } = await wx.getUserProfile({
        desc: '用于完善你的个人资料'
      })

      this.setData({
        loading: false,
        loginStep: 'phone',
        pendingUserProfile: wxUserInfo,
        phoneRequiredNotice: '请授权当前微信绑定的手机号，完成账号登录。'
      })
    } catch (err) {
      this.setData({ loading: false })

      if (err.errMsg && err.errMsg.includes('cancel')) return
      if (err.errMsg && err.errMsg.includes('frequently')) {
        wx.showModal({ title: '操作过于频繁', content: '请稍后再试', showCancel: false })
        return
      }
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  },

  async handleGetPhoneNumber(e) {
    if (this.data.loading || !this.data.agreed) return

    const { code, errMsg } = e.detail || {}
    if (errMsg !== 'getPhoneNumber:ok' || !code) {
      if (errMsg && errMsg.includes('deny')) {
        wx.showToast({ title: '需授权手机号后才能继续', icon: 'none' })
      } else {
        wx.showToast({ title: '手机号授权失败，请重试', icon: 'none' })
      }
      return
    }

    this.setData({ loading: true })
    wx.showLoading({ title: '登录中...', mask: true })

    try {
      const success = await app.updateUserInfo(this.data.pendingUserProfile, code)
      wx.hideLoading()

      if (success && app.hasCompletedLogin()) {
        wx.vibrateShort({ type: 'medium' })
        this._goHome()
      } else {
        wx.showToast({ title: '手机号授权失败，请重试', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  showPrivacy() {
    wx.showModal({
      title: '用户协议与隐私政策',
      content: '本应用仅收集必要的微信账号信息（昵称、头像、手机号）用于情侣身份识别与账号找回，不会泄露给第三方。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  _goHome() {
    wx.switchTab({ url: '/pages/home/home' })
  },
})
