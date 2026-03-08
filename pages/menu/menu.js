// pages/menu/menu.js
const app = getApp()
const { fetchAll } = require('../../utils/db.js')

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
    isFirstLoad: true, // 标记是否首次加载
  },

  async onLoad() {
    await app.waitForUserInfo()
    await app.loadPartnerInfo()
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
      const _ = db.command
      const openids = await app.getCoupleOpenIds()
      console.log('菜单页-加载分类, openids:', openids)

      if (openids.length === 0) {
        this.setData({ categories: [], activeCategory: '' })
        return
      }
      const whereCondition = { _openid: _.in(openids) }

      const categories = await fetchAll((skip, limit) => db.collection('categories')
        .where(whereCondition)
        .orderBy('sort', 'asc')
        .skip(skip)
        .limit(limit)
        .get())

      console.log('菜单页-加载到的分类数量:', categories.length)
      if (categories.length > 0) {
        console.log('菜单页-分类列表:', categories.map(c => ({ name: c.name, id: c._id, openid: c._openid })))
      }

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
      const _ = db.command
      const openids = await app.getCoupleOpenIds()
      console.log('菜单页-加载菜品, openids:', openids)

      if (openids.length === 0) {
        this.setData({ allDishes: [], filteredDishes: [] })
        return
      }
      const whereCondition = { _openid: _.in(openids) }

      const dishes = await fetchAll((skip, limit) => db.collection('dishes')
        .where(whereCondition)
        .skip(skip)
        .limit(limit)
        .get())

      console.log('菜单页-加载到的菜品数量:', dishes.length)
      if (dishes.length > 0) {
        console.log('菜单页-前3道菜品:', dishes.slice(0, 3).map(d => ({ name: d.name, categoryId: d.categoryId, openid: d._openid })))
      }

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

  async onShow() {
    // 首次加载时跳过（onLoad 已经加载过了）
    if (this.data.isFirstLoad) {
      this.setData({ isFirstLoad: false })
      this._checkTodayChef()
      return
    }

    // 非首次进入时重新加载数据（从其他页面返回时）
    await this.loadCategories()
    await this.loadDishes()
    if (this.data.categories.length > 0 && this.data.allDishes.length > 0) {
      this.filterDishes()
    }
    this._checkTodayChef()
  },

  async _checkTodayChef() {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      const userInfo = await app.waitForUserInfo()
      const partnerInfo = await app.loadPartnerInfo()
      const openids = await app.getCoupleOpenIds()

      if (!userInfo || !partnerInfo || openids.length === 0) {
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
          _openid: _.in(openids),
          createdAt: _.gte(today).and(_.lt(tomorrow))
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
    const newCount = (cart[id] || 0) + Number(delta)

    if (newCount <= 0) {
      delete cart[id]
    } else {
      cart[id] = newCount
    }

    const totalCount = Object.values(cart).reduce((sum, n) => sum + n, 0)
    this.setData({ cart, totalCount })

    // 同步到全局
    app.globalData.cart = Object.entries(cart)
      .map(([dishId, count]) => {
        const dish = this.data.allDishes.find(d => d._id == dishId)
        if (!dish) return null
        return {
          dishId,
          name: dish.name,
          count,
          emoji: dish.emoji,
          image: dish.image
        }
      })
      .filter(Boolean)

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
