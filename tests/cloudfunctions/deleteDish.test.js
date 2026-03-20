const test = require('node:test')
const assert = require('node:assert/strict')
const { createMockCloud, loadFunction } = require('../helpers/mock-wx-server-sdk')

test('deleteDish rejects when user missing', async () => {
  const mock = createMockCloud({ openid: 'openid-missing' })
  const del = loadFunction('cloudfunctions/deleteDish/index.js', mock)
  const res = await del.main({ dishId: '1' }, {})
  assert.equal(res.success, false)
  assert.match(res.error, /当前用户不存在/)
})

test('deleteDish enforces ownership or partner', async () => {
  const mock = createMockCloud({ openid: 'openid-A' })
  const db = mock.database()

  const userA = await db.collection('users').add({
    data: { openid: 'openid-A', nickname: 'A', code: 'AAA111', partnerId: null }
  })
  mock._setOpenid('openid-B')
  const userB = await db.collection('users').add({
    data: { openid: 'openid-B', nickname: 'B', code: 'BBB222', partnerId: null }
  })

  // Dish created by B
  const dish = await db.collection('dishes').add({ data: { name: '菜品1' } })

  // Back to A without partner link
  mock._setOpenid('openid-A')
  const del = loadFunction('cloudfunctions/deleteDish/index.js', mock)
  const denied = await del.main({ dishId: dish._id }, {})
  assert.equal(denied.success, false)
  assert.match(denied.error, /无权限/)

  // Link partners and try again
  await db.collection('users').doc(userA._id).update({ data: { partnerId: userB._id } })
  await db.collection('users').doc(userB._id).update({ data: { partnerId: userA._id } })
  const allowed = await del.main({ dishId: dish._id }, {})
  assert.equal(allowed.success, true)
})
