// cloudfunctions/sendFeedback/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { content, contact } = event

  if (!content) {
    return { success: false, error: '反馈内容不能为空' }
  }

  try {
    // 获取用户信息
    const { data: users } = await db.collection('users')
      .where({ openid: wxContext.OPENID })
      .get()

    const userInfo = users[0] || {}

    // 保存反馈到数据库
    await db.collection('feedbacks').add({
      data: {
        content,
        contact,
        userOpenid: wxContext.OPENID,
        userName: userInfo.nickname || '匿名用户',
        userAvatar: userInfo.avatar || '',
        createdAt: db.serverDate(),
        status: 'pending', // pending, replied, closed
      }
    })

    // 发送邮件通知（使用云开发的邮件发送功能）
    // 注意：需要在云开发控制台配置邮件发送服务
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: wxContext.OPENID,
        page: 'pages/profile/profile',
        data: {
          thing1: { value: '反馈已收到' },
          thing2: { value: content.substring(0, 20) }
        },
        templateId: 'YOUR_TEMPLATE_ID' // 需要配置订阅消息模板
      })
    } catch (e) {
      console.log('发送订阅消息失败', e)
      // 不影响主流程
    }

    return {
      success: true,
      message: '感谢您的反馈！'
    }
  } catch (err) {
    console.error('保存反馈失败', err)
    return {
      success: false,
      error: '提交失败，请稍后重试'
    }
  }
}
