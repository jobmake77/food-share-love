const app = getApp()

Page({
  data: {
    loading: false,
    agreed: false,
    canAutoEnter: true,
  },

  onLoad() {
    this.syncEntryState()
  },

  onShow() {
    this.syncEntryState()
  },

  syncEntryState() {
    const canAutoEnter = !app.globalData.manualLogout
    this.setData({ canAutoEnter })
  },

  async enterMiniProgram() {
    if (this.data.loading) return
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意用户协议', icon: 'none', duration: 2000 })
      return
    }

    wx.vibrateShort({ type: 'light' })
    this.setData({ loading: true })

    try {
      const userInfo = await app.refreshUserInfo()
      if (app.hasCompletedLogin(userInfo)) {
        wx.vibrateShort({ type: 'medium' })
        this._goHome()
        return
      }

      wx.showToast({ title: '进入失败，请重试', icon: 'none' })
    } catch (error) {
      console.error('进入小程序失败', error)
      wx.showToast({ title: '进入失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  showPrivacy() {
    wx.showModal({
      title: '用户协议与隐私政策',
      content: '本应用基于当前微信身份识别用户，用于情侣绑定、菜单共享、订单同步等功能；头像昵称可由用户后续自行补充或修改。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  _goHome() {
    wx.switchTab({ url: '/pages/home/home' })
  },
})
