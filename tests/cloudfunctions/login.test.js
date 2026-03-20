const test = require('node:test')
const assert = require('node:assert/strict')
const { createMockCloud, loadFunction } = require('../helpers/mock-wx-server-sdk')

test('login creates a new user with unique code', async () => {
  const mock = createMockCloud({ openid: 'openid-1' })
  const login = loadFunction('cloudfunctions/login/index.js', mock)

  const res = await login.main({}, {})

  assert.equal(res.success, true)
  assert.ok(res.userInfo._id)
  assert.equal(res.userInfo.openid, 'openid-1')
  assert.equal(res.userInfo._openid, 'openid-1')
  assert.equal(res.userInfo.partnerId, null)
  assert.equal(res.userInfo.code.length, 6)
  assert.match(res.userInfo.code, /^[A-Z2-9]{6}$/)
})

test('login updates existing user fields', async () => {
  const mock = createMockCloud({ openid: 'openid-2' })
  const db = mock.database()
  const existing = await db.collection('users').add({
    data: {
      openid: 'openid-2',
      nickname: '旧昵称',
      avatar: '',
      code: 'ABC123',
      partnerId: null
    }
  })

  const login = loadFunction('cloudfunctions/login/index.js', mock)
  const res = await login.main({ nickname: '新昵称', avatar: 'avatar.png' }, {})

  assert.equal(res.success, true)
  assert.equal(res.userInfo._id, existing._id)
  assert.equal(res.userInfo.nickname, '新昵称')
  assert.equal(res.userInfo.avatar, 'avatar.png')
})

test('login stores phone when phoneCode provided', async () => {
  const mock = createMockCloud({ openid: 'openid-3', phoneNumber: '13900001111' })
  const login = loadFunction('cloudfunctions/login/index.js', mock)

  const res = await login.main({ phoneCode: 'dummy-code' }, {})

  assert.equal(res.success, true)
  assert.equal(res.userInfo.phone, '13900001111')
})
