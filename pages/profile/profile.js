// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    partnerInfo: null,
    partnerCode: '',
    binding: false,
    showDevMode: true, // 开发模式开关，上线前改为 false
    creatingTest: false,
    authLoading: false, // 授权中
    bindRequests: [], // 待确认的绑定请求
  },

  async onLoad() {
    await this._loadBindRequests()
  },

  async onShow() {
    this.setData({
      userInfo: app.globalData.userInfo || {},
      partnerInfo: app.globalData.partnerInfo || null,
    })
    await this._loadBindRequests()
  },

  // 分享小程序
  onShareAppMessage() {
    const userInfo = app.globalData.userInfo
    return {
      title: `${userInfo?.nickname || '我'}邀请你一起用"食物分享爱"`,
      path: '/pages/home/home',
      imageUrl: '' // 可以添加分享封面图
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '食物分享爱 - 情侣专属点餐小程序',
      query: '',
      imageUrl: ''
    }
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const db = wx.cloud.database()
        const tempFile = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })
        try {
          const cloudPath = `avatars/${app.globalData.userInfo._id}_${Date.now()}.jpg`
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFile })
          await db.collection('users').doc(app.globalData.userInfo._id).update({
            data: { avatar: uploadRes.fileID }
          })
          app.globalData.userInfo.avatar = uploadRes.fileID
          this.setData({ 'userInfo.avatar': uploadRes.fileID })
          wx.showToast({ title: '头像已更新', icon: 'success' })
        } catch (e) {
          wx.showToast({ title: '上传失败', icon: 'error' })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.userInfo.nickname || '',
      success: async (res) => {
        const db = wx.cloud.database()
        if (res.confirm && res.content) {
          const nickname = res.content.trim()
          if (!nickname) return
          await db.collection('users').doc(app.globalData.userInfo._id).update({ data: { nickname } })
          app.globalData.userInfo.nickname = nickname
          this.setData({ 'userInfo.nickname': nickname })
          wx.showToast({ title: '昵称已更新', icon: 'success' })
        }
      }
    })
  },

  copyCode() {
    wx.vibrateShort({ type: 'light' })
    wx.setClipboardData({
      data: this.data.userInfo.code,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  // 微信授权更新资料
  async handleWechatAuth() {
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

      wx.showLoading({ title: '更新中...', mask: true })

      const success = await app.updateUserInfo(userInfo)

      wx.hideLoading()

      if (success) {
        wx.showToast({
          title: '资料已更新',
          icon: 'success'
        })
        // 刷新页面数据
        this.setData({
          userInfo: app.globalData.userInfo,
          authLoading: false
        })
      } else {
        wx.showToast({
          title: '更新失败，请重试',
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

  onPartnerCodeInput(e) {
    this.setData({ partnerCode: e.detail.value.toUpperCase() })
  },

  async bindPartner() {
    const { partnerCode } = this.data
    if (!partnerCode || partnerCode.length !== 6) {
      wx.showToast({ title: '请输入6位识别码', icon: 'none' })
      return
    }

    wx.vibrateShort({ type: 'medium' })
    this.setData({ binding: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'bindPartner',
        data: { partnerCode }
      })

      if (res.result.success) {
        this.setData({ partnerCode: '' })
        wx.showToast({
          title: res.result.message || '绑定请求已发送',
          icon: 'success'
        })
      } else {
        wx.showToast({ title: res.result.error, icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '绑定失败', icon: 'error' })
      console.error('bindPartner error', e)
    } finally {
      this.setData({ binding: false })
    }
  },

  async unbindPartner() {
    wx.showModal({
      title: '解绑伙伴',
      content: '确定要解绑吗？解绑后需重新绑定',
      confirmColor: '#FF3B30',
      success: async (res) => {
        const db = wx.cloud.database()
        if (res.confirm) {
          try {
            await db.collection('users').doc(app.globalData.userInfo._id).update({ data: { partnerId: null } })
            app.globalData.partnerInfo = null
            app.globalData.userInfo.partnerId = null
            this.setData({ partnerInfo: null })
            wx.showToast({ title: '已解绑', icon: 'success' })
          } catch (e) {
            wx.showToast({ title: '解绑失败', icon: 'error' })
          }
        }
      }
    })
  },

  // 创建测试伙伴（仅用于开发测试）
  async createTestPartner() {
    wx.showModal({
      title: '创建测试伙伴',
      content: '将创建一个虚拟伙伴账号并自动完成绑定，创建后可以切换身份进行测试',
      success: async (res) => {
        if (!res.confirm) return

        this.setData({ creatingTest: true })
        const db = wx.cloud.database()

        try {
          // 生成随机识别码
          const generateCode = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            let code = ''
            for (let i = 0; i < 6; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return code
          }

          const currentUserId = app.globalData.userInfo._id

          // 创建虚拟伙伴账号（先不设置 partnerId）
          const testPartner = {
            openid: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            code: generateCode(),
            nickname: '测试伙伴',
            avatar: '',
            createdAt: db.serverDate(),
            isTestAccount: true, // 标记为测试账号
          }

          // 添加到数据库
          const addRes = await db.collection('users').add({ data: testPartner })
          testPartner._id = addRes._id

          // 双向绑定：更新当前用户的 partnerId
          await db.collection('users').doc(currentUserId).update({
            data: { partnerId: testPartner._id }
          })

          // 双向绑定：更新测试伙伴的 partnerId
          await db.collection('users').doc(testPartner._id).update({
            data: { partnerId: currentUserId }
          })

          // 更新全局数据
          testPartner.partnerId = currentUserId
          app.globalData.partnerInfo = testPartner
          app.globalData.userInfo.partnerId = testPartner._id
          if (app.globalData.originalUserInfo) {
            app.globalData.originalUserInfo.partnerId = testPartner._id
          }
          app.globalData.isTestMode = true // 开启测试模式

          this.setData({
            partnerInfo: testPartner,
            userInfo: app.globalData.userInfo
          })

          wx.showToast({ title: '测试伙伴创建成功！', icon: 'success', duration: 2000 })

          // 提示可以切换身份
          setTimeout(() => {
            wx.showModal({
              title: '提示',
              content: '测试伙伴已创建！现在可以在个人页顶部切换身份进行测试',
              showCancel: false
            })
          }, 2000)
        } catch (e) {
          console.error('创建测试伙伴失败', e)
          wx.showToast({ title: '创建失败', icon: 'error' })
        } finally {
          this.setData({ creatingTest: false })
        }
      }
    })
  },

  // 切换测试身份
  switchRole() {
    wx.vibrateShort({ type: 'light' })

    const success = app.switchTestRole()
    if (!success) {
      wx.showToast({ title: '请先创建测试伙伴', icon: 'none' })
      return
    }

    const currentRole = app.globalData.currentRole
    const roleName = currentRole === 'self' ? '你' : '测试伙伴'

    this.setData({
      userInfo: app.globalData.userInfo,
      partnerInfo: app.globalData.partnerInfo
    })

    wx.showToast({
      title: `已切换到：${roleName}`,
      icon: 'success'
    })

    // 刷新所有 tab 页面
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/home/home' })
    }, 1000)
  },

  goMenuManage() {
    wx.vibrateShort({ type: 'light' })
    wx.switchTab({ url: '/pages/menu/menu' })
  },

  goImportSample() {
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/subpages/import-sample/import-sample' })
  },

  goImportMenu() {
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/subpages/import-menu/import-menu' })
  },

  goFeedback() {
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/subpages/feedback/feedback' })
  },

  async exportMenu() {
    const db = wx.cloud.database()
    try {
      const [catRes, dishRes] = await Promise.all([
        db.collection('categories').get(),
        db.collection('dishes').get(),
      ])
      const exportData = { categories: catRes.data, dishes: dishRes.data, exportedAt: new Date().toISOString() }
      wx.setClipboardData({
        data: JSON.stringify(exportData, null, 2),
        success: () => wx.showToast({ title: '菜单已复制到剪贴板', icon: 'none' })
      })
    } catch (e) {
      wx.showToast({ title: '导出失败', icon: 'error' })
    }
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          app.globalData.userInfo = null
          app.globalData.partnerInfo = null
          app.globalData.cart = []
          wx.reLaunch({ url: '/pages/home/home' })
        }
      }
    })
  },

  // 加载绑定请求
  async _loadBindRequests() {
    if (!app.globalData.userInfo) return

    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('bind_requests')
        .where({
          targetId: app.globalData.userInfo._id,
          status: 'pending'
        })
        .orderBy('createdAt', 'desc')
        .get()

      this.setData({ bindRequests: data })
    } catch (e) {
      console.error('加载绑定请求失败', e)
    }
  },

  // 接受绑定请求
  async acceptBindRequest(e) {
    const { requestId } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'medium' })

    wx.showLoading({ title: '处理中...', mask: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'bindPartner',
        data: {
          action: 'accept',
          requestId
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({ title: res.result.message, icon: 'success' })

        // 更新全局数据
        app.globalData.partnerInfo = res.result.partnerInfo

        // 重新加载页面数据
        this.setData({
          partnerInfo: res.result.partnerInfo
        })
        await this._loadBindRequests()
      } else {
        wx.showToast({ title: res.result.error, icon: 'error' })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'error' })
      console.error('接受绑定请求失败', e)
    }
  },

  // 拒绝绑定请求
  async rejectBindRequest(e) {
    const { requestId } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'light' })

    wx.showModal({
      title: '拒绝绑定',
      content: '确定要拒绝这个绑定请求吗？',
      confirmColor: '#FF3B30',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true })

          try {
            const result = await wx.cloud.callFunction({
              name: 'bindPartner',
              data: {
                action: 'reject',
                requestId
              }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({ title: result.result.message, icon: 'success' })
              await this._loadBindRequests()
            } else {
              wx.showToast({ title: result.result.error, icon: 'error' })
            }
          } catch (e) {
            wx.hideLoading()
            wx.showToast({ title: '操作失败', icon: 'error' })
            console.error('拒绝绑定请求失败', e)
          }
        }
      }
    })
  },
})
