// pages/menu/menu.js
const app = getApp()

Page({
  data: {
    partnerInfo: null,
    categories: [],
    dishes: [],
    activeCategoryIndex: 0,
    cartMap: {}, // { dishId: count }
    cartCount: 0,
    editMode: false,
    loading: true,
  },

  onLoad() {
    this._loadCategories()
  },

  onShow() {
    const cart = app.globalData.cart || []
    const cartMap = {}
    let cartCount = 0
    cart.forEach(item => {
      cartMap[item.dishId] = item.count
      cartCount += item.count
    })
    this.setData({ cartMap, cartCount, partnerInfo: app.globalData.partnerInfo })
  },

  async _loadCategories() {
    const db = wx.cloud.database()
    try {
      const { data } = await db.collection('categories')
        .orderBy('sort', 'asc')
        .get()
      const categories = [{ _id: 'all', name: '全部' }, ...data]
      this.setData({ categories, activeCategoryIndex: 0 })
      this._loadDishes()
    } catch (e) {
      console.error('加载分类失败', e)
      this.setData({ loading: false })
    }
  },

  async _loadDishes() {
    const db = wx.cloud.database()
    const { categories, activeCategoryIndex } = this.data
    const category = categories[activeCategoryIndex]
    if (!category) return

    this.setData({ loading: true })

    try {
      let query = db.collection('dishes').orderBy('sort', 'asc')
      if (category._id !== 'all') {
        query = query.where({ categoryId: category._id })
      }
      const { data } = await query.get()
      this.setData({ dishes: data, loading: false })
    } catch (e) {
      console.error('加载菜品失败', e)
      this.setData({ loading: false })
    }
  },

  switchCategory(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ activeCategoryIndex: index })
    this._loadDishes()
  },

  increaseCount(e) {
    const { id, dish } = e.currentTarget.dataset
    const { cartMap } = this.data
    const newCount = (cartMap[id] || 0) + 1
    cartMap[id] = newCount
    this._syncCart(id, dish, newCount)
    this.setData({
      [`cartMap.${id}`]: newCount,
      cartCount: this._calcCartCount(cartMap),
    })
  },

  decreaseCount(e) {
    const { id } = e.currentTarget.dataset
    const { cartMap, dishes } = this.data
    const newCount = Math.max(0, (cartMap[id] || 0) - 1)
    if (newCount === 0) {
      delete cartMap[id]
    } else {
      cartMap[id] = newCount
    }
    const dish = dishes.find(d => d._id === id)
    this._syncCart(id, dish, newCount)
    this.setData({
      cartMap: { ...cartMap },
      cartCount: this._calcCartCount(cartMap),
    })
  },

  _calcCartCount(cartMap) {
    return Object.values(cartMap).reduce((sum, n) => sum + n, 0)
  },

  _syncCart(dishId, dish, count) {
    const cart = app.globalData.cart || []
    const idx = cart.findIndex(i => i.dishId === dishId)
    if (count <= 0) {
      if (idx >= 0) cart.splice(idx, 1)
    } else if (idx >= 0) {
      cart[idx].count = count
    } else {
      cart.push({ dishId, name: dish.name, count, image: dish.image || '' })
    }
    app.globalData.cart = cart
  },

  toggleEditMode() {
    this.setData({ editMode: !this.data.editMode })
  },

  addCategory() {
    const db = wx.cloud.database()
    wx.showModal({
      title: '新增分类',
      editable: true,
      placeholderText: '请输入分类名称',
      success: async (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim()
          if (!name) return
          try {
            await db.collection('categories').add({ data: { name, sort: Date.now() } })
            wx.showToast({ title: '新增成功', icon: 'success' })
            this._loadCategories()
          } catch (e) {
            wx.showToast({ title: '新增失败', icon: 'error' })
          }
        }
      }
    })
  },

  async deleteCategory(e) {
    const db = wx.cloud.database()
    const { id } = e.currentTarget.dataset
    if (id === 'all') return
    wx.showModal({
      title: '确认删除',
      content: '删除分类不会删除菜品',
      success: async (res) => {
        if (res.confirm) {
          await db.collection('categories').doc(id).remove()
          wx.showToast({ title: '已删除', icon: 'success' })
          this._loadCategories()
        }
      }
    })
  },

  goAddDish() {
    wx.vibrateShort({ type: 'light' })
    const { categories, activeCategoryIndex } = this.data
    const cat = categories[activeCategoryIndex]
    wx.navigateTo({
      url: `/subpages/edit-dish/edit-dish?categoryId=${cat && cat._id !== 'all' ? cat._id : ''}`
    })
  },

  editDish(e) {
    wx.vibrateShort({ type: 'light' })
    const dish = e.currentTarget.dataset.dish
    wx.navigateTo({ url: `/subpages/edit-dish/edit-dish?dishId=${dish._id}` })
  },

  goCart() {
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/subpages/cart/cart' })
  },
})
