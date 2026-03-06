// pages/home/home.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    partnerInfo: null,
    greeting: '',
    loaded: false,
    needAuth: false, // 是否需要授权
    authLoading: false, // 授权中
  },

  onLoad() {
    this._setGreeting()
  },

  onShow() {
    this._loadData()
  },

  _setGreeting() {
    const hour = new Date().getHours()
    let greeting = '早上好 ☀️'
    if (hour >= 12 && hour < 14) greeting = '中午好 🍱'
    else if (hour >= 14 && hour < 18) greeting = '下午好 ☕'
    else if (hour >= 18) greeting = '晚上好 🌙'
    this.setData({ greeting })
  },

  async _loadData() {
    const db = wx.cloud.database()
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      // 等待登录完成
      app.userInfoReadyCallback = (info) => {
        this._loadData()
      }
      return
    }

    // 检查是否需要授权（昵称为默认值或以"用户"开头，且头像为空）
    const needAuth = (userInfo.nickname === '美食爱好者' || userInfo.nickname.startsWith('用户')) && !userInfo.avatar
    this.setData({ userInfo, loaded: true, needAuth })

    // 加载伙伴信息
    if (userInfo.partnerId) {
      try {
        const { data } = await db.collection('users').doc(userInfo.partnerId).get()
        app.globalData.partnerInfo = data
        this.setData({ partnerInfo: data })
      } catch (e) {
        console.error('获取伙伴信息失败', e)
      }
    }
  },

  // 用户授权
  async handleAuth() {
    // 防止重复点击
    if (this.data.authLoading) {
      return
    }

    wx.vibrateShort({ type: 'light' })
    this.setData({ authLoading: true })

    try {
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      })

      wx.showLoading({ title: '登录中...', mask: true })

      const success = await app.updateUserInfo(userInfo, null)

      wx.hideLoading()

      if (success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        // 直接更新页面状态，显示主界面
        this.setData({
          userInfo: app.globalData.userInfo,
          needAuth: false,
          authLoading: false
        })

        // 加载伙伴信息
        this._loadPartnerInfo()
      } else {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        })
        this.setData({ authLoading: false })
      }
    } catch (err) {
      console.error('授权失败', err)
      wx.hideLoading()
      this.setData({ authLoading: false })

      // 处理不同的错误情况
      if (err.errMsg) {
        if (err.errMsg.includes('cancel')) {
          wx.showToast({
            title: '已取消授权',
            icon: 'none'
          })
        } else if (err.errMsg.includes('frequently')) {
          wx.showModal({
            title: '提示',
            content: '操作过于频繁，请稍后再试',
            showCancel: false
          })
        } else {
          wx.showToast({
            title: '授权失败，请重试',
            icon: 'none'
          })
        }
      }
    }
  },

  // 加载伙伴信息
  async _loadPartnerInfo() {
    const userInfo = app.globalData.userInfo
    if (userInfo && userInfo.partnerId) {
      try {
        const db = wx.cloud.database()
        const { data } = await db.collection('users').doc(userInfo.partnerId).get()
        app.globalData.partnerInfo = data
        this.setData({ partnerInfo: data })
      } catch (e) {
        console.error('获取伙伴信息失败', e)
      }
    }
  },

  // 跳过授权，使用默认信息
  skipAuth() {
    wx.vibrateShort({ type: 'light' })
    wx.showModal({
      title: '提示',
      content: '跳过授权后将使用默认昵称和头像，你可以稍后在个人页重新授权',
      confirmText: '确定跳过',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({ needAuth: false })
        }
      }
    })
  },

  goOrder() {
    wx.vibrateShort({ type: 'light' })
    wx.switchTab({ url: '/pages/menu/menu' })
  },

  goGame() {
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/subpages/game/game' })
  },

  goProfile() {
    wx.vibrateShort({ type: 'light' })
    wx.switchTab({ url: '/pages/profile/profile' })
  },
})
