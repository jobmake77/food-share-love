// pages/diary/diary.js
const app = getApp()

// 缓存订单日期数据，避免重复查询
let orderDatesCache = null
let cacheTime = 0
const CACHE_DURATION = 60000 // 缓存1分钟

Page({
  data: {
    calMode: 'week',
    currentDate: Date.now(), // 存时间戳，避免 setData 序列化破坏 Date 对象
    selectedDate: '',
    weekTitle: '',
    monthTitle: '',
    calDates: [],
    selectedDateLabel: '',
    dayOrders: [],
    orderDates: {},
    loading: false,
  },

  onLoad() {
    const today = new Date()
    const dateStr = this._formatDate(today)
    this.setData({ selectedDate: dateStr })
    this._renderCalendar()
    this._loadOrderDates()
  },

  onShow() {
    // 如果缓存过期，重新加载
    if (Date.now() - cacheTime > CACHE_DURATION) {
      this._loadOrderDates()
    }
    this._loadDayOrders(this.data.selectedDate)
  },

  _formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  _renderCalendar() {
    const { calMode, currentDate, selectedDate } = this.data
    const today = this._formatDate(new Date())
    const current = new Date(currentDate) // 时间戳 → Date
    if (calMode === 'week') {
      this._renderWeek(current, today, selectedDate)
    } else {
      this._renderMonth(current, today, selectedDate)
    }
  },

  _renderWeek(current, today, selected) {
    const day = current.getDay()
    const startOfWeek = new Date(current)
    startOfWeek.setDate(current.getDate() - day)
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      const dateStr = this._formatDate(d)
      dates.push({
        day: d.getDate(),
        dateStr,
        isToday: dateStr === today,
        isSelected: dateStr === selected,
        isEmpty: false,
        hasOrder: !!this.data.orderDates[dateStr],
      })
    }
    const m = startOfWeek.getMonth() + 1
    this.setData({
      calDates: dates,
      weekTitle: `${m}月第${this._getWeekOfMonth(current)}周`,
    })
    this._updateSelectedLabel(selected)
  },

  _renderMonth(current, today, selected) {
    const year = current.getFullYear()
    const month = current.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const dates = []
    for (let i = 0; i < firstDay; i++) {
      dates.push({ day: '', dateStr: '', isEmpty: true })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      dates.push({
        day: d,
        dateStr,
        isToday: dateStr === today,
        isSelected: dateStr === selected,
        isEmpty: false,
        hasOrder: !!this.data.orderDates[dateStr],
      })
    }
    this.setData({ calDates: dates, monthTitle: `${year}年${month + 1}月` })
    this._updateSelectedLabel(selected)
  },

  _getWeekOfMonth(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return Math.ceil((date.getDate() + firstDay) / 7)
  },

  _updateSelectedLabel(dateStr) {
    if (!dateStr) return
    const today = this._formatDate(new Date())
    if (dateStr === today) {
      this.setData({ selectedDateLabel: '今天' })
    } else {
      const parts = dateStr.split('-')
      this.setData({ selectedDateLabel: `${parseInt(parts[1])}月${parseInt(parts[2])}日` })
    }
  },

  async _loadOrderDates() {
    // 使用缓存
    if (orderDatesCache && Date.now() - cacheTime < CACHE_DURATION) {
      this.setData({ orderDates: orderDatesCache })
      this._renderCalendar()
      return
    }

    const db = wx.cloud.database()
    const userInfo = app.globalData.userInfo
    if (!userInfo) return

    try {
      const _ = db.command
      // 查询：我下的单 OR 伙伴下的单（partnerId 是我的 _id）
      const { data } = await db.collection('orders')
        .where(_.or([
          { _openid: userInfo.openid },           // 我下的单
          { partnerId: userInfo._id }             // 伙伴下的单（我是接收者）
        ]))
        .field({ createdAt: true }) // 只查询需要的字段
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get()

      const orderDates = {}
      data.forEach(order => {
        const dateStr = this._formatDate(new Date(order.createdAt))
        orderDates[dateStr] = true
      })

      // 更新缓存
      orderDatesCache = orderDates
      cacheTime = Date.now()

      this.setData({ orderDates })
      this._renderCalendar()
    } catch (e) {
      console.error('加载订单日期失败', e)
    }
  },

  async _loadDayOrders(dateStr) {
    const db = wx.cloud.database()
    if (!dateStr) return
    const userInfo = app.globalData.userInfo
    if (!userInfo) return

    this.setData({ loading: true })

    const start = new Date(dateStr + 'T00:00:00')
    const end = new Date(dateStr + 'T23:59:59')

    try {
      const _ = db.command
      // 查询：我下的单 OR 伙伴下的单
      const { data } = await db.collection('orders')
        .where(_.and([
          _.or([
            { _openid: userInfo.openid },         // 我下的单
            { partnerId: userInfo._id }           // 伙伴下的单
          ]),
          { createdAt: _.gte(start).and(_.lte(end)) }
        ]))
        .orderBy('createdAt', 'asc')
        .get()

      const dayOrders = data.map(order => {
        const createdAt = new Date(order.createdAt)
        const h = String(createdAt.getHours()).padStart(2, '0')
        const m = String(createdAt.getMinutes()).padStart(2, '0')

        // 判断是否是我下的单
        const isMyOrder = order._openid === userInfo.openid
        const displayName = isMyOrder ? '我' : (order.creatorName || 'TA')

        return {
          ...order,
          timeStr: `${h}:${m}`,
          creatorName: displayName,
          creatorAvatar: order.creatorAvatar || '/assets/default-avatar.png',
          expanded: false, // 默认不展开
        }
      })

      this.setData({ dayOrders, loading: false })
    } catch (e) {
      console.error('加载当天订单失败', e)
      this.setData({ loading: false })
    }
  },

  // 切换图片展开状态
  toggleExpand(e) {
    const { orderId } = e.currentTarget.dataset
    const { dayOrders } = this.data
    const index = dayOrders.findIndex(order => order._id === orderId)
    if (index !== -1) {
      dayOrders[index].expanded = true
      this.setData({ dayOrders })
    }
  },

  toggleCalMode() {
    const newMode = this.data.calMode === 'week' ? 'month' : 'week'
    this.setData({ calMode: newMode })
    this._renderCalendar()
  },

  prevPeriod() {
    const { calMode, currentDate } = this.data
    const d = new Date(currentDate)
    if (calMode === 'week') { d.setDate(d.getDate() - 7) } else { d.setMonth(d.getMonth() - 1) }
    this.setData({ currentDate: d.getTime() })
    this._renderCalendar()
  },

  nextPeriod() {
    const { calMode, currentDate } = this.data
    const d = new Date(currentDate)
    if (calMode === 'week') { d.setDate(d.getDate() + 7) } else { d.setMonth(d.getMonth() + 1) }
    this.setData({ currentDate: d.getTime() })
    this._renderCalendar()
  },

  selectDate(e) {
    const dateStr = e.currentTarget.dataset.date
    if (!dateStr) return
    this.setData({ selectedDate: dateStr })
    this._renderCalendar()
    this._loadDayOrders(dateStr)
  },
})
