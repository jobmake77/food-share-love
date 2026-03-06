// components/order-card/order-card.js
const app = getApp()

Component({
  properties: {
    order: { type: Object, value: {} },
  },
  data: {
    isMyOrder: false, // 是否是我下的单
  },
  lifetimes: {
    attached() {
      this._checkOrderOwner()
    },
  },
  observers: {
    'order._openid': function() {
      this._checkOrderOwner()
    },
  },
  methods: {
    _checkOrderOwner() {
      const userInfo = app.globalData.userInfo
      if (!userInfo || !this.data.order) return

      // 判断订单是否是当前用户创建的
      const isMyOrder = this.data.order._openid === userInfo.openid
      this.setData({ isMyOrder })
    },

    onComplete() {
      this.triggerEvent('complete', { orderId: this.data.order._id })
    },
    onReview() {
      this.triggerEvent('review', { orderId: this.data.order._id })
    },
  },
})
