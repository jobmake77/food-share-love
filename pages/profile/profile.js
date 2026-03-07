// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    myCode: 'LOVE-8F42B1',
    copied: false,
    isBound: true,
    myName: '小明',
    myAvatar: '👨‍🍳',
    partnerName: '小美',
    partnerAvatar: '👩‍🍳',
    partnerCode: 'LOVE-7B23C9',
    daysCount: 42,
    stats: [
      { num: '28', label: '总做菜数' },
    ],
    settingsItems: [
      { icon: '📋', label: '菜单管理', desc: '' },
      { icon: '💬', label: '意见反馈', desc: '' },
      { icon: '🔗', label: '分享给朋友', desc: '' },
      { icon: '⚙️', label: '设置', desc: '' },
    ],
  },

  onLoad() {
    const userInfo = app.globalData.userInfo
    const partnerInfo = app.globalData.partnerInfo

    if (userInfo) {
      // 过滤掉错误的 avatar 值（如果是长字符串ID，使用默认emoji）
      let avatar = userInfo.avatar || '👨‍🍳'
      if (avatar.length > 10) {
        // 如果 avatar 是一个长字符串（可能是ID），使用默认emoji
        avatar = '👨‍🍳'
      }

      this.setData({
        myName: userInfo.nickname || '小明',
        myAvatar: avatar,
        myCode: userInfo.code ? `LOVE-${userInfo.code}` : 'LOVE-8F42B1',
      })
    }

    if (partnerInfo) {
      this.setData({
        partnerName: partnerInfo.nickname || '小美',
        partnerAvatar: partnerInfo.avatar || '👩‍🍳',
        partnerCode: partnerInfo.code ? `LOVE-${partnerInfo.code}` : 'LOVE-7B23C9',
        isBound: true,
      })
    }
  },

  copyCode() {
    wx.vibrateShort({ type: 'light' })
    wx.setClipboardData({
      data: this.data.myCode,
      success: () => {
        this.setData({ copied: true })
        wx.showToast({ title: '已复制', icon: 'success' })
        setTimeout(() => {
          this.setData({ copied: false })
        }, 2000)
      }
    })
  },

  unbindPartner() {
    wx.vibrateShort({ type: 'medium' })
    wx.showModal({
      title: '解绑伙伴',
      content: '确定要解绑吗？解绑后需重新绑定',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          this.setData({ isBound: false })
          wx.showToast({ title: '已解绑', icon: 'success' })
        }
      }
    })
  },

  bindPartner() {
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '绑定功能开发中', icon: 'none' })
  },

  handleSettingTap(e) {
    wx.vibrateShort({ type: 'light' })
    const { label } = e.currentTarget.dataset

    if (label === '菜单管理') {
      wx.navigateTo({ url: '/subpages/category-manage/category-manage' })
    } else if (label === '意见反馈') {
      wx.navigateTo({ url: '/subpages/feedback/feedback' })
    } else if (label === '分享给朋友') {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
      wx.showToast({ title: '点击右上角分享', icon: 'none' })
    } else if (label === '设置') {
      wx.navigateTo({ url: '/subpages/settings/settings' })
    } else {
      wx.showToast({ title: `${label}功能开发中`, icon: 'none' })
    }
  },

  logout() {
    wx.vibrateShort({ type: 'medium' })
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          app.globalData.userInfo = null
          app.globalData.partnerInfo = null
          wx.reLaunch({ url: '/pages/home/home' })
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: `${this.data.myName}邀请你一起用"食物分享爱"`,
      path: '/pages/home/home',
    }
  },

  onShareTimeline() {
    return {
      title: '食物分享爱 - 情侣专属点餐小程序',
    }
  },
})
