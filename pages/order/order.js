// pages/order/order.js
const app = getApp()
const { fetchAll } = require('../../utils/db.js')

Page({
  data: {
    activeTab: '全部',
    orders: [],
    filteredOrders: [],
    showRatingModal: false,
    currentOrderId: null,
    tempRating: 5,
    tempReview: '',
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    // 从其他页面返回时刷新订单列表
    if (this.data.orders.length > 0) {
      this.loadOrders()
    }
  },

  async loadOrders() {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
      const _ = db.command

      await app.waitForUserInfo()
      await app.loadPartnerInfo()

      const openids = await app.getCoupleOpenIds()
      if (openids.length === 0) {
        this.setData({ orders: [], filteredOrders: [] })
        return
      }

      const whereCondition = { _openid: _.in(openids) }

      const data = await fetchAll((skip, limit) => db.collection('orders')
        .where(whereCondition)
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(limit)
        .get())

      // 格式化订单数据
      const formattedOrders = data.map(order => ({
        id: order._id,
        dishes: order.dishes.map(d => d.name),
        status: order.status,
        time: this.formatTime(order.createdAt),
        chef: order.creatorName,
        note: order.note || '',
        rating: order.rating || 0,
        review: order.review || '',
        _raw: order  // 保存原始数据用于更新
      }))

      this.setData({ orders: formattedOrders })
      this.filterOrders()
    } catch (e) {
      console.error('加载订单失败:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  formatTime(serverDate) {
    const date = new Date(serverDate)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    if (days === 0) return `今天 ${hours}:${minutes}`
    if (days === 1) return `昨天 ${hours}:${minutes}`
    if (days === 2) return `前天 ${hours}:${minutes}`
    return `${date.getMonth() + 1}月${date.getDate()}日`
  },

  switchTab(e) {
    wx.vibrateShort({ type: 'light' })
    const { tab } = e.currentTarget.dataset
    this.setData({ activeTab: tab }, () => {
      this.filterOrders()
    })
  },

  filterOrders() {
    const { activeTab, orders } = this.data
    let filtered = orders

    if (activeTab === '待处理') {
      filtered = orders.filter(o => o.status === 'cooking')
    } else if (activeTab === '已完成') {
      filtered = orders.filter(o => o.status === 'done')
    }

    this.setData({ filteredOrders: filtered })
  },

  async confirmDone(e) {
    wx.vibrateShort({ type: 'medium' })
    const { id } = e.currentTarget.dataset

    const result = await new Promise(resolve => {
      wx.showModal({
        title: '确认完成',
        content: '确认菜已经做好了吗？',
        confirmColor: '#F27D5E',
        success: resolve
      })
    })

    if (result.confirm) {
      try {
        // 更新数据库
        const db = wx.cloud.database()
        await db.collection('orders').doc(id).update({
          data: { status: 'done' }
        })

        // 更新本地状态
        const orders = this.data.orders.map(o =>
          o.id === id ? { ...o, status: 'done' } : o
        )
        this.setData({ orders })
        this.filterOrders()

        wx.showToast({ title: '已完成！', icon: 'success' })
      } catch (e) {
        console.error('更新订单失败:', e)
        wx.showToast({ title: '更新失败', icon: 'none' })
      }
    }
  },

  openRatingModal(e) {
    wx.vibrateShort({ type: 'light' })
    const { id } = e.currentTarget.dataset
    this.setData({
      showRatingModal: true,
      currentOrderId: id,
      tempRating: 5,
      tempReview: '',
    })
  },

  closeRatingModal() {
    wx.vibrateShort({ type: 'light' })
    this.setData({ showRatingModal: false })
  },

  setRating(e) {
    wx.vibrateShort({ type: 'light' })
    const { rating } = e.currentTarget.dataset
    this.setData({ tempRating: rating })
  },

  onReviewInput(e) {
    this.setData({ tempReview: e.detail.value })
  },

  async submitRating() {
    wx.vibrateShort({ type: 'medium' })
    const { currentOrderId, tempRating, tempReview } = this.data

    if (!tempRating || tempRating === 0) {
      wx.showToast({ title: '请先评分', icon: 'none' })
      return
    }

    try {
      // 更新数据库
      const db = wx.cloud.database()
      await db.collection('orders').doc(currentOrderId).update({
        data: {
          rating: tempRating,
          review: tempReview || ''
        }
      })

      // 更新本地状态
      const newOrders = this.data.orders.map(o => {
        if (o.id === currentOrderId) {
          return { ...o, rating: tempRating, review: tempReview || '' }
        }
        return o
      })

      this.setData({
        orders: newOrders,
        showRatingModal: false,
      }, () => {
        this.filterOrders()
        wx.showToast({ title: '评价成功', icon: 'success' })
      })
    } catch (e) {
      console.error('提交评价失败:', e)
      wx.showToast({ title: '提交失败', icon: 'none' })
    }
  },
})
