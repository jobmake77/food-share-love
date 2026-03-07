// subpages/edit-dish/edit-dish.js
const app = getApp()

Page({
  data: {
    isEdit: false,
    dish: { name: '', desc: '', image: '', categoryId: '', sort: 0, emoji: '' },
    categories: [],
    categoryIndex: 0,
    saving: false,
    showEmojiModal: false,
    emojiGroups: [
      { name: '肉类', emojis: ['🍖', '🍗', '🥩', '🥓', '🍤', '🦐', '🦞', '🐟', '🐠', '🦀'] },
      { name: '蔬菜', emojis: ['🥬', '🥦', '🥔', '🥕', '🌽', '🥒', '🍅', '🥑', '🍆', '🌶️'] },
      { name: '主食', emojis: ['🍚', '🍜', '🍝', '🍞', '🥐', '🥖', '🥯', '🥞', '🧇', '🍕'] },
      { name: '汤羹', emojis: ['🥣', '🍲', '🥘', '🍱', '🍛', '🍜', '🥟', '🥠', '🥡', '🦪'] },
      { name: '甜品', emojis: ['🍮', '🍰', '🎂', '🧁', '🍪', '🍩', '🍨', '🍦', '🍡', '🥧'] },
      { name: '饮品', emojis: ['🍵', '☕', '🥤', '🧃', '🧋', '🍹', '🍸', '🥛', '🍺', '🧉'] },
      { name: '其他', emojis: ['🍳', '🥗', '🌮', '🌯', '🥙', '🥪', '🍔', '🌭', '🥨', '🍿'] }
    ],
  },

  async onLoad(options) {
    await this._loadCategories()

    if (options.dishId) {
      const db = wx.cloud.database()
      this.setData({ isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑菜品' })
      try {
        const { data } = await db.collection('dishes').doc(options.dishId).get()
        const catIndex = this.data.categories.findIndex(c => c._id === data.categoryId)
        this.setData({ dish: data, categoryIndex: catIndex >= 0 ? catIndex : 0 })
      } catch (e) {
        wx.showToast({ title: '加载失败', icon: 'error' })
      }
    } else if (options.categoryId) {
      const catIndex = this.data.categories.findIndex(c => c._id === options.categoryId)
      this.setData({ 'dish.categoryId': options.categoryId, categoryIndex: catIndex >= 0 ? catIndex : 0 })
    }
  },

  async _loadCategories() {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('categories').orderBy('sort', 'asc').get()
      this.setData({ categories: data.length > 0 ? data : [{ _id: '', name: '未分类' }] })
    } catch (e) {
      console.error('加载分类失败', e)
    }
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const tempFile = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })
        try {
          const cloudPath = `dishes/${Date.now()}.jpg`
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFile })
          this.setData({ 'dish.image': uploadRes.fileID })
        } catch (e) {
          wx.showToast({ title: '上传失败', icon: 'error' })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  onNameInput(e) { this.setData({ 'dish.name': e.detail.value }) },
  onDescInput(e) { this.setData({ 'dish.desc': e.detail.value }) },

  onCategoryChange(e) {
    const index = e.detail.value
    const cat = this.data.categories[index]
    this.setData({ categoryIndex: index, 'dish.categoryId': cat._id })
  },

  async saveDish() {
    const db = wx.cloud.database()
    const { dish, isEdit, categories, categoryIndex } = this.data
    if (!dish.name.trim()) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' })
      return
    }
    const cat = categories[categoryIndex]
    const dishData = {
      name: dish.name.trim(),
      desc: dish.desc || '',
      image: dish.image || '',
      categoryId: cat ? cat._id : '',
      sort: dish.sort || Date.now(),
      emoji: dish.emoji || '',
    }
    this.setData({ saving: true })
    try {
      if (isEdit) {
        await db.collection('dishes').doc(dish._id).update({ data: dishData })
        wx.showToast({ title: '保存成功', icon: 'success' })
      } else {
        await db.collection('dishes').add({ data: dishData })
        wx.showToast({ title: '添加成功', icon: 'success' })
      }
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'error' })
    } finally {
      this.setData({ saving: false })
    }
  },

  showEmojiPicker() {
    this.setData({ showEmojiModal: true })
  },

  hideEmojiPicker() {
    this.setData({ showEmojiModal: false })
  },

  stopPropagation() {
    // 阻止事件冒泡，防止点击弹窗内容时关闭弹窗
  },

  selectEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    this.setData({
      'dish.emoji': emoji,
      showEmojiModal: false
    })
  },

  async deleteDish() {
    wx.showModal({
      title: '删除菜品',
      content: '确定要删除这道菜吗？',
      confirmColor: '#FF3B30',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          try {
            // 使用云函数删除，避免权限问题
            const result = await wx.cloud.callFunction({
              name: 'deleteDish',
              data: { dishId: this.data.dish._id }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({ title: '已删除', icon: 'success' })
              setTimeout(() => wx.navigateBack(), 1000)
            } else {
              wx.showToast({ title: result.result.error || '删除失败', icon: 'none' })
            }
          } catch (e) {
            wx.hideLoading()
            console.error('删除菜品失败', e)
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  },
})
