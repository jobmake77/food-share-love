// cloudfunctions/deleteDish/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { dishId } = event

  if (!dishId) {
    return { success: false, error: '菜品ID不能为空' }
  }

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    const { data: users } = await db.collection('users')
      .where({ openid })
      .get()

    if (!users.length) {
      return { success: false, error: '当前用户不存在' }
    }

    const me = users[0]
    const allowedOpenids = [openid]

    if (me.partnerId) {
      const { data: partner } = await db.collection('users').doc(me.partnerId).get()
      if (partner && partner._openid && !allowedOpenids.includes(partner._openid)) {
        allowedOpenids.push(partner._openid)
      }
    }

    const { data: dish } = await db.collection('dishes').doc(dishId).get()
    if (!dish) {
      return { success: false, error: '菜品不存在' }
    }

    if (dish._openid && !allowedOpenids.includes(dish._openid)) {
      return { success: false, error: '无权限删除该菜品' }
    }

    // 删除菜品
    await db.collection('dishes').doc(dishId).remove()

    return { success: true }
  } catch (err) {
    console.error('deleteDish error', err)
    return { success: false, error: err.message }
  }
}
