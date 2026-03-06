// subpages/import-sample/import-sample.js
const sampleData = {
  categories: [
    { name: '主食', icon: '🍚', sort: 1 },
    { name: '荤菜', icon: '🍖', sort: 2 },
    { name: '素菜', icon: '🥬', sort: 3 },
    { name: '汤品', icon: '🍲', sort: 4 },
    { name: '甜品', icon: '🍰', sort: 5 }
  ],
  dishes: [
    { name: '米饭', categoryName: '主食', desc: '香喷喷的白米饭', image: '' },
    { name: '炒饭', categoryName: '主食', desc: '蛋炒饭，粒粒分明', image: '' },
    { name: '面条', categoryName: '主食', desc: '劲道爽滑的面条', image: '' },
    { name: '红烧肉', categoryName: '荤菜', desc: '肥而不腻，入口即化', image: '' },
    { name: '糖醋排骨', categoryName: '荤菜', desc: '酸甜可口，外酥里嫩', image: '' },
    { name: '宫保鸡丁', categoryName: '荤菜', desc: '麻辣鲜香，鸡肉嫩滑', image: '' },
    { name: '鱼香肉丝', categoryName: '荤菜', desc: '酸甜微辣，下饭神器', image: '' },
    { name: '水煮鱼', categoryName: '荤菜', desc: '麻辣鲜香，鱼肉滑嫩', image: '' },
    { name: '番茄炒蛋', categoryName: '素菜', desc: '酸甜开胃，家常必备', image: '' },
    { name: '清炒时蔬', categoryName: '素菜', desc: '清淡爽口，健康营养', image: '' },
    { name: '麻婆豆腐', categoryName: '素菜', desc: '麻辣鲜香，豆腐嫩滑', image: '' },
    { name: '地三鲜', categoryName: '素菜', desc: '茄子土豆青椒，东北名菜', image: '' },
    { name: '西红柿蛋汤', categoryName: '汤品', desc: '酸甜开胃，营养丰富', image: '' },
    { name: '紫菜蛋花汤', categoryName: '汤品', desc: '清淡鲜美，简单快手', image: '' },
    { name: '排骨汤', categoryName: '汤品', desc: '浓郁鲜香，营养滋补', image: '' },
    { name: '水果拼盘', categoryName: '甜品', desc: '新鲜水果，健康美味', image: '' },
    { name: '红豆沙', categoryName: '甜品', desc: '香甜软糯，暖心暖胃', image: '' },
    { name: '冰淇淋', categoryName: '甜品', desc: '清凉解暑，甜蜜享受', image: '' }
  ]
}

Page({
  data: {
    importing: false,
    stats: {
      categories: sampleData.categories.length,
      dishes: sampleData.dishes.length
    }
  },

  async importSample() {
    wx.showModal({
      title: '导入示例菜单',
      content: `将导入 ${this.data.stats.categories} 个分类和 ${this.data.stats.dishes} 道菜品`,
      success: async (res) => {
        if (!res.confirm) return

        this.setData({ importing: true })
        const db = wx.cloud.database()

        try {
          wx.showLoading({ title: '导入中...' })

          // 1. 导入分类并记录ID映射
          const categoryMap = {} // { '主食': 'categoryId123', ... }

          for (const cat of sampleData.categories) {
            const addRes = await db.collection('categories').add({ data: cat })
            categoryMap[cat.name] = addRes._id
          }

          // 2. 导入菜品，使用映射后的分类ID
          for (const dish of sampleData.dishes) {
            const dishData = {
              name: dish.name,
              desc: dish.desc,
              image: dish.image,
              categoryId: categoryMap[dish.categoryName] || '',
              sort: Date.now()
            }
            await db.collection('dishes').add({ data: dishData })
          }

          wx.hideLoading()
          wx.showToast({ title: '导入成功！', icon: 'success' })

          setTimeout(() => {
            wx.navigateBack()
          }, 1500)

        } catch (e) {
          wx.hideLoading()
          console.error('导入失败', e)
          wx.showToast({ title: '导入失败', icon: 'error' })
        } finally {
          this.setData({ importing: false })
        }
      }
    })
  }
})
