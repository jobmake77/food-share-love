// pages/diary/diary.js
const app = getApp()

const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 模拟日记数据
const diaryEntries = {
  '2026-03-01': { dishes: ['番茄炒蛋', '米饭'], emoji: '😋', rating: 5, chef: '小美', images: ['🍳', '🍚'] },
  '2026-03-03': { dishes: ['红烧排骨', '清炒时蔬', '紫菜蛋花汤'], emoji: '🤤', rating: 5, chef: '小明', images: ['🍖', '🥬', '🥣'] },
  '2026-03-05': { dishes: ['芒果布丁', '蜜桃冰茶', '草莓蛋糕', '抹茶拿铁', '提拉米苏'], emoji: '🥰', rating: 4, chef: '小美', images: ['🍮', '🍑', '🍰', '🍵', '🎂'] },
  '2026-03-06': { dishes: ['可乐鸡翅', '清炒时蔬'], emoji: '😊', rating: 4, chef: '小明', images: ['🍗', '🥬'] },
}

Page({
  data: {
    viewMode: 'month',
    currentYear: 2026,
    currentMonth: 2, // 0-based
    selectedDate: '2026-03-06',
    calendarDays: [],
    selectedEntry: null,
    expandedImages: false,
    months,
    weekDays,
  },

  onLoad() {
    this.renderCalendar()
    this.loadSelectedEntry()
  },

  renderCalendar() {
    const { currentYear, currentMonth, selectedDate } = this.data
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

  formatDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  },

  loadSelectedEntry() {
    const { selectedDate } = this.data
    const entry = diaryEntries[selectedDate]
    this.setData({
      selectedEntry: entry || null,
      expandedImages: false,
    })
  },

  toggleViewMode() {
    wx.vibrateShort({ type: 'light' })
    const newMode = this.data.viewMode === 'month' ? 'week' : 'month'
    this.setData({ viewMode: newMode })
  },

  prevMonth() {
    wx.vibrateShort({ type: 'light' })
    let { currentYear, currentMonth } = this.data
    currentMonth--
    if (currentMonth < 0) {
      currentMonth = 11
      currentYear--
    }
    this.setData({ currentYear, currentMonth }, () => {
      this.renderCalendar()
    })
  },

  nextMonth() {
    wx.vibrateShort({ type: 'light' })
    let { currentYear, currentMonth } = this.data
    currentMonth++
    if (currentMonth > 11) {
      currentMonth = 0
      currentYear++
    }
    this.setData({ currentYear, currentMonth }, () => {
      this.renderCalendar()
    })
  },

  selectDate(e) {
    wx.vibrateShort({ type: 'light' })
    const { date } = e.currentTarget.dataset
    if (!date) return

    this.setData({ selectedDate: date }, () => {
      this.renderCalendar()
      this.loadSelectedEntry()
    })
  },

  expandImages() {
    wx.vibrateShort({ type: 'light' })
    this.setData({ expandedImages: true })
  },
})
