const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function fetchAllByOpenids(collectionName, openids) {
  const result = []
  let hasMore = true
  let skip = 0

  while (hasMore) {
    const { data } = await db.collection(collectionName)
      .where({
        _openid: db.command.in(openids)
      })
      .skip(skip)
      .limit(100)
      .get()

    result.push(...data)
    hasMore = data.length === 100
    skip += data.length
  }

  return result
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const { data: users } = await db.collection('users')
      .where({ openid: OPENID })
      .limit(1)
      .get()

    if (!users.length) {
      return { success: false, error: '当前用户不存在' }
    }

    const me = users[0]
    const openids = [me.openid]

    if (me.partnerId) {
      try {
        const { data: partner } = await db.collection('users').doc(me.partnerId).get()
        if (partner && partner.openid && !openids.includes(partner.openid)) {
          openids.push(partner.openid)
        }
      } catch (error) {
        console.warn('读取伙伴信息失败，按当前用户范围清空', error)
      }
    }

    const dishes = await fetchAllByOpenids('dishes', openids)
    for (const dish of dishes) {
      await db.collection('dishes').doc(dish._id).remove()
    }

    const categories = await fetchAllByOpenids('categories', openids)
    for (const category of categories) {
      await db.collection('categories').doc(category._id).remove()
    }

    const remainDishes = await fetchAllByOpenids('dishes', openids)
    const remainCategories = await fetchAllByOpenids('categories', openids)
    if (remainDishes.length > 0 || remainCategories.length > 0) {
      return {
        success: false,
        error: '仍有残留数据，请稍后重试'
      }
    }

    return {
      success: true,
      deletedDishes: dishes.length,
      deletedCategories: categories.length
    }
  } catch (error) {
    console.error('clearMenuData error', error)
    return {
      success: false,
      error: error.message || '清空失败'
    }
  }
}
