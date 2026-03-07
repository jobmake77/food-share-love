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
  },

  onLoad() {
    this._setGreeting()
    this._generateRecommendations()
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
    try {
      const db = wx.cloud.database()

      // 尝试从数据库获取菜品
      const { data: allDishes } = await db.collection('dishes').get()

      if (allDishes && allDishes.length > 0) {
        // 按类别分组（使用新的分类系统）
        const grouped = {
          meat: allDishes.filter(d => d.category === 'meat'),
          vegetable: allDishes.filter(d => d.category === 'vegetable'),
          soup: allDishes.filter(d => d.category === 'soup'),
          dessert: allDishes.filter(d => d.category === 'dessert')
        }

        const recommendations = []

        // 必选：1道荤菜
        if (grouped.meat.length > 0) {
          recommendations.push(this._randomPick(grouped.meat))
        }

        // 必选：1道素菜
        if (grouped.vegetable.length > 0) {
          recommendations.push(this._randomPick(grouped.vegetable))
        }

        // 必选：1道汤品或甜点（随机选择）
        const extras = [...grouped.soup, ...grouped.dessert]
        if (extras.length > 0) {
          recommendations.push(this._randomPick(extras))
        }

        this.setData({ recommendDishes: recommendations })
      } else {
        // 数据库为空，使用默认推荐
        this._useFallbackRecommendations()
      }
    } catch (e) {
      console.error('生成推荐失败', e)
      // 数据库查询失败，使用默认推荐
      this._useFallbackRecommendations()
    }
  },

  // 使用默认推荐（从硬编码菜品中智能选择）
  _useFallbackRecommendations() {
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

    this.setData({ recommendDishes: recommendations })
  },

  // 随机选择
  _randomPick(array) {
    return array[Math.floor(Math.random() * array.length)]
  },
})
