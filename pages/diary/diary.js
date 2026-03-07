// pages/diary/diary.js
const app = getApp()

const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

Page({
  data: {
    viewMode: 'week', // 默认周视图
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-based
    selectedDate: '',
    calendarDays: [],
    selectedEntry: null,
    expandedImages: false,
    currentWeekStart: null,
    weekNumber: 1,
    months,
    weekDays,
    diaryEntries: {},  // 从数据库加载的日记数据
  },

  onLoad() {
    // 设置默认选中今天
    const today = new Date()
    this.setData({
      selectedDate: this.formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())
    })

    // 加载日记数据
    this.loadDiaryData()
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadDiaryData()
  },

  async loadDiaryData() {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()

      // 获取所有已完成的订单
      const { data: orders } = await db.collection('orders')
        .where({ status: 'done' })
        .orderBy('createdAt', 'desc')
        .get()

      // 转换为日记格式
      const diaryEntries = {}
      orders.forEach(order => {
        const date = new Date(order.createdAt)
        const dateKey = this.formatDateKey(date.getFullYear(), date.getMonth(), date.getDate())

        diaryEntries[dateKey] = {
          dishes: order.dishes.map(d => d.name),
          emoji: this.getRatingEmoji(order.rating),
          rating: order.rating || 0,
          chef: order.creatorName,
          images: order.dishes.map(d => d.emoji || '🍽️'),
          review: order.review || '',
          orderId: order._id
        }
      })

      this.setData({ diaryEntries })

      // 重新渲染日历
      if (this.data.viewMode === 'week') {
        this.renderWeekView()
      } else {
        this.renderCalendar()
      }

      // 加载选中日期的详情
      this.loadSelectedEntry()
    } catch (e) {
      console.error('加载日记数据失败', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  getRatingEmoji(rating) {
    if (!rating) return '😊'
    if (rating >= 5) return '🥰'
    if (rating >= 4) return '😋'
    if (rating >= 3) return '😊'
    if (rating >= 2) return '😐'
    return '😕'
  },

  renderCalendar() {
    const { currentYear, currentMonth, selectedDate, diaryEntries } = this.data
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const days = []

    // 填充空白
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true })
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = this.formatDateKey(currentYear, currentMonth, day)
      const today = this.formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

      days.push({
        day,
        dateKey,
        isToday: dateKey === today,
        isSelected: dateKey === selectedDate,
        hasEntry: !!diaryEntries[dateKey],
      })
    }

    this.setData({ calendarDays: days })
  },

  renderWeekView() {
    const { selectedDate, diaryEntries } = this.data
    const selected = new Date(selectedDate)

    // 计算本周的开始日期（周日）
    const weekStart = new Date(selected)
    weekStart.setDate(selected.getDate() - selected.getDay())

    // 生成本周7天的数据
    const days = []
    const today = this.formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      const dateKey = this.formatDateKey(date.getFullYear(), date.getMonth(), date.getDate())

      days.push({
        day: date.getDate(),
        dateKey,
        isToday: dateKey === today,
        isSelected: dateKey === selectedDate,
        hasEntry: !!diaryEntries[dateKey],
      })
    }

    // 计算是一年中的第几周
    const firstDayOfYear = new Date(weekStart.getFullYear(), 0, 1)
    const pastDaysOfYear = (weekStart - firstDayOfYear) / 86400000
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)

    this.setData({
      calendarDays: days,
      currentWeekStart: weekStart,
      currentYear: weekStart.getFullYear(),
      currentMonth: weekStart.getMonth(),
      weekNumber
    })
  },

  formatDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  },

  loadSelectedEntry() {
    const { selectedDate, diaryEntries } = this.data
    const entry = diaryEntries[selectedDate]
    this.setData({
      selectedEntry: entry || null,
      expandedImages: false,
    })
  },

  toggleViewMode() {
    wx.vibrateShort({ type: 'light' })
    const newMode = this.data.viewMode === 'month' ? 'week' : 'month'
    this.setData({ viewMode: newMode }, () => {
      if (newMode === 'week') {
        this.renderWeekView()
      } else {
        this.renderCalendar()
      }
    })
  },

  prevPeriod() {
    wx.vibrateShort({ type: 'light' })
    if (this.data.viewMode === 'week') {
      // 切换到上一周
      const { currentWeekStart } = this.data
      const newDate = new Date(currentWeekStart)
      newDate.setDate(newDate.getDate() - 7)
      this.setData({
        selectedDate: this.formatDateKey(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
      }, () => {
        this.renderWeekView()
        this.loadSelectedEntry()
      })
    } else {
      // 切换到上一月
      let { currentYear, currentMonth } = this.data
      currentMonth--
      if (currentMonth < 0) {
        currentMonth = 11
        currentYear--
      }
      this.setData({ currentYear, currentMonth }, () => {
        this.renderCalendar()
      })
    }
  },

  nextPeriod() {
    wx.vibrateShort({ type: 'light' })
    if (this.data.viewMode === 'week') {
      // 切换到下一周
      const { currentWeekStart } = this.data
      const newDate = new Date(currentWeekStart)
      newDate.setDate(newDate.getDate() + 7)
      this.setData({
        selectedDate: this.formatDateKey(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
      }, () => {
        this.renderWeekView()
        this.loadSelectedEntry()
      })
    } else {
      // 切换到下一月
      let { currentYear, currentMonth } = this.data
      currentMonth++
      if (currentMonth > 11) {
        currentMonth = 0
        currentYear++
      }
      this.setData({ currentYear, currentMonth }, () => {
        this.renderCalendar()
      })
    }
  },

  selectDate(e) {
    wx.vibrateShort({ type: 'light' })
    const { date } = e.currentTarget.dataset
    if (!date) return

    this.setData({ selectedDate: date }, () => {
      if (this.data.viewMode === 'week') {
        this.renderWeekView()
      } else {
        this.renderCalendar()
      }
      this.loadSelectedEntry()
    })
  },

  expandImages() {
    wx.vibrateShort({ type: 'light' })
    this.setData({ expandedImages: true })
  },
})
