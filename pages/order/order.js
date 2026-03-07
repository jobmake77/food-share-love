// pages/order/order.js
const app = getApp()

const mockOrders = [
  { id: '1', dishes: ['番茄炒蛋', '紫菜蛋花汤'], status: 'cooking', time: '今天 18:30', chef: '小美', note: '少盐少糖～' },
  { id: '2', dishes: ['红烧排骨', '清炒时蔬'], status: 'cooking', time: '今天 19:00', chef: '小明' },
  { id: '3', dishes: ['可乐鸡翅'], status: 'done', time: '昨天 12:15', chef: '小明', rating: 5, review: '太好吃了！' },
  { id: '4', dishes: ['芒果布丁', '蜜桃冰茶'], status: 'done', time: '前天 15:00', chef: '小美', rating: 4 },
]

Page({
  data: {
    activeTab: '全部',
    orders: mockOrders,
    filteredOrders: mockOrders,
    showRatingModal: false,
    currentOrderId: null,
    tempRating: 5,
    tempReview: '',
  },

  onLoad() {
    this.filterOrders()
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

  confirmDone(e) {
    wx.vibrateShort({ type: 'medium' })
    const { id } = e.currentTarget.dataset

    wx.showModal({
      title: '确认完成',
      content: '确认菜已经做好了吗？',
      confirmColor: '#F27D5E',
      success: (res) => {
        if (res.confirm) {
          const { orders } = this.data
          const newOrders = orders.map(o => o.id === id ? { ...o, status: 'done' } : o)
          this.setData({ orders: newOrders }, () => {
            this.filterOrders()
            wx.showToast({ title: '已完成！', icon: 'success' })
          })
        }
      }
    })
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

  submitRating() {
    wx.vibrateShort({ type: 'medium' })
    const { currentOrderId, tempRating, tempReview, orders } = this.data

    const newOrders = orders.map(o => {
      if (o.id === currentOrderId) {
        return { ...o, rating: tempRating, review: tempReview || undefined }
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
  },
})
