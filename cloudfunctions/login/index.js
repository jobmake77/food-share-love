// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 生成随机6位识别码（使用密码学安全的随机数生成器）
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    // 使用 crypto.randomInt 生成密码学安全的随机索引
    const randomIndex = crypto.randomInt(0, chars.length)
    code += chars[randomIndex]
  }
  return code
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { nickname, avatar, phoneCode } = event

  console.log('login 云函数被调用', { nickname, avatar, phoneCode: phoneCode ? '有' : '无', openid })

  try {
    // 如果有手机号授权码，先获取手机号
    let phoneNumber = null
    if (phoneCode) {
      try {
        console.log('开始获取手机号，code:', phoneCode)
        const phoneResult = await cloud.openapi.phonenumber.getPhoneNumber({
          code: phoneCode
        })
        console.log('手机号获取结果:', phoneResult)
        if (phoneResult && phoneResult.phone_info) {
          phoneNumber = phoneResult.phone_info.phoneNumber
          console.log('成功获取手机号:', phoneNumber)
        }
      } catch (err) {
        console.error('获取手机号失败', err)
        // 即使手机号获取失败，也继续处理其他信息
      }
    }

    // 查询用户是否已存在
    const { data } = await db.collection('users')
      .where({ openid })
      .get()

    if (data.length > 0) {
      // 用户已存在
      const existingUser = data[0]

      // 如果传入了新的用户信息，更新数据库
      if (nickname || avatar || phoneNumber) {
        const updateData = {}
        if (nickname) updateData.nickname = nickname
        if (avatar) updateData.avatar = avatar
        if (phoneNumber) updateData.phone = phoneNumber

        await db.collection('users').doc(existingUser._id).update({
          data: updateData
        })

        // 返回更新后的用户信息
        return {
          success: true,
          userInfo: { ...existingUser, ...updateData }
        }
      }

      // 没有新信息，直接返回现有用户
      return { success: true, userInfo: existingUser }
    }

    // 新用户，生成唯一识别码
    let code = genCode()
    // 确保识别码唯一（简单重试）
    let codeExists = true
    while (codeExists) {
      const checkCode = await db.collection('users').where({ code }).get()
      if (checkCode.data.length === 0) {
        codeExists = false
      } else {
        code = genCode()
      }
    }

    // 创建用户
    const newUser = {
      openid,
      nickname: nickname || `用户${phoneNumber ? phoneNumber.slice(-4) : Math.random().toString(36).slice(-4)}`,
      avatar: avatar || '',
      phone: phoneNumber || '',
      code,
      partnerId: null,
      createdAt: db.serverDate(),
    }

    const { _id } = await db.collection('users').add({ data: newUser })
    newUser._id = _id

    return { success: true, userInfo: newUser }
  } catch (err) {
    console.error('login error', err)
    return { success: false, error: err.message }
  }
}
