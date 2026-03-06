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
    // 删除菜品
    await db.collection('dishes').doc(dishId).remove()

    return { success: true }
  } catch (err) {
    console.error('deleteDish error', err)
    return { success: false, error: err.message }
  }
}
