// pages/profile/profile.js
const app = getApp()
const { fetchAll } = require('../../utils/db.js')
const { filterAvatar } = require('../../utils/avatar.js')

Page({
  data: {
    myCode: '',
    copied: false,
    isBound: false,
    myName: '',
    myAvatar: '👨‍🍳',
    partnerName: '',
    partnerAvatar: '👩‍🍳',
    partnerCode: '',
    daysCount: 0,
    bindCodeInput: '',
    binding: false,
    pendingRequests: [],
    loadingRequests: false,
    stats: [
      { num: '0', label: '总做菜数' },
    ],
    settingsItems: [
      { icon: '📋', label: '菜单管理', desc: '' },
      { icon: '💬', label: '意见反馈', desc: '' },
      { icon: '🔗', label: '分享给朋友', desc: '' },
      { icon: '⚙️', label: '设置', desc: '' },
    ],
  },

  onLoad() {
    this.loadProfileData()
  },

  onShow() {
    this.loadProfileData()
    this.loadBindRequests()
  },

  async loadProfileData() {
    await app.refreshUserInfo()
    const userInfo = await app.waitForUserInfo()
    if (!userInfo) return

    let daysCount = 0
    if (userInfo.createdAt) {
      const startDate = new Date(userInfo.createdAt)
      const now = new Date()
      daysCount = Math.max(1, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1)
    }

    const partnerInfo = await app.loadPartnerInfo()

    this.setData({
      myName: userInfo.nickname || '小明',
      myAvatar: filterAvatar(userInfo.avatar, '👨‍🍳'),
      myCode: userInfo.code ? `LOVE-${userInfo.code}` : '',
      isBound: !!userInfo.partnerId,
      daysCount,
      partnerName: partnerInfo ? (partnerInfo.nickname || '小美') : '',
      partnerAvatar: filterAvatar(partnerInfo?.avatar, '👩‍🍳'),
      partnerCode: partnerInfo && partnerInfo.code ? `LOVE-${partnerInfo.code}` : ''
    })
  },

  async loadBindRequests() {
    this.setData({ loadingRequests: true })
    try {
      const db = wx.cloud.database()
      const userInfo = await app.waitForUserInfo()
      if (!userInfo) return

      const requests = await fetchAll((skip, limit) => db.collection('bind_requests')
        .where({ targetId: userInfo._id })
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(limit)
        .get())

      this.setData({ pendingRequests: requests })
    } catch (e) {
      console.error('加载绑定请求失败', e)
    } finally {
      this.setData({ loadingRequests: false })
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
      success: async (res) => {
        if (!res.confirm) return
        try {
          wx.showLoading({ title: '解绑中...' })
          const result = await wx.cloud.callFunction({
            name: 'bindPartner',
            data: { action: 'unbind' }
          })

          wx.hideLoading()
          if (result.result && result.result.success) {
            app.globalData.partnerInfo = null
            if (result.result.userInfo) {
              app.globalData.userInfo = result.result.userInfo
              app.globalData.originalUserInfo = result.result.userInfo
            } else if (app.globalData.userInfo) {
              app.globalData.userInfo.partnerId = null
            }
            this.setData({
              isBound: false,
              partnerName: '',
              partnerAvatar: '👩‍🍳',
              partnerCode: ''
            })
            this.loadBindRequests()
            wx.showToast({ title: result.result.message || '已解绑', icon: 'success' })
          } else {
            wx.showToast({ title: result.result.error || '解绑失败', icon: 'none' })
          }
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '解绑失败', icon: 'none' })
        }
      }
    })
  },

  onBindCodeInput(e) {
    this.setData({ bindCodeInput: e.detail.value })
  },

  async bindPartner() {
    if (this.data.binding) return
    wx.vibrateShort({ type: 'light' })
    const rawCode = (this.data.bindCodeInput || '').trim().toUpperCase()
    const partnerCode = rawCode.replace(/^LOVE-/, '')

    if (!partnerCode) {
      wx.showToast({ title: '请输入识别码', icon: 'none' })
      return
    }

    this.setData({ binding: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'bindPartner',
        data: { partnerCode }
      })

      if (res.result && res.result.success) {
        wx.showToast({ title: res.result.message || '请求已发送', icon: 'success' })
        this.setData({ bindCodeInput: '' })
      } else {
        wx.showToast({ title: res.result.error || '发送失败', icon: 'none' })
      }
    } catch (e) {
      console.error('发送绑定请求失败', e)
      wx.showToast({ title: '发送失败，请重试', icon: 'none' })
    } finally {
      this.setData({ binding: false })
    }
  },

  async acceptBindRequest(e) {
    const { id } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'light' })
    if (!id) return

    try {
      wx.showLoading({ title: '确认中...' })
      const res = await wx.cloud.callFunction({
        name: 'bindPartner',
        data: { action: 'accept', requestId: id }
      })
      wx.hideLoading()

      if (res.result && res.result.success) {
        app.globalData.partnerInfo = res.result.partnerInfo || null
        if (res.result.userInfo) {
          app.globalData.userInfo = res.result.userInfo
          app.globalData.originalUserInfo = res.result.userInfo
        } else if (app.globalData.userInfo) {
          app.globalData.userInfo.partnerId = res.result.partnerInfo ? res.result.partnerInfo._id : null
        }
        this.setData({
          isBound: !!res.result.partnerInfo,
          partnerName: res.result.partnerInfo ? (res.result.partnerInfo.nickname || '小美') : '',
          partnerAvatar: filterAvatar(res.result.partnerInfo?.avatar, '👩‍🍳'),
          partnerCode: res.result.partnerInfo && res.result.partnerInfo.code ? `LOVE-${res.result.partnerInfo.code}` : ''
        })
        this.loadBindRequests()
        wx.showToast({ title: res.result.message || '绑定成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.result.error || '绑定失败', icon: 'none' })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async rejectBindRequest(e) {
    const { id } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'light' })
    if (!id) return

    try {
      wx.showLoading({ title: '处理中...' })
      const res = await wx.cloud.callFunction({
        name: 'bindPartner',
        data: { action: 'reject', requestId: id }
      })
      wx.hideLoading()
      if (res.result && res.result.success) {
        this.loadBindRequests()
        wx.showToast({ title: res.result.message || '已拒绝', icon: 'success' })
      } else {
        wx.showToast({ title: res.result.error || '操作失败', icon: 'none' })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
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
          app.globalData.originalUserInfo = null
          app.userInfoReadyCallbacks = []
          wx.reLaunch({ url: '/pages/login/login' })
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
