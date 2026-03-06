// pages/order/order.js
const app = getApp()

Page({
  data: {
    orders: [],
    activeFilter: 'pending',
    refreshing: false,
    loading: true,
  },

  onLoad() { this._loadOrders() },
  onShow() { this._loadOrders() },

  async _loadOrders() {
    const db = wx.cloud.database()
    const userInfo = app.globalData.userInfo
    if (!userInfo) return

    this.setData({ loading: true })

    const { activeFilter } = this.data
    try {
      let query
      if (activeFilter === 'pending') {
        query = db.collection('orders').where({ _openid: userInfo.openid, status: 'pending' })
      } else if (activeFilter === 'done') {
        query = db.collection('orders').where({ _openid: userInfo.openid, status: 'done' })
      } else {
        query = db.collection('orders').where({ _openid: userInfo.openid })
      }

      const { data } = await query.orderBy('createdAt', 'desc').limit(50).get()
      const orders = data.map(order => {
        const d = new Date(order.createdAt)
        const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        return { ...order, dateStr }
      })
      this.setData({ orders, refreshing: false, loading: false })
    } catch (e) {
      console.error('加载订单失败', e)
      this.setData({ refreshing: false, loading: false })
    }
  },

  setFilter(e) {
    wx.vibrateShort({ type: 'light' })
    const { filter } = e.currentTarget.dataset
    this.setData({ activeFilter: filter })
    this._loadOrders()
  },

  onRefresh() {
    this.setData({ refreshing: true })
    this._loadOrders()
  },

  async onOrderComplete(e) {
    const db = wx.cloud.database()
    const { orderId } = e.detail
    wx.showModal({
      title: '确认完成',
      content: '确认菜已经做好了吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('orders').doc(orderId).update({
              data: { status: 'done', doneAt: db.serverDate() }
            })
            wx.showToast({ title: '已完成！', icon: 'success' })
            this._loadOrders()
          } catch (e) {
            wx.showToast({ title: '操作失败', icon: 'error' })
          }
        }
      }
    })
  },

  async onOrderReview(e) {
    const db = wx.cloud.database()
    const { orderId } = e.detail
    wx.showModal({
      title: '写下评价',
      editable: true,
      placeholderText: '这顿饭怎么样？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('reviews').add({
              data: { orderId, comment: res.content || '', rating: 5, createdAt: db.serverDate() }
            })
            wx.showToast({ title: '评价成功', icon: 'success' })
          } catch (e) {
            wx.showToast({ title: '评价失败', icon: 'error' })
          }
        }
      }
    })
  },
})
