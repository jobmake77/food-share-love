const { fetchAll } = require('../../utils/db.js')

Page({
  data: {
    categories: [],        // 分类列表
    allDishes: [],        // 所有菜品
    filteredDishes: [],   // 过滤后的菜品
    activeCategory: '',   // 当前选中的分类ID（空表示全部）
    searchQuery: '',      // 搜索关键词
    loading: false
  },

  async onLoad() {
    await this.loadCategories()
    await this.loadDishes()
  },

  async onShow() {
    // 从编辑页面返回时刷新列表
    if (this.data.allDishes.length > 0) {
      await this.loadDishes()
    }
  },

  async loadCategories() {
    const db = wx.cloud.database()
    const _ = db.command
    const app = getApp()
    const openids = await app.getCoupleOpenIds()

    const categories = await fetchAll((skip, limit) =>
      db.collection('categories')
        .where({ _openid: _.in(openids) })
        .orderBy('sort', 'asc')
        .skip(skip)
        .limit(limit)
        .get()
    )

    this.setData({ categories })
  },

  async loadDishes() {
    this.setData({ loading: true })
    const db = wx.cloud.database()
    const _ = db.command
    const app = getApp()
    const openids = await app.getCoupleOpenIds()

    const dishes = await fetchAll((skip, limit) =>
      db.collection('dishes')
        .where({ _openid: _.in(openids) })
        .skip(skip)
        .limit(limit)
        .get()
    )

    this.setData({
      allDishes: dishes,
      loading: false
    })
    this.filterDishes()
  },

  filterDishes() {
    let { allDishes, activeCategory, searchQuery } = this.data
    let filtered = allDishes

    // 按分类筛选
    if (activeCategory) {
      filtered = filtered.filter(d => d.categoryId === activeCategory)
    }

    // 按搜索关键词筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(query) ||
        (d.desc && d.desc.toLowerCase().includes(query))
      )
    }

    this.setData({ filteredDishes: filtered })
  },

  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value })
    this.filterDishes()
  },

  switchCategory(e) {
    const { id } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'light' })
    this.setData({ activeCategory: id })
    this.filterDishes()
  },

  addDish() {
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/subpages/edit-dish/edit-dish' })
  },

  editDish(e) {
    const { id } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: `/subpages/edit-dish/edit-dish?dishId=${id}` })
  },

  async deleteDish(e) {
    const { id, name } = e.currentTarget.dataset

    const result = await wx.showModal({
      title: '确认删除',
      content: `确定要删除「${name}」吗？此操作不可恢复。`
    })

    if (!result.confirm) return

    wx.vibrateShort({ type: 'medium' })
    wx.showLoading({ title: '删除中...' })

    try {
      await wx.cloud.callFunction({
        name: 'deleteDish',
        data: { dishId: id }
      })

      wx.showToast({ title: '删除成功', icon: 'success' })
      await this.loadDishes()
    } catch (e) {
      console.error('删除失败', e)
      wx.showToast({ title: '删除失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onPullDownRefresh() {
    this.loadDishes().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})
