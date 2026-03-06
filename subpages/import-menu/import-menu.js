// subpages/import-menu/import-menu.js
Page({
  data: {
    jsonText: '',
    importing: false,
    placeholder: '请粘贴菜单 JSON 数据...\n\n格式示例：\n{\n  "categories": [\n    {"name": "主食", "icon": "🍚", "sort": 1}\n  ],\n  "dishes": [\n    {"name": "米饭", "categoryId": "xxx", "desc": "描述", "image": ""}\n  ]\n}'
  },

  onJsonInput(e) {
    this.setData({ jsonText: e.detail.value })
  },

  clearJson() {
    this.setData({ jsonText: '' })
  },

  async importMenu() {
    const { jsonText } = this.data

    if (!jsonText.trim()) {
      wx.showToast({ title: '请输入 JSON 数据', icon: 'none' })
      return
    }

    this.setData({ importing: true })
    const db = wx.cloud.database()

    try {
      // 解析 JSON
      const importData = JSON.parse(jsonText)

      if (!importData.categories || !importData.dishes) {
        wx.showToast({ title: 'JSON 格式不正确', icon: 'none' })
        this.setData({ importing: false })
        return
      }

      wx.showLoading({ title: '导入中...' })

      // 导入分类
      let categoryCount = 0
      for (const cat of importData.categories) {
        const { _id, ...catData } = cat
        await db.collection('categories').add({ data: catData })
        categoryCount++
      }

      // 导入菜品
      let dishCount = 0
      for (const dish of importData.dishes) {
        const { _id, ...dishData } = dish
        await db.collection('dishes').add({ data: dishData })
        dishCount++
      }

      wx.hideLoading()
      wx.showToast({
        title: `导入成功！${categoryCount} 个分类，${dishCount} 道菜品`,
        icon: 'success',
        duration: 2000
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 2000)

    } catch (e) {
      wx.hideLoading()
      console.error('导入失败', e)

      if (e instanceof SyntaxError) {
        wx.showToast({ title: 'JSON 格式错误', icon: 'none' })
      } else {
        wx.showToast({ title: '导入失败：' + e.message, icon: 'none' })
      }
    } finally {
      this.setData({ importing: false })
    }
  }
})
