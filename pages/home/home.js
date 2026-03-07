// pages/home/home.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    partnerInfo: null,
    greeting: '',
    loaded: false,
    needAuth: false, // 是否需要授权
    authLoading: false, // 授权中
    recommendDishes: [],
    stats: {
      totalDishes: 0,
      totalOrders: 0,
      daysUsed: 0
    }
  },

  onLoad() {
    this._setGreeting()
    this._generateRecommendations()
    this.loadStats()
  },

  onShow() {
    this._loadData()
  },

  _setGreeting() {
    const hour = new Date().getHours()
    let greeting = '早安 ☀️ 今天想吃点什么？'
    if (hour >= 11 && hour < 14) greeting = '午安 🌤️ 该准备午饭啦~'
    else if (hour >= 14 && hour < 18) greeting = '下午好 🍵 来杯下午茶？'
    else if (hour >= 18) greeting = '晚上好 🌙 今晚吃什么呢？'
    this.setData({ greeting })
  },

  async _loadData() {
    const db = wx.cloud.database()
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      // 等待登录完成
      app.userInfoReadyCallback = (info) => {
        this._loadData()
      }
      return
    }

    // 检查是否需要授权（昵称为默认值或以"用户"开头，且头像为空）
    const needAuth = (userInfo.nickname === '美食爱好者' || userInfo.nickname.startsWith('用户')) && !userInfo.avatar
    this.setData({ userInfo, loaded: true, needAuth })

    // 加载伙伴信息
    if (userInfo.partnerId) {
      try {
        const { data } = await db.collection('users').doc(userInfo.partnerId).get()
        app.globalData.partnerInfo = data
        this.setData({ partnerInfo: data })
      } catch (e) {
        console.error('获取伙伴信息失败', e)
      }
    }
  },

  // 用户授权
  async handleAuth() {
    // 防止重复点击
    if (this.data.authLoading) {
      return
    }

    wx.vibrateShort({ type: 'light' })
    this.setData({ authLoading: true })

    try {
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      })

      wx.showLoading({ title: '登录中...', mask: true })

      const success = await app.updateUserInfo(userInfo, null)

      wx.hideLoading()

      if (success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        // 直接更新页面状态，显示主界面
        this.setData({
          userInfo: app.globalData.userInfo,
          needAuth: false,
          authLoading: false
        })

        // 加载伙伴信息
        this._loadPartnerInfo()
      } else {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        })
        this.setData({ authLoading: false })
      }
    } catch (err) {
      console.error('授权失败', err)
      wx.hideLoading()
      this.setData({ authLoading: false })

      // 处理不同的错误情况
      if (err.errMsg) {
        if (err.errMsg.includes('cancel')) {
          wx.showToast({
            title: '已取消授权',
            icon: 'none'
          })
        } else if (err.errMsg.includes('frequently')) {
          wx.showModal({
            title: '提示',
            content: '操作过于频繁，请稍后再试',
            showCancel: false
          })
        } else {
          wx.showToast({
            title: '授权失败，请重试',
            icon: 'none'
          })
        }
      }
    }
  },

  // 加载伙伴信息
  async _loadPartnerInfo() {
    const userInfo = app.globalData.userInfo
    if (userInfo && userInfo.partnerId) {
      try {
        const db = wx.cloud.database()
        const { data } = await db.collection('users').doc(userInfo.partnerId).get()
        app.globalData.partnerInfo = data
        this.setData({ partnerInfo: data })
      } catch (e) {
        console.error('获取伙伴信息失败', e)
      }
    }
  },

  async loadStats() {
    try {
      const db = wx.cloud.database()

      // 统计菜品总数
      const dishesCount = await db.collection('dishes').count()

      // 统计订单总数
      const ordersCount = await db.collection('orders').count()

      // 计算使用天数（从第一个订单到现在）
      const { data: firstOrder } = await db.collection('orders')
        .orderBy('createdAt', 'asc')
        .limit(1)
        .get()

      let daysUsed = 0
      if (firstOrder.length > 0) {
        const firstDate = new Date(firstOrder[0].createdAt)
        const now = new Date()
        daysUsed = Math.floor((now - firstDate) / (1000 * 60 * 60 * 24))
      }

      this.setData({
        stats: {
          totalDishes: dishesCount.total,
          totalOrders: ordersCount.total,
          daysUsed: daysUsed
        }
      })
    } catch (e) {
      console.error('加载统计数据失败', e)
      // 使用默认值
      this.setData({
        stats: {
          totalDishes: 0,
          totalOrders: 0,
          daysUsed: 0
        }
      })
    }
  },

  // 跳过授权，使用默认信息
  skipAuth() {
    wx.vibrateShort({ type: 'light' })
    wx.showModal({
      title: '提示',
      content: '跳过授权后将使用默认昵称和头像，你可以稍后在个人页重新授权',
      confirmText: '确定跳过',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({ needAuth: false })
        }
      }
    })
  },

  goOrder() {
    wx.vibrateShort({ type: 'light' })
    wx.switchTab({ url: '/pages/menu/menu' })
  },

  goGame() {
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/subpages/game/game' })
  },

  goProfile() {
    wx.vibrateShort({ type: 'light' })
    wx.switchTab({ url: '/pages/profile/profile' })
  },

  goMenu() {
    wx.vibrateShort({ type: 'light' })
    wx.switchTab({ url: '/pages/menu/menu' })
  },

  addDish(e) {
    wx.vibrateShort({ type: 'light' })
    const { id } = e.currentTarget.dataset
    wx.showToast({
      title: '已添加到菜单',
      icon: 'success'
    })
  },

  // 生成今日推荐
  async _generateRecommendations() {
    console.log('开始生成今日推荐...')

    try {
      // 检查云开发是否初始化
      if (!wx.cloud || !wx.cloud.database) {
        console.log('云开发未初始化，使用 fallback 数据')
        this._useFallbackRecommendations()
        return
      }

      const db = wx.cloud.database()

      // 加载分类信息
      const { data: categories } = await db.collection('categories').get()
      console.log('数据库分类数量:', categories ? categories.length : 0)

      // 创建分类名称到ID的映射
      const categoryMap = {}
      if (categories && categories.length > 0) {
        categories.forEach(cat => {
          categoryMap[cat._id] = cat.name
        })
      }

      // 尝试从数据库获取菜品
      const { data: allDishes } = await db.collection('dishes').get()
      console.log('数据库菜品数量:', allDishes ? allDishes.length : 0)

      // 查看第一道菜的数据结构
      if (allDishes && allDishes.length > 0) {
        console.log('第一道菜的数据结构:', allDishes[0])
      }

      if (allDishes && allDishes.length > 0) {
        // 按类别分组（使用 categoryId 和分类名称映射）
        const grouped = {
          meat: allDishes.filter(d => {
            const catName = categoryMap[d.categoryId] || d.category || d.type
            return catName === '荤菜' || catName === 'meat' || catName === '肉类'
          }),
          vegetable: allDishes.filter(d => {
            const catName = categoryMap[d.categoryId] || d.category || d.type
            return catName === '素菜' || catName === 'vegetable' || catName === '蔬菜'
          }),
          soup: allDishes.filter(d => {
            const catName = categoryMap[d.categoryId] || d.category || d.type
            return catName === '汤品' || catName === 'soup' || catName === '汤羹'
          }),
          dessert: allDishes.filter(d => {
            const catName = categoryMap[d.categoryId] || d.category || d.type
            return catName === '甜品' || catName === 'dessert' || catName === '甜点'
          }),
          // 其他分类（主食、快手菜等）归入素菜
          others: allDishes.filter(d => {
            const catName = categoryMap[d.categoryId] || d.category || d.type
            return catName === '主食' || catName === '快手菜' || catName === '家常菜'
          })
        }

        console.log('分组结果:', {
          meat: grouped.meat.length,
          vegetable: grouped.vegetable.length,
          soup: grouped.soup.length,
          dessert: grouped.dessert.length,
          others: grouped.others.length
        })

        const recommendations = []

        // 优先选择：1道荤菜
        if (grouped.meat.length > 0) {
          const dish = this._randomPick(grouped.meat)
          recommendations.push(this._formatDish(dish, '经典硬菜'))
        }

        // 优先选择：1道素菜（如果没有素菜，从其他分类中选）
        if (grouped.vegetable.length > 0) {
          const dish = this._randomPick(grouped.vegetable)
          recommendations.push(this._formatDish(dish, '健康低卡'))
        } else if (grouped.others.length > 0) {
          const dish = this._randomPick(grouped.others)
          recommendations.push(this._formatDish(dish, '简单快手'))
        }

        // 优先选择：1道汤品或甜点
        const extras = [...grouped.soup, ...grouped.dessert]
        if (extras.length > 0) {
          const dish = this._randomPick(extras)
          const catName = categoryMap[dish.categoryId] || dish.category || dish.type
          const tag = catName === '汤品' || catName === 'soup' || catName === '汤羹' ? '鲜美清淡' : '甜蜜满分'
          recommendations.push(this._formatDish(dish, tag))
        }

        // 确保至少推荐3道菜（如果数据库中有足够的菜品）
        while (recommendations.length < 3 && allDishes.length > recommendations.length) {
          // 从所有菜品中随机选择一道还未被推荐的菜
          const remaining = allDishes.filter(d =>
            !recommendations.find(r => r.id === (d._id || d.id))
          )
          if (remaining.length > 0) {
            const dish = this._randomPick(remaining)
            recommendations.push(this._formatDish(dish, '特色推荐'))
          } else {
            break
          }
        }

        console.log('从数据库生成推荐:', recommendations.length, '道菜')
        this.setData({ recommendDishes: recommendations })
      } else {
        // 数据库为空，使用默认推荐
        console.log('数据库为空，使用 fallback 数据')
        this._useFallbackRecommendations()
      }
    } catch (e) {
      console.error('生成推荐失败:', e)
      // 数据库查询失败，使用默认推荐
      this._useFallbackRecommendations()
    }
  },

  // 使用默认推荐（从硬编码菜品中智能选择）
  _useFallbackRecommendations() {
    console.log('使用 fallback 推荐数据')

    const fallbackDishes = [
      { id: 1, name: '番茄炒蛋', tag: '简单快手', emoji: '🍳', time: '15min', type: 'vegetable' },
      { id: 2, name: '红烧排骨', tag: '经典硬菜', emoji: '🍖', time: '45min', type: 'meat' },
      { id: 3, name: '清炒时蔬', tag: '健康低卡', emoji: '🥬', time: '10min', type: 'vegetable' },
      { id: 4, name: '紫菜蛋花汤', tag: '鲜美清淡', emoji: '🥣', time: '10min', type: 'soup' },
      { id: 5, name: '可乐鸡翅', tag: '甜咸交织', emoji: '🍗', time: '30min', type: 'meat' },
      { id: 6, name: '糖醋里脊', tag: '酸甜适中', emoji: '🥩', time: '35min', type: 'meat' },
      { id: 7, name: '蒜蓉西兰花', tag: '清爽健康', emoji: '🥦', time: '8min', type: 'vegetable' },
      { id: 8, name: '南瓜粥', tag: '香甜软糯', emoji: '🎃', time: '20min', type: 'soup' },
      { id: 9, name: '芒果布丁', tag: '丝滑香甜', emoji: '🍮', time: '15min', type: 'dessert' },
    ]

    const grouped = {
      meat: fallbackDishes.filter(d => d.type === 'meat'),
      vegetable: fallbackDishes.filter(d => d.type === 'vegetable'),
      soup: fallbackDishes.filter(d => d.type === 'soup'),
      dessert: fallbackDishes.filter(d => d.type === 'dessert')
    }

    const recommendations = []

    // 1道荤菜
    if (grouped.meat.length > 0) {
      recommendations.push(this._randomPick(grouped.meat))
    }

    // 1道素菜
    if (grouped.vegetable.length > 0) {
      recommendations.push(this._randomPick(grouped.vegetable))
    }

    // 1道汤品或甜点
    const extras = [...grouped.soup, ...grouped.dessert]
    if (extras.length > 0) {
      recommendations.push(this._randomPick(extras))
    }

    console.log('Fallback 推荐结果:', recommendations)
    this.setData({ recommendDishes: recommendations })
  },

  // 随机选择
  _randomPick(array) {
    return array[Math.floor(Math.random() * array.length)]
  },

  // 格式化菜品数据（确保包含显示所需的所有字段）
  _formatDish(dish, defaultTag) {
    return {
      id: dish._id || dish.id,
      name: dish.name,
      emoji: dish.emoji || '🍽️',
      tag: dish.tag || defaultTag,
      time: dish.time || this._estimateTime(dish.category),
    }
  },

  // 根据类别估算烹饪时间
  _estimateTime(category) {
    const timeMap = {
      'meat': '30-45min',
      'vegetable': '10-15min',
      'soup': '15-20min',
      'dessert': '20-30min'
    }
    return timeMap[category] || '20min'
  },
})
