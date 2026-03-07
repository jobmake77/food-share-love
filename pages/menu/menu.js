// pages/menu/menu.js
const app = getApp()

Page({
  data: {
    chefName: '待定',
    searchQuery: '',
    categories: [],
    activeCategory: '',
    allDishes: [],
    filteredDishes: [],
    cart: {},
    totalCount: 0,
  },

  async onLoad() {
    // 串行加载，确保分类先加载完成
    await this.loadCategories()
    await this.loadDishes()
    // 两者都完成后统一过滤
    if (this.data.categories.length > 0 && this.data.allDishes.length > 0) {
      this.filterDishes()
    }
  },

  async loadCategories() {
    try {
      const db = wx.cloud.database()
      const { data: categories } = await db.collection('categories')
        .orderBy('sort', 'asc')
        .get()

      if (categories && categories.length > 0) {
        this.setData({
          categories,
          activeCategory: categories[0]._id
        })
      } else {
        this.setData({ categories: [] })
        wx.showToast({ title: '暂无分类', icon: 'none' })
      }
    } catch (e) {
      console.error('加载分类失败', e)
      wx.showToast({ title: '加载分类失败', icon: 'none' })
    }
  },

  async loadDishes() {
    try {
      const db = wx.cloud.database()
      const { data: dishes } = await db.collection('dishes')
        .get()

      this.setData({ allDishes: dishes })

      // 如果没有菜品，提示用户
      if (dishes.length === 0) {
        wx.showToast({ title: '暂无菜品，请先添加', icon: 'none' })
      }
    } catch (e) {
      console.error('加载菜品失败', e)
      wx.showToast({ title: '加载菜品失败，请重试', icon: 'none' })
      this.setData({ allDishes: [] })
    }
  },

  onShow() {
    this._checkTodayChef()
  },

  async _checkTodayChef() {
    try {
      const db = wx.cloud.database()
      const userInfo = app.globalData.userInfo
      const partnerInfo = app.globalData.partnerInfo

      if (!userInfo || !partnerInfo) {
        this.setData({ chefName: '待定' })
        return
      }

      // 查询今天的订单
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: orders } = await db.collection('orders')
        .where({
          createdAt: db.command.gte(today).and(db.command.lt(tomorrow))
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()

      if (orders && orders.length > 0) {
        // 有订单，掌勺人是对方
        const order = orders[0]
        const chefName = order.orderedBy === userInfo._id ? partnerInfo.nickname : userInfo.nickname
        this.setData({ chefName })
      } else {
        // 没有订单
        this.setData({ chefName: '待定' })
      }
    } catch (e) {
      console.error('查询今日订单失败', e)
      this.setData({ chefName: '待定' })
    }
  },

  filterDishes() {
    const { allDishes, activeCategory, searchQuery } = this.data
    let filtered = allDishes.filter(d => d.categoryId === activeCategory)
    if (searchQuery) {
      filtered = filtered.filter(d => d.name.includes(searchQuery))
    }
    this.setData({ filteredDishes: filtered })
  },

  switchCategory(e) {
    wx.vibrateShort({ type: 'light' })
    const { categoryId } = e.currentTarget.dataset
    this.setData({ activeCategory: categoryId }, () => {
      this.filterDishes()
    })
  },

  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterDishes()
    })
  },

  updateCart(e) {
    wx.vibrateShort({ type: 'light' })
    const { id, delta } = e.currentTarget.dataset
    const { cart } = this.data
    const newCount = (cart[id] || 0) + parseInt(delta)

    if (newCount <= 0) {
      delete cart[id]
    } else {
      cart[id] = newCount
    }

    const totalCount = Object.values(cart).reduce((sum, n) => sum + n, 0)
    this.setData({ cart, totalCount })

    // 同步到全局
    app.globalData.cart = Object.entries(cart).map(([dishId, count]) => {
      const dish = this.data.allDishes.find(d => d._id == dishId)
      return {
        dishId,
        name: dish.name,
        count,
        emoji: dish.emoji,
        image: dish.image  // 修复：添加 image 字段
      }
    })

    // 持久化到本地存储
    wx.setStorageSync('cart', app.globalData.cart)
  },

  goCart() {
    wx.vibrateShort({ type: 'light' })
    if (this.data.totalCount === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/subpages/cart/cart' })
  },
})
