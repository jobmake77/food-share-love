// subpages/settings/settings.js
const app = getApp()
const { resolveAvatar, isImageSource } = require('../../utils/avatar.js')

Page({
  data: {
    avatar: '',
    avatarEmoji: '👨‍🍳',
    nickname: '',
  },

  async onLoad() {
    await this.syncUserInfo()
  },

  async syncUserInfo() {
    await app.refreshUserInfo()
    const userInfo = await app.waitForUserInfo()
    if (!userInfo) return

    const avatarState = resolveAvatar(userInfo.avatar, '👨‍🍳')
    this.setData({
      avatar: avatarState.image || (isImageSource(userInfo.avatar) ? userInfo.avatar : ''),
      avatarEmoji: avatarState.emoji,
      nickname: userInfo.nickname || '',
    })
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
    const trimmedNickname = nickname.trim()

    if (!nickname || trimmedNickname === '') {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...', mask: true })

    try {
      const success = await app.updateUserInfo({
        nickName: trimmedNickname,
        avatarUrl: avatar
      }, null)

      if (!success) {
        throw new Error('资料更新失败')
      }

      const nextUserInfo = {
        ...(app.globalData.userInfo || {}),
        nickname: trimmedNickname,
        avatar
      }
      app.globalData.userInfo = nextUserInfo
      app.globalData.originalUserInfo = nextUserInfo

      wx.hideLoading()
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1200,
        success: () => {
          setTimeout(() => {
            wx.navigateBack()
          }, 1200)
        }
      })
    } catch (e) {
      console.error('保存设置失败', e)
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },
})
