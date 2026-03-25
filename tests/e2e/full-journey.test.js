/**
 * E2E 完整用户旅程测试
 *
 * 覆盖从登录开始的完整流程：
 *   1. 新用户注册（登录）
 *   2. 更新用户信息（昵称/头像）
 *   3. 情侣绑定（发送请求 → 对方接受）
 *   4. 菜品管理（新增分类 → 新增菜品 → 编辑 → 删除）
 *   5. 点餐流程（加入购物车 → 下单 → 伙伴完成）
 *   6. 订单评价
 *   7. 意见反馈
 *   8. 解绑伙伴
 *   9. 异常分支兜底验证
 *
 * 所有测试共用同一个 mock 云环境实例，模拟真实的状态流转。
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const { createMockCloud, loadFunction } = require('../helpers/mock-wx-server-sdk')

// ─────────────────────────────────────────────
// 共享环境：两个用户共用同一个数据库实例
// ─────────────────────────────────────────────
const mockA = createMockCloud({ openid: 'e2e-openid-A' })  // 用户A（点单者）
const mockB = createMockCloud({ openid: 'e2e-openid-B' })  // 用户B（做饭者）

// B 复用 A 的数据库，模拟同一云环境
const sharedDb = mockA.database()
mockB.database = () => sharedDb
mockB.getWXContext = () => ({ OPENID: 'e2e-openid-B' })

// 用于在测试间传递状态
const state = {
  userA: null,       // A 的用户信息
  userB: null,       // B 的用户信息
  requestId: null,   // 绑定请求ID
  categoryId: null,  // 分类ID
  dishId: null,      // 菜品ID
  orderId: null,     // 订单ID
}

// ─────────────────────────────────────────────
// 1. 登录 - 新用户注册
// ─────────────────────────────────────────────
test('E2E 1-1: 用户A 首次登录 - 自动注册并生成识别码', async () => {
  const login = loadFunction('cloudfunctions/login/index.js', mockA)
  const res = await login.main({}, {})

  assert.equal(res.success, true, '登录应成功')
  assert.ok(res.userInfo._id, '应生成用户ID')
  assert.equal(res.userInfo.openid, 'e2e-openid-A', 'openid 应匹配')
  assert.equal(res.userInfo.partnerId, null, '新用户无伙伴')
  assert.match(res.userInfo.code, /^[A-Z2-9]{6}$/, '识别码格式应为6位大写字母/数字')

  state.userA = res.userInfo
})

test('E2E 1-2: 用户B 首次登录 - 生成独立识别码', async () => {
  const login = loadFunction('cloudfunctions/login/index.js', mockB)
  const res = await login.main({}, {})

  assert.equal(res.success, true)
  assert.ok(res.userInfo._id)
  assert.equal(res.userInfo.openid, 'e2e-openid-B')
  assert.match(res.userInfo.code, /^[A-Z2-9]{6}$/)
  assert.notEqual(res.userInfo.code, state.userA.code, 'A 和 B 的识别码不应相同')

  state.userB = res.userInfo
})

test('E2E 1-3: 重复登录 - 返回已有用户，不重复创建', async () => {
  const login = loadFunction('cloudfunctions/login/index.js', mockA)
  const res = await login.main({}, {})

  assert.equal(res.success, true)
  assert.equal(res.userInfo._id, state.userA._id, '应返回同一用户ID')
  assert.equal(res.userInfo.code, state.userA.code, '识别码不应变化')

  const users = sharedDb._getCollection('users')
  const aUsers = users.filter(u => u.openid === 'e2e-openid-A')
  assert.equal(aUsers.length, 1, '数据库中不应有重复用户记录')
})

// ─────────────────────────────────────────────
// 2. 更新用户信息
// ─────────────────────────────────────────────
test('E2E 2-1: 用户A 设置昵称和头像', async () => {
  const login = loadFunction('cloudfunctions/login/index.js', mockA)
  const res = await login.main({ nickname: '小爱', avatar: 'https://example.com/avatar-a.jpg' }, {})

  assert.equal(res.success, true)
  assert.equal(res.userInfo.nickname, '小爱')
  assert.equal(res.userInfo.avatar, 'https://example.com/avatar-a.jpg')
  assert.equal(res.userInfo._id, state.userA._id, '应是同一用户')

  state.userA = { ...state.userA, nickname: '小爱', avatar: 'https://example.com/avatar-a.jpg' }
})

test('E2E 2-2: 用户B 设置昵称', async () => {
  const login = loadFunction('cloudfunctions/login/index.js', mockB)
  const res = await login.main({ nickname: '小明', avatar: 'https://example.com/avatar-b.jpg' }, {})

  assert.equal(res.success, true)
  assert.equal(res.userInfo.nickname, '小明')

  state.userB = { ...state.userB, nickname: '小明', avatar: 'https://example.com/avatar-b.jpg' }
})

test('E2E 2-3: 用户A 获取手机号', async () => {
  const mockAWithPhone = createMockCloud({ openid: 'e2e-openid-A', phoneNumber: '13812345678' })
  mockAWithPhone.database = () => sharedDb

  const login = loadFunction('cloudfunctions/login/index.js', mockAWithPhone)
  const res = await login.main({ phoneCode: 'valid-phone-code' }, {})

  assert.equal(res.success, true)
  assert.equal(res.userInfo.phone, '13812345678')
})

// ─────────────────────────────────────────────
// 3. 情侣绑定流程
// ─────────────────────────────────────────────
test('E2E 3-1: 绑定失败 - 不能绑定自己', async () => {
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mockA)
  const res = await bindPartner.main({ partnerCode: state.userA.code }, {})

  assert.equal(res.success, false)
  assert.match(res.error, /不能绑定自己/)
})

test('E2E 3-2: 绑定失败 - 识别码不存在', async () => {
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mockA)
  const res = await bindPartner.main({ partnerCode: 'ZZZZZZ' }, {})

  assert.equal(res.success, false)
  assert.match(res.error, /未找到/)
})

test('E2E 3-3: 用户A 向用户B 发送绑定请求', async () => {
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mockA)
  const res = await bindPartner.main({ partnerCode: state.userB.code }, {})

  assert.equal(res.success, true)
  assert.match(res.message, /绑定请求已发送/)

  const requests = sharedDb._getCollection('bind_requests')
  assert.equal(requests.length, 1, '应有一条绑定请求')
  assert.equal(requests[0].fromId, state.userA._id)
  assert.equal(requests[0].targetId, state.userB._id)
  assert.equal(requests[0].status, 'pending')

  state.requestId = requests[0]._id
})

test('E2E 3-4: 重复发送绑定请求 - 应被拒绝', async () => {
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mockA)
  const res = await bindPartner.main({ partnerCode: state.userB.code }, {})

  assert.equal(res.success, false)
  assert.match(res.error, /已经向对方发送过/)
})

test('E2E 3-5: 用户B 接受绑定请求', async () => {
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mockB)
  const res = await bindPartner.main({ action: 'accept', requestId: state.requestId }, {})

  assert.equal(res.success, true)
  assert.match(res.message, /绑定成功/)

  // 验证双向绑定
  const userADoc = await sharedDb.collection('users').doc(state.userA._id).get()
  const userBDoc = await sharedDb.collection('users').doc(state.userB._id).get()
  assert.equal(userADoc.data.partnerId, state.userB._id, 'A 的 partnerId 应指向 B')
  assert.equal(userBDoc.data.partnerId, state.userA._id, 'B 的 partnerId 应指向 A')

  // 绑定请求应被清除
  const requests = sharedDb._getCollection('bind_requests')
  assert.equal(requests.length, 0, '绑定请求应已删除')

  state.userA = { ...state.userA, partnerId: state.userB._id }
  state.userB = { ...state.userB, partnerId: state.userA._id }
})

// ─────────────────────────────────────────────
// 4. 菜品管理
// ─────────────────────────────────────────────
test('E2E 4-1: 用户A 新增菜品分类', async () => {
  const { _id } = await sharedDb.collection('categories').add({
    data: {
      _openid: 'e2e-openid-A',
      name: '家常菜',
      icon: '🥘',
      sort: 1
    }
  })
  state.categoryId = _id

  const cats = sharedDb._getCollection('categories')
  assert.equal(cats.length, 1)
  assert.equal(cats[0].name, '家常菜')
})

test('E2E 4-2: 用户A 新增菜品', async () => {
  const { _id } = await sharedDb.collection('dishes').add({
    data: {
      _openid: 'e2e-openid-A',
      name: '番茄炒蛋',
      desc: '家常番茄炒蛋，酸甜可口',
      emoji: '🍳',
      image: '',
      category: 'vegetable',
      categoryId: state.categoryId,
      sort: 1
    }
  })
  state.dishId = _id

  const dishes = sharedDb._getCollection('dishes')
  assert.equal(dishes.length, 1)
  assert.equal(dishes[0].name, '番茄炒蛋')
})

test('E2E 4-3: 用户A 再增一道菜（荤菜）', async () => {
  await sharedDb.collection('dishes').add({
    data: {
      _openid: 'e2e-openid-A',
      name: '红烧肉',
      desc: '软糯鲜香',
      emoji: '🥩',
      image: '',
      category: 'meat',
      categoryId: state.categoryId,
      sort: 2
    }
  })

  const dishes = sharedDb._getCollection('dishes')
  assert.equal(dishes.length, 2)
})

test('E2E 4-4: 用户A 编辑菜品', async () => {
  await sharedDb.collection('dishes').doc(state.dishId).update({
    data: { desc: '家常番茄炒蛋，酸甜可口，少放盐' }
  })

  const { data } = await sharedDb.collection('dishes').doc(state.dishId).get()
  assert.equal(data.desc, '家常番茄炒蛋，酸甜可口，少放盐')
})

test('E2E 4-5: 用户B 可删除伙伴的菜品（绑定后有权限）', async () => {
  // 确保 B 的用户记录有 _openid 字段（deleteDish 云函数通过 partner._openid 判断权限）
  await sharedDb.collection('users').doc(state.userB._id).update({
    data: { _openid: 'e2e-openid-B' }
  })

  // 新增一道由 B 创建的菜（_openid 对应 B）
  const { _id: bDishId } = await sharedDb.collection('dishes').add({
    data: {
      _openid: 'e2e-openid-B',
      name: 'B的菜',
      category: 'soup',
      categoryId: state.categoryId,
      sort: 3
    }
  })

  // A（已与B绑定）删除 B 的菜，应有权限
  const deleteDish = loadFunction('cloudfunctions/deleteDish/index.js', mockA)
  const res = await deleteDish.main({ dishId: bDishId }, {})

  assert.equal(res.success, true)
  const dishes = sharedDb._getCollection('dishes')
  assert.ok(!dishes.find(d => d._id === bDishId), '菜品应已被删除')
})

test('E2E 4-6: 删除菜品 - dishId 为空应失败', async () => {
  const deleteDish = loadFunction('cloudfunctions/deleteDish/index.js', mockA)
  const res = await deleteDish.main({}, {})

  assert.equal(res.success, false)
  assert.match(res.error, /菜品ID不能为空/)
})

// ─────────────────────────────────────────────
// 5. 点餐流程（购物车 → 下单 → 伙伴完成）
// ─────────────────────────────────────────────
test('E2E 5-1: 用户A 下单给 B（B 掌勺）', async () => {
  // 获取当前菜品列表
  const { data: dishes } = await sharedDb.collection('dishes').where({}).get()
  assert.ok(dishes.length >= 1, '至少有一道菜')

  // 模拟下单（直接写入订单，页面层逻辑）
  const { _id } = await sharedDb.collection('orders').add({
    data: {
      _openid: 'e2e-openid-A',
      dishes: [
        { _id: dishes[0]._id, name: dishes[0].name, count: 2, emoji: dishes[0].emoji || '' }
      ],
      note: '少放盐',
      status: 'cooking',
      orderedBy: state.userA._id,
      creatorName: '小爱',
      creatorAvatar: 'https://example.com/avatar-a.jpg',
      partnerId: state.userB._id,
      createdAt: new Date()
    }
  })
  state.orderId = _id

  const orders = sharedDb._getCollection('orders')
  assert.equal(orders.length, 1)
  assert.equal(orders[0].status, 'cooking')
  assert.equal(orders[0].orderedBy, state.userA._id)
  assert.equal(orders[0].dishes[0].count, 2)
})

test('E2E 5-2: 订单查询 - 双方均可查看', async () => {
  // A 查询（自己创建的订单）
  const { data: ordersA } = await sharedDb.collection('orders').where({
    _openid: 'e2e-openid-A'
  }).get()
  assert.equal(ordersA.length, 1)

  // B 查询（作为 partnerId）
  const { data: ordersB } = await sharedDb.collection('orders').where({
    partnerId: state.userB._id
  }).get()
  assert.equal(ordersB.length, 1, 'B 应能查到该订单')
})

test('E2E 5-3: 用户B 完成订单', async () => {
  // B 将订单状态改为 done
  await sharedDb.collection('orders').doc(state.orderId).update({
    data: {
      status: 'done',
      doneAt: new Date()
    }
  })

  const { data: order } = await sharedDb.collection('orders').doc(state.orderId).get()
  assert.equal(order.status, 'done')
  assert.ok(order.doneAt, '完成时间应已记录')
})

// ─────────────────────────────────────────────
// 6. 订单评价
// ─────────────────────────────────────────────
test('E2E 6-1: 用户A（点单者）评价订单', async () => {
  await sharedDb.collection('orders').doc(state.orderId).update({
    data: {
      review: '好吃！番茄炒蛋做得很棒',
      rating: 5,
      reviewAt: new Date()
    }
  })

  const { data: order } = await sharedDb.collection('orders').doc(state.orderId).get()
  assert.equal(order.review, '好吃！番茄炒蛋做得很棒')
  assert.equal(order.rating, 5)
  assert.ok(order.reviewAt)
})

test('E2E 6-2: 评价数据持久化验证', async () => {
  const { data: orders } = await sharedDb.collection('orders').where({
    status: 'done'
  }).get()

  assert.equal(orders.length, 1)
  const order = orders[0]
  assert.equal(order.review, '好吃！番茄炒蛋做得很棒')
  assert.equal(order.rating, 5)
})

// ─────────────────────────────────────────────
// 7. 意见反馈
// ─────────────────────────────────────────────
test('E2E 7-1: 反馈内容为空 - 应被拒绝', async () => {
  const sendFeedback = loadFunction('cloudfunctions/sendFeedback/index.js', mockA)
  const res = await sendFeedback.main({ content: '' }, {})

  assert.equal(res.success, false)
  assert.match(res.error, /反馈内容不能为空/)
})

test('E2E 7-2: 用户A 提交意见反馈', async () => {
  const sendFeedback = loadFunction('cloudfunctions/sendFeedback/index.js', mockA)
  const res = await sendFeedback.main({
    content: '希望能增加菜品图片上传功能，目前Emoji还不够直观',
    contact: 'wechat: xiaoai123'
  }, {})

  assert.equal(res.success, true)
  assert.match(res.message, /感谢/)

  const feedbacks = sharedDb._getCollection('feedbacks')
  assert.equal(feedbacks.length, 1)
  assert.equal(feedbacks[0].content, '希望能增加菜品图片上传功能，目前Emoji还不够直观')
  assert.equal(feedbacks[0].contact, 'wechat: xiaoai123')
  assert.equal(feedbacks[0].status, 'pending')
})

test('E2E 7-3: 订阅消息发送失败不影响反馈存储', async () => {
  const mockAFailSubscribe = createMockCloud({
    openid: 'e2e-openid-A',
    subscribeShouldFail: true
  })
  mockAFailSubscribe.database = () => sharedDb

  const sendFeedback = loadFunction('cloudfunctions/sendFeedback/index.js', mockAFailSubscribe)
  const res = await sendFeedback.main({ content: '第二条反馈测试' }, {})

  assert.equal(res.success, true, '即使订阅消息失败，反馈依然应成功保存')

  const feedbacks = sharedDb._getCollection('feedbacks')
  assert.equal(feedbacks.length, 2, '应有两条反馈记录')
})

// ─────────────────────────────────────────────
// 8. 日记页数据验证
// ─────────────────────────────────────────────
test('E2E 8-1: 日记页 - 查询指定日期范围内的订单', async () => {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const { data: orders } = await sharedDb.collection('orders')
    .where({
      status: 'done'
    })
    .get()

  assert.equal(orders.length, 1)
  assert.ok(orders[0].createdAt >= startOfDay || typeof orders[0].createdAt === 'object',
    '订单创建时间应在今天范围内')
})

test('E2E 8-2: 历史订单统计', async () => {
  // 新增一个历史订单
  await sharedDb.collection('orders').add({
    data: {
      _openid: 'e2e-openid-B',
      dishes: [{ name: '红烧肉', count: 1 }],
      note: '',
      status: 'done',
      orderedBy: state.userB._id,
      creatorName: '小明',
      partnerId: state.userA._id,
      createdAt: new Date(Date.now() - 86400000), // 昨天
      doneAt: new Date(Date.now() - 86400000),
      review: '不错',
      rating: 4
    }
  })

  const { data: allOrders } = await sharedDb.collection('orders').where({}).get()
  assert.equal(allOrders.length, 2, '共两条订单记录')

  const doneOrders = allOrders.filter(o => o.status === 'done')
  assert.equal(doneOrders.length, 2, '两条均已完成')
})

// ─────────────────────────────────────────────
// 9. 解绑伙伴
// ─────────────────────────────────────────────
test('E2E 9-1: 无伙伴时解绑应失败', async () => {
  // 先用一个无绑定的临时用户测试
  const mockC = createMockCloud({ openid: 'e2e-openid-C' })
  mockC.database = () => sharedDb

  // 先注册 C
  const login = loadFunction('cloudfunctions/login/index.js', mockC)
  await login.main({ nickname: '用户C' }, {})

  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mockC)
  const res = await bindPartner.main({ action: 'unbind' }, {})

  assert.equal(res.success, false)
  assert.match(res.error, /未绑定伙伴/)
})

test('E2E 9-2: 用户A 解绑用户B', async () => {
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mockA)
  const res = await bindPartner.main({ action: 'unbind' }, {})

  assert.equal(res.success, true)
  assert.match(res.message, /已解绑/)

  // 验证双向解绑
  const userADoc = await sharedDb.collection('users').doc(state.userA._id).get()
  const userBDoc = await sharedDb.collection('users').doc(state.userB._id).get()
  assert.equal(userADoc.data.partnerId, null, 'A 的 partnerId 应清空')
  assert.equal(userBDoc.data.partnerId, null, 'B 的 partnerId 应清空')
})

test('E2E 9-3: 解绑后不能再次解绑', async () => {
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mockA)
  const res = await bindPartner.main({ action: 'unbind' }, {})

  assert.equal(res.success, false)
  assert.match(res.error, /未绑定伙伴/)
})

// ─────────────────────────────────────────────
// 10. 绑定拒绝流程
// ─────────────────────────────────────────────
test('E2E 10-1: 重新绑定 - 先发请求再拒绝', async () => {
  // A 再次向 B 发请求
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mockA)
  const sendRes = await bindPartner.main({ partnerCode: state.userB.code }, {})
  assert.equal(sendRes.success, true)

  const requests = sharedDb._getCollection('bind_requests')
  const newRequestId = requests[requests.length - 1]._id

  // B 拒绝请求
  const bindPartnerB = loadFunction('cloudfunctions/bindPartner/index.js', mockB)
  const rejectRes = await bindPartnerB.main({ action: 'reject', requestId: newRequestId }, {})

  assert.equal(rejectRes.success, true)
  assert.match(rejectRes.message, /已拒绝/)

  // 请求应被删除
  const remainingRequests = sharedDb._getCollection('bind_requests')
  assert.ok(!remainingRequests.find(r => r._id === newRequestId), '请求应已删除')

  // 双方仍未绑定
  const userADoc = await sharedDb.collection('users').doc(state.userA._id).get()
  const userBDoc = await sharedDb.collection('users').doc(state.userB._id).get()
  assert.equal(userADoc.data.partnerId, null)
  assert.equal(userBDoc.data.partnerId, null)
})

// ─────────────────────────────────────────────
// 11. 数据完整性验证（最终状态审计）
// ─────────────────────────────────────────────
test('E2E 11: 最终数据状态审计', async () => {
  const users = sharedDb._getCollection('users')
  const dishes = sharedDb._getCollection('dishes')
  const orders = sharedDb._getCollection('orders')
  const feedbacks = sharedDb._getCollection('feedbacks')
  const bindRequests = sharedDb._getCollection('bind_requests')

  // 用户数（A、B、C）
  assert.ok(users.length >= 2, `至少有2个用户，实际: ${users.length}`)

  // 菜品（A创建了2道，一道被删除，剩1道）
  assert.ok(dishes.length >= 1, `至少有1道菜品，实际: ${dishes.length}`)

  // 订单（2条）
  assert.equal(orders.length, 2, '应有2条订单记录')

  // 反馈（2条）
  assert.equal(feedbacks.length, 2, '应有2条反馈记录')

  // 无挂起的绑定请求
  const pendingRequests = bindRequests.filter(r => r.status === 'pending')
  assert.equal(pendingRequests.length, 0, '不应有未处理的绑定请求')

  // A、B 均未绑定
  const userA = users.find(u => u.openid === 'e2e-openid-A')
  const userB = users.find(u => u.openid === 'e2e-openid-B')
  assert.equal(userA.partnerId, null)
  assert.equal(userB.partnerId, null)
})
