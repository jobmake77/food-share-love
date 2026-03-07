// pages/menu/menu.js
const app = getApp()

Page({
  data: {
    chefName: '待定',
    searchQuery: '',
    categories: [
      { name: '家常菜' },
      { name: '快手菜' },
      { name: '汤羹' },
      { name: '甜品' },
      { name: '饮品' },
    ],
    activeCategory: '家常菜',
    allDishes: [
      { id: 1, name: '番茄炒蛋', category: '家常菜', emoji: '🍳', desc: '经典家常，酸甜可口', difficulty: '简单' },
      { id: 2, name: '红烧排骨', category: '家常菜', emoji: '🍖', desc: '浓油赤酱，入口即化', difficulty: '中等' },
      { id: 3, name: '酸辣土豆丝', category: '快手菜', emoji: '🥔', desc: '爽脆开胃，下饭神器', difficulty: '简单' },
      { id: 4, name: '紫菜蛋花汤', category: '汤羹', emoji: '🥣', desc: '鲜美清淡，暖心暖胃', difficulty: '简单' },
      { id: 5, name: '芒果布丁', category: '甜品', emoji: '🍮', desc: '丝滑香甜，恋爱的味道', difficulty: '简单' },
      { id: 6, name: '可乐鸡翅', category: '家常菜', emoji: '🍗', desc: '甜咸交织，一学就会', difficulty: '简单' },
      { id: 7, name: '蜜桃冰茶', category: '饮品', emoji: '🍑', desc: '清爽解暑，甜蜜满分', difficulty: '简单' },
      { id: 8, name: '糖醋里脊', category: '家常菜', emoji: '🥩', desc: '外酥里嫩，酸甜适中', difficulty: '中等' },
      { id: 9, name: '蒜蓉西兰花', category: '快手菜', emoji: '🥦', desc: '清爽健康，简单美味', difficulty: '简单' },
      { id: 10, name: '南瓜粥', category: '汤羹', emoji: '🎃', desc: '香甜软糯，养胃佳品', difficulty: '简单' },
    ],
    filteredDishes: [],
    cart: {},
    totalCount: 0,
  },

  onLoad() {
    this.filterDishes()
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
    let filtered = allDishes.filter(d => d.category === activeCategory)
    if (searchQuery) {
      filtered = filtered.filter(d => d.name.includes(searchQuery))
    }
    this.setData({ filteredDishes: filtered })
  },

  switchCategory(e) {
    wx.vibrateShort({ type: 'light' })
    const { category } = e.currentTarget.dataset
    this.setData({ activeCategory: category }, () => {
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
      const dish = this.data.allDishes.find(d => d.id == dishId)
      return { dishId, name: dish.name, count, emoji: dish.emoji }
    })
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
