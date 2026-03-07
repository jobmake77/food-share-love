// subpages/category-manage/category-manage.js
const app = getApp()

Page({
  data: {
    categories: [],
    showDialog: false,
    dialogMode: 'add', // 'add' or 'edit'
    currentCategory: null,
    formData: {
      name: '',
      icon: '🍽️',
      sort: 0
    },
    emojiList: ['🍚', '🍖', '🥬', '🍲', '🍰', '🍜', '🥗', '🍕', '🍔', '🌮', '🍱', '🍛', '🍝', '🥘', '🍳', '🥞', '🧇', '🥓', '🍗', '🍤', '🦐', '🦞', '🦀', '🐟', '🥩', '🍖', '🥙', '🌯', '🥪', '🌭', '🍟', '🍕', '🥟', '🍙', '🍘', '🍥', '🥠', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊']
  },

  onLoad() {
    this.loadCategories()
  },

  async loadCategories() {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
      const { data: categories } = await db.collection('categories')
        .orderBy('sort', 'asc')
        .get()

      // 获取每个分类下的菜品数量
      for (let category of categories) {
        const { total } = await db.collection('dishes')
          .where({ categoryId: category._id })
          .count()
        category.dishCount = total
      }

      this.setData({ categories })
    } catch (e) {
      console.error('加载分类失败', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  showAddDialog() {
    wx.vibrateShort({ type: 'light' })
    const maxSort = this.data.categories.length > 0
      ? Math.max(...this.data.categories.map(c => c.sort))
      : 0
    this.setData({
      showDialog: true,
      dialogMode: 'add',
      currentCategory: null,
      formData: {
        name: '',
        icon: '🍽️',
        sort: maxSort + 1
      }
    })
  },

  showEditDialog(e) {
    wx.vibrateShort({ type: 'light' })
    const { category } = e.currentTarget.dataset
    this.setData({
      showDialog: true,
      dialogMode: 'edit',
      currentCategory: category,
      formData: {
        name: category.name,
        icon: category.icon,
        sort: category.sort
      }
    })
  },

  closeDialog() {
    wx.vibrateShort({ type: 'light' })
    this.setData({ showDialog: false })
  },

  stopPropagation() {
    // 阻止事件冒泡到遮罩层
  },

  onNameInput(e) {
    this.setData({ 'formData.name': e.detail.value })
  },

  onSortInput(e) {
    this.setData({ 'formData.sort': parseInt(e.detail.value) || 0 })
  },

  selectEmoji(e) {
    wx.vibrateShort({ type: 'light' })
    const { emoji } = e.currentTarget.dataset
    this.setData({ 'formData.icon': emoji })
  },

  async saveCategory() {
    const { formData, dialogMode, currentCategory } = this.data

    if (!formData.name.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    try {
      const db = wx.cloud.database()

      if (dialogMode === 'add') {
        await db.collection('categories').add({
          data: {
            name: formData.name.trim(),
            icon: formData.icon,
            sort: formData.sort
          }
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
      } else {
        await db.collection('categories').doc(currentCategory._id).update({
          data: {
            name: formData.name.trim(),
            icon: formData.icon,
            sort: formData.sort
          }
        })
        wx.showToast({ title: '更新成功', icon: 'success' })
      }

      this.setData({ showDialog: false })
      this.loadCategories()
    } catch (e) {
      console.error('保存分类失败', e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  deleteCategory(e) {
    wx.vibrateShort({ type: 'medium' })
    const { category } = e.currentTarget.dataset

    if (category.dishCount > 0) {
      wx.showModal({
        title: '无法删除',
        content: `该分类下有 ${category.dishCount} 道菜品，请先删除或移动菜品`,
        showCancel: false,
        confirmColor: '#F27D5E'
      })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除分类"${category.name}"吗？`,
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          try {
            const db = wx.cloud.database()
            await db.collection('categories').doc(category._id).remove()
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadCategories()
          } catch (e) {
            console.error('删除分类失败', e)
            wx.showToast({ title: '删除失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  goToDishManage() {
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/subpages/edit-dish/edit-dish' })
  },

  goToDataManage() {
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/subpages/import-sample/import-sample' })
  }
})

