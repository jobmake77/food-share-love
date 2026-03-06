// subpages/order-success/order-success.js
Page({
  data: {
    orderId: '',
    dishes: [],
    note: '',
  },

  async onLoad(options) {
    const db = wx.cloud.database()
    const { orderId } = options
    if (!orderId) return

    this.setData({ orderId })
    try {
      const { data } = await db.collection('orders').doc(orderId).get()
      this.setData({ dishes: data.dishes, note: data.note || '' })
    } catch (e) {
      console.error('加载订单失败', e)
    }
  },

  goOrders() { wx.switchTab({ url: '/pages/order/order' }) },
  goHome() { wx.switchTab({ url: '/pages/home/home' }) },
})
