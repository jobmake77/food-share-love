// subpages/feedback/feedback.js
Page({
  data: {
    content: '',
    contact: '',
    submitting: false,
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value })
  },

  async submitFeedback() {
    const { content, contact } = this.data

    if (!content.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      })
      return
    }

    wx.vibrateShort({ type: 'medium' })
    this.setData({ submitting: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'sendFeedback',
        data: {
          content: content.trim(),
          contact: contact.trim()
        }
      })

      if (res.result.success) {
        wx.showToast({
          title: '反馈已提交，感谢！',
          icon: 'success',
          duration: 2000
        })

        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
      } else {
        wx.showToast({
          title: res.result.error || '提交失败',
          icon: 'error'
        })
        this.setData({ submitting: false })
      }
    } catch (e) {
      console.error('提交反馈失败', e)
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'error'
      })
      this.setData({ submitting: false })
    }
  },
})
