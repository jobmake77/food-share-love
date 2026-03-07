// subpages/cart/cart.js
const app = getApp()

Page({
  data: {
    cart: [],
    note: '',
    totalCount: 0,
    placing: false,
  },

  onLoad() { this._syncCart() },
  onShow() { this._syncCart() },

  _syncCart() {
    const cart = app.globalData.cart || []
    const totalCount = cart.reduce((sum, i) => sum + i.count, 0)
    this.setData({ cart, totalCount })
  },

  increase(e) {
    const { id } = e.currentTarget.dataset
    const cart = app.globalData.cart || []
    const item = cart.find(i => i.dishId === id)
    if (item) item.count++
    app.globalData.cart = cart
    wx.setStorageSync('cart', cart)  // 持久化
    this._syncCart()
  },

  decrease(e) {
    const { id } = e.currentTarget.dataset
    const cart = app.globalData.cart || []
    const idx = cart.findIndex(i => i.dishId === id)
    if (idx >= 0) {
      cart[idx].count--
      if (cart[idx].count <= 0) cart.splice(idx, 1)
    }
    app.globalData.cart = cart
    wx.setStorageSync('cart', cart)  // 持久化
    this._syncCart()
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  async placeOrder() {
    const db = wx.cloud.database()
    const { cart, note } = this.data
    if (cart.length === 0) return

    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ placing: true })
    try {
      const orderData = {
        dishes: cart.map(item => ({ dishId: item.dishId, name: item.name, count: item.count, image: item.image, emoji: item.emoji })),
        note: note || '',
        status: 'cooking',  // 修复：改为 cooking 以匹配订单页面的筛选逻辑
        orderedBy: userInfo._id,  // 修复：添加点单人ID
        creatorName: userInfo.nickname || '我',
        creatorAvatar: userInfo.avatar || '',
        partnerId: userInfo.partnerId || null,
        createdAt: db.serverDate(),
      }
      const { _id } = await db.collection('orders').add({ data: orderData })
      app.globalData.cart = []
      wx.removeStorageSync('cart')  // 清除本地存储
      wx.navigateTo({ url: `/subpages/order-success/order-success?orderId=${_id}&count=${cart.length}` })
    } catch (e) {
      wx.showToast({ title: '下单失败，请重试', icon: 'error' })
    } finally {
      this.setData({ placing: false })
    }
  },
})
