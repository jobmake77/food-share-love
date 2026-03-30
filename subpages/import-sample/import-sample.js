// subpages/import-sample/import-sample.js
const app = getApp()

const OFFICIAL_MENU_PACKS = [
  {
    id: 'north',
    name: '北方口味',
    tagline: '偏厚重、香浓、下饭，适合秋冬和重口家庭餐。',
    categories: [
      { name: '北方主食', icon: '🥟', sort: 1 },
      { name: '北方荤菜', icon: '🍖', sort: 2 },
      { name: '北方素菜', icon: '🥬', sort: 3 },
      { name: '北方汤羹', icon: '🍲', sort: 4 }
    ],
    dishes: [
      { name: '猪肉白菜饺子', categoryName: '北方主食', emoji: '🥟', desc: '北方家庭常见主食，鲜香扎实', image: '' },
      { name: '老北京炸酱面', categoryName: '北方主食', emoji: '🍜', desc: '酱香浓郁，拌面开胃', image: '' },
      { name: '锅包肉', categoryName: '北方荤菜', emoji: '🍖', desc: '东北经典酸甜口，外酥里嫩', image: '' },
      { name: '京酱肉丝', categoryName: '北方荤菜', emoji: '🥓', desc: '甜咸酱香，卷饼很搭', image: '' },
      { name: '小鸡炖蘑菇', categoryName: '北方荤菜', emoji: '🍗', desc: '东北炖菜代表，香气足', image: '' },
      { name: '猪肉炖粉条', categoryName: '北方荤菜', emoji: '🥘', desc: '肉香入粉，暖胃下饭', image: '' },
      { name: '地三鲜', categoryName: '北方素菜', emoji: '🍆', desc: '土豆茄子青椒组合，东北家常', image: '' },
      { name: '醋溜土豆丝', categoryName: '北方素菜', emoji: '🥔', desc: '脆爽酸香，解腻必备', image: '' },
      { name: '酸辣白菜', categoryName: '北方素菜', emoji: '🥬', desc: '酸辣开胃，做法快', image: '' },
      { name: '西红柿鸡蛋汤', categoryName: '北方汤羹', emoji: '🥣', desc: '家常快手汤，酸甜顺口', image: '' },
      { name: '萝卜羊肉汤', categoryName: '北方汤羹', emoji: '🍲', desc: '暖身补气，冬天常见', image: '' }
    ],
    preview: [
      '🥟 主食：猪肉白菜饺子、老北京炸酱面',
      '🍖 荤菜：锅包肉、京酱肉丝、小鸡炖蘑菇',
      '🥬 素菜：地三鲜、醋溜土豆丝、酸辣白菜',
      '🍲 汤羹：西红柿鸡蛋汤、萝卜羊肉汤'
    ]
  },
  {
    id: 'south',
    name: '南方口味',
    tagline: '偏清鲜、细腻、原味，强调食材本味与汤水。',
    categories: [
      { name: '南方主食', icon: '🍚', sort: 1 },
      { name: '南方荤菜', icon: '🐟', sort: 2 },
      { name: '南方素菜', icon: '🥗', sort: 3 },
      { name: '南方汤品甜点', icon: '🍮', sort: 4 }
    ],
    dishes: [
      { name: '腊味煲仔饭', categoryName: '南方主食', emoji: '🍚', desc: '米香和腊味香融合，锅巴焦香', image: '' },
      { name: '扬州炒饭', categoryName: '南方主食', emoji: '🍳', desc: '粒粒分明，配料丰富', image: '' },
      { name: '白切鸡', categoryName: '南方荤菜', emoji: '🐔', desc: '粤式经典，突出鸡肉本味', image: '' },
      { name: '清蒸鲈鱼', categoryName: '南方荤菜', emoji: '🐟', desc: '蒸鱼豉油提鲜，清爽不腻', image: '' },
      { name: '梅菜扣肉', categoryName: '南方荤菜', emoji: '🥩', desc: '咸香回甜，配饭很稳', image: '' },
      { name: '白灼菜心', categoryName: '南方素菜', emoji: '🥬', desc: '脆嫩清甜，做法简单', image: '' },
      { name: '蚝油生菜', categoryName: '南方素菜', emoji: '🥗', desc: '鲜香爽口，适合搭配荤菜', image: '' },
      { name: '上汤娃娃菜', categoryName: '南方素菜', emoji: '🥬', desc: '汤鲜菜嫩，整体清润', image: '' },
      { name: '腌笃鲜', categoryName: '南方汤品甜点', emoji: '🍲', desc: '江南代表汤品，鲜咸温润', image: '' },
      { name: '老火靓汤', categoryName: '南方汤品甜点', emoji: '🥣', desc: '慢炖出味，讲究清补', image: '' },
      { name: '双皮奶', categoryName: '南方汤品甜点', emoji: '🍮', desc: '细腻香甜，饭后幸福感', image: '' }
    ],
    preview: [
      '🍚 主食：腊味煲仔饭、扬州炒饭',
      '🐟 荤菜：白切鸡、清蒸鲈鱼、梅菜扣肉',
      '🥗 素菜：白灼菜心、蚝油生菜、上汤娃娃菜',
      '🍮 汤甜：腌笃鲜、老火靓汤、双皮奶'
    ]
  },
  {
    id: 'cards',
    name: '情侣互动卡（非菜品）',
    tagline: '抽象玩法菜单，用卡片帮助互动、和好、分工。',
    categories: [
      { name: '情侣卡片', icon: '💌', sort: 1 }
    ],
    dishes: [
      { name: '和好卡', categoryName: '情侣卡片', emoji: '🤝', desc: '争执后主动递出，先拥抱 30 秒再沟通', image: '' },
      { name: '做饭卡', categoryName: '情侣卡片', emoji: '👨‍🍳', desc: '抽到的人负责当日做饭，对方负责点单', image: '' },
      { name: '免洗碗卡', categoryName: '情侣卡片', emoji: '🧽', desc: '本次用餐后可免一次洗碗', image: '' },
      { name: '夸夸卡', categoryName: '情侣卡片', emoji: '💬', desc: '真诚夸对方三句，不能敷衍', image: '' },
      { name: '惊喜约会卡', categoryName: '情侣卡片', emoji: '🎁', desc: '一方策划一次 2 小时内轻约会', image: '' },
      { name: '早安早餐卡', categoryName: '情侣卡片', emoji: '🥪', desc: '次日早餐由持卡方准备', image: '' },
      { name: '安静陪伴卡', categoryName: '情侣卡片', emoji: '🫶', desc: '放下手机 30 分钟，专心陪伴', image: '' },
      { name: '抱抱补给卡', categoryName: '情侣卡片', emoji: '🧸', desc: '无条件抱抱 60 秒并说一句鼓励', image: '' }
    ],
    preview: [
      '💌 不是真实菜品，是情侣互动玩法卡',
      '🤝 和好卡：先拥抱再沟通',
      '👨‍🍳 做饭卡：分工明确，减少争执',
      '🎁 惊喜约会卡：制造仪式感'
    ]
  }
]

Page({
  data: {
    menuPacks: OFFICIAL_MENU_PACKS.map(pack => ({
      id: pack.id,
      name: pack.name,
      tagline: pack.tagline,
      categories: pack.categories.length,
      dishes: pack.dishes.length,
      preview: pack.preview
    })),
    selectedPackId: OFFICIAL_MENU_PACKS[0].id,
    importing: false,
    clearing: false,
    stats: {
      categories: OFFICIAL_MENU_PACKS[0].categories.length,
      dishes: OFFICIAL_MENU_PACKS[0].dishes.length
    },
    preview: OFFICIAL_MENU_PACKS[0].preview
  },

  onLoad() {
    this.syncSelectedPack()
  },

  getCurrentPack() {
    return OFFICIAL_MENU_PACKS.find(item => item.id === this.data.selectedPackId) || OFFICIAL_MENU_PACKS[0]
  },

  onSelectPack(e) {
    const { id } = e.currentTarget.dataset
    if (!id || id === this.data.selectedPackId) return
    this.setData({ selectedPackId: id }, () => {
      this.syncSelectedPack()
    })
  },

  syncSelectedPack() {
    const current = this.getCurrentPack()
    this.setData({
      stats: {
        categories: current.categories.length,
        dishes: current.dishes.length
      },
      preview: current.preview
    })
  },

  async importSample() {
    const currentPack = this.getCurrentPack()
    wx.showModal({
      title: '导入官方菜单',
      content: `将导入「${currentPack.name}」：${this.data.stats.categories} 个分类和 ${this.data.stats.dishes} 条数据`,
      success: async (res) => {
        if (!res.confirm) return

        this.setData({ importing: true })
        const db = wx.cloud.database()

        try {
          wx.showLoading({ title: '导入中...' })

          // 确保用户信息已加载
          await app.waitForUserInfo()
          const userInfo = app.globalData.userInfo
          console.log('当前用户信息:', userInfo)

          // 1. 导入分类并记录ID映射
          const categoryMap = {} // { '主食': 'categoryId123', ... }
          let categoryCount = 0

          for (const cat of currentPack.categories) {
            const addRes = await db.collection('categories').add({ data: cat })
            categoryMap[cat.name] = addRes._id
            categoryCount++
          }

          // 2. 导入菜品，使用映射后的分类ID
          let dishCount = 0
          for (const dish of currentPack.dishes) {
            const dishData = {
              name: dish.name,
              desc: dish.desc,
              emoji: dish.emoji || '🍽️',
              image: dish.image,
              categoryId: categoryMap[dish.categoryName] || '',
              sort: Date.now()
            }
            await db.collection('dishes').add({ data: dishData })
            dishCount++
          }

          wx.hideLoading()
          wx.showToast({
            title: `导入成功！${categoryCount}分类 ${dishCount}条`,
            icon: 'success',
            duration: 2000
          })

          setTimeout(() => {
            wx.navigateBack()
          }, 2000)

        } catch (e) {
          wx.hideLoading()
          console.error('导入失败', e)
          wx.showToast({
            title: `导入失败: ${e.message || '未知错误'}`,
            icon: 'none',
            duration: 3000
          })
        } finally {
          this.setData({ importing: false })
        }
      }
    })
  },

  async clearAllData() {
    wx.showModal({
      title: '⚠️ 危险操作',
      content: '确定要清空所有分类和菜品数据吗？此操作不可恢复！',
      confirmText: '确定清空',
      cancelText: '取消',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (!res.confirm) return

        this.setData({ clearing: true })

        try {
          wx.showLoading({ title: '清空中...' })
          const { result } = await wx.cloud.callFunction({
            name: 'clearMenuData'
          })

          if (!result || !result.success) {
            throw new Error(result?.error || '清空失败')
          }

          wx.hideLoading()
          wx.showToast({
            title: '清空成功！',
            icon: 'success',
            duration: 2000
          })

          console.log(`已删除 ${result.deletedCategories || 0} 个分类和 ${result.deletedDishes || 0} 道菜品`)

        } catch (e) {
          wx.hideLoading()
          console.error('清空失败', e)
          const message = (e && e.message) || ''
          let title = '清空失败'
          if (message.includes('permission')) title = '没有权限清空'
          else if (message.includes('network')) title = '网络异常，请重试'
          else if (message.includes('残留')) title = '仍有残留数据'
          wx.showToast({ title, icon: 'none' })
        } finally {
          this.setData({ clearing: false })
        }
      }
    })
  }
})
