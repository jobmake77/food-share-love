// pages/login/login.js
const app = getApp()

Page({
  data: {
    loading: false,
    isColdStart: false, // 是否是冷启动（静默登录场景）
    agreed: false,
  },

  onLoad() {
    // 已登录直接跳首页
    if (app.globalData.userInfo) {
      this._goHome()
      return
    }
    // 冷启动：_login() 正在后台执行，等它完成后自动跳转
    this.setData({ isColdStart: true })
    app.waitForUserInfo().then(userInfo => {
      if (userInfo) this._goHome()
    })
  },

  onShow() {
    // reLaunch 到登录页（退出场景）：userInfo 已清空，直接展示，不做任何跳转
    if (app.globalData.userInfo) {
      this._goHome()
    }
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

      wx.showLoading({ title: '登录中...', mask: true })

      const success = await app.updateUserInfo(wxUserInfo, null)

      wx.hideLoading()

      if (success) {
        wx.vibrateShort({ type: 'medium' })
        this._goHome()
      } else {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })

      if (err.errMsg && err.errMsg.includes('cancel')) return
      if (err.errMsg && err.errMsg.includes('frequently')) {
        wx.showModal({ title: '操作过于频繁', content: '请稍后再试', showCancel: false })
        return
      }
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  showPrivacy() {
    wx.showModal({
      title: '用户协议与隐私政策',
      content: '本应用仅收集必要的微信账号信息（昵称、头像）用于个人身份识别，不会泄露给第三方。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  _goHome() {
    wx.switchTab({ url: '/pages/home/home' })
  },
})
