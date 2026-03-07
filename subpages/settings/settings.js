// subpages/settings/settings.js
const app = getApp()

Page({
  data: {
    avatar: '',
    avatarEmoji: '👨‍🍳',
    nickname: '',
  },

  onLoad() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({
        avatar: userInfo.avatar || '',
        avatarEmoji: userInfo.avatarEmoji || '👨‍🍳',
        nickname: userInfo.nickname || '',
      })
    }
  },

  chooseAvatar() {
    wx.vibrateShort({ type: 'light' })
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadAvatar(tempFilePath)
      }
    })
  },

  async uploadAvatar(filePath) {
    wx.showLoading({ title: '上传中...', mask: true })

    try {
      // 上传到云存储
      const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const result = await wx.cloud.uploadFile({
        cloudPath,
        filePath,
      })

      this.setData({ avatar: result.fileID })
      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
    } catch (e) {
      console.error('上传头像失败', e)
      wx.hideLoading()
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  async saveSettings() {
    wx.vibrateShort({ type: 'medium' })

    const { avatar, nickname } = this.data

    if (!nickname || nickname.trim() === '') {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...', mask: true })

    try {
      const db = wx.cloud.database()
      const userInfo = app.globalData.userInfo

      // 更新数据库
      await db.collection('users').doc(userInfo._id).update({
        data: {
          avatar,
          nickname: nickname.trim(),
        }
      })

      // 更新全局数据
      app.globalData.userInfo.avatar = avatar
      app.globalData.userInfo.nickname = nickname.trim()

      wx.hideLoading()
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            wx.navigateBack()
          }, 2000)
        }
      })
    } catch (e) {
      console.error('保存设置失败', e)
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },
})
