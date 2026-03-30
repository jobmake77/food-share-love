// cloudfunctions/bindPartner/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function getUserById(userId) {
  if (!userId) return null
  try {
    const { data } = await db.collection('users').doc(userId).get()
    return data || null
  } catch (error) {
    return null
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { partnerCode, action } = event

  if (!partnerCode && action !== 'accept' && action !== 'reject' && action !== 'unbind') {
    return { success: false, error: '识别码不能为空' }
  }

  try {
    // 查找自己
    const { data: myUsers } = await db.collection('users')
      .where({ openid: myOpenid })
      .get()

    if (myUsers.length === 0) {
      return { success: false, error: '当前用户不存在' }
    }

    const me = myUsers[0]

    // 处理解绑请求
    if (action === 'unbind') {
      let partner = await getUserById(me.partnerId)

      if (!partner) {
        const { data: reciprocalUsers } = await db.collection('users')
          .where({ partnerId: me._id })
          .limit(1)
          .get()
        partner = reciprocalUsers[0] || null
      }

      if (!me.partnerId && !partner) {
        return {
          success: true,
          message: '当前已是未绑定状态',
          userInfo: {
            ...me,
            partnerId: null
          },
          partnerInfo: null
        }
      }

      await db.collection('users').doc(me._id).update({
        data: { partnerId: null }
      })

      if (partner && partner._id) {
        await db.collection('users').doc(partner._id).update({
          data: { partnerId: null }
        })
      }

      const { data: latestMe } = await db.collection('users').doc(me._id).get()
      return {
        success: true,
        message: '已解绑',
        userInfo: latestMe,
        partnerInfo: null
      }
    }

    // 处理接受/拒绝绑定请求
    if (action === 'accept' || action === 'reject') {
      const { requestId } = event

      if (!requestId) {
        return { success: false, error: '请求ID不能为空' }
      }

      // 查找绑定请求
      const { data: requests } = await db.collection('bind_requests')
        .where({ _id: requestId, targetId: me._id })
        .get()

      if (requests.length === 0) {
        return { success: false, error: '绑定请求不存在' }
      }

      const request = requests[0]

      if (action === 'accept') {
        if (me.partnerId) {
          return { success: false, error: '你已经绑定了伙伴' }
        }

        const { data: fromUser } = await db.collection('users').doc(request.fromId).get()
        if (!fromUser) {
          return { success: false, error: '发起者不存在' }
        }
        if (fromUser.partnerId) {
          return { success: false, error: '对方已经绑定了伙伴' }
        }

        // 接受绑定：双向绑定
        await db.collection('users').doc(me._id).update({
          data: { partnerId: request.fromId }
        })

        await db.collection('users').doc(request.fromId).update({
          data: { partnerId: me._id }
        })

        // 删除绑定请求
        await db.collection('bind_requests').doc(requestId).remove()

        const { data: latestMe } = await db.collection('users').doc(me._id).get()
        const { data: latestPartner } = await db.collection('users').doc(request.fromId).get()

        return {
          success: true,
          userInfo: latestMe,
          partnerInfo: latestPartner,
          message: '绑定成功！'
        }
      } else {
        // 拒绝绑定：删除请求
        await db.collection('bind_requests').doc(requestId).remove()
        return { success: true, message: '已拒绝绑定请求' }
      }
    }

    // 发送绑定请求
    // 查找对方
    const { data: partners } = await db.collection('users')
      .where({ code: partnerCode })
      .get()

    if (partners.length === 0) {
      return { success: false, error: '未找到该识别码对应的用户' }
    }

    const partner = partners[0]

    if (partner.openid === myOpenid) {
      return { success: false, error: '不能绑定自己哦' }
    }

    // 检查是否已经绑定
    if (me.partnerId) {
      return { success: false, error: '你已经绑定了伙伴，请先解绑' }
    }

    if (partner.partnerId) {
      return { success: false, error: '对方已经绑定了伙伴' }
    }

    // 检查是否已经发送过请求
    const { data: existingRequests } = await db.collection('bind_requests')
      .where({
        fromId: me._id,
        targetId: partner._id
      })
      .get()

    if (existingRequests.length > 0) {
      return { success: false, error: '你已经向对方发送过绑定请求，请等待对方确认' }
    }

    // 创建绑定请求
    await db.collection('bind_requests').add({
      data: {
        fromId: me._id,
        fromName: me.nickname,
        fromAvatar: me.avatar,
        targetId: partner._id,
        createdAt: db.serverDate(),
        status: 'pending'
      }
    })

    return { success: true, message: '绑定请求已发送，等待对方确认' }
  } catch (err) {
    console.error('bindPartner error', err)
    return { success: false, error: err.message }
  }
}
