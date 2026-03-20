const test = require('node:test')
const assert = require('node:assert/strict')
const { createMockCloud, loadFunction } = require('../helpers/mock-wx-server-sdk')

function seedUsers(db) {
  return Promise.all([
    db.collection('users').add({
      data: {
        openid: 'openid-A',
        nickname: '用户A',
        avatar: '',
        code: 'AAA111',
        partnerId: null
      }
    }),
    db.collection('users').add({
      data: {
        openid: 'openid-B',
        nickname: '用户B',
        avatar: '',
        code: 'BBB222',
        partnerId: null
      }
    })
  ])
}

test('bindPartner sends bind request', async () => {
  const mock = createMockCloud({ openid: 'openid-A' })
  const db = mock.database()
  const [userA, userB] = await seedUsers(db)

  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mock)
  const res = await bindPartner.main({ partnerCode: 'BBB222' }, {})

  assert.equal(res.success, true)
  const requests = db._getCollection('bind_requests')
  assert.equal(requests.length, 1)
  assert.equal(requests[0].fromId, userA._id)
  assert.equal(requests[0].targetId, userB._id)
})

test('bindPartner rejects binding self', async () => {
  const mock = createMockCloud({ openid: 'openid-A' })
  const db = mock.database()
  await seedUsers(db)

  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mock)
  const res = await bindPartner.main({ partnerCode: 'AAA111' }, {})

  assert.equal(res.success, false)
  assert.match(res.error, /不能绑定自己/)
})

test('bindPartner accept request binds both users', async () => {
  const mock = createMockCloud({ openid: 'openid-A' })
  const db = mock.database()
  const [userA, userB] = await seedUsers(db)

  const request = await db.collection('bind_requests').add({
    data: {
      fromId: userA._id,
      fromName: '用户A',
      fromAvatar: '',
      targetId: userB._id,
      createdAt: new Date(),
      status: 'pending'
    }
  })

  mock._setOpenid('openid-B')
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mock)
  const res = await bindPartner.main({ action: 'accept', requestId: request._id }, {})

  assert.equal(res.success, true)
  const updatedA = await db.collection('users').doc(userA._id).get()
  const updatedB = await db.collection('users').doc(userB._id).get()
  assert.equal(updatedA.data.partnerId, userB._id)
  assert.equal(updatedB.data.partnerId, userA._id)
  assert.equal(db._getCollection('bind_requests').length, 0)
})

test('bindPartner reject request removes request', async () => {
  const mock = createMockCloud({ openid: 'openid-A' })
  const db = mock.database()
  const [userA, userB] = await seedUsers(db)

  const request = await db.collection('bind_requests').add({
    data: {
      fromId: userA._id,
      fromName: '用户A',
      fromAvatar: '',
      targetId: userB._id,
      createdAt: new Date(),
      status: 'pending'
    }
  })

  mock._setOpenid('openid-B')
  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mock)
  const res = await bindPartner.main({ action: 'reject', requestId: request._id }, {})

  assert.equal(res.success, true)
  assert.equal(db._getCollection('bind_requests').length, 0)
})

test('bindPartner unbind clears both sides', async () => {
  const mock = createMockCloud({ openid: 'openid-A' })
  const db = mock.database()
  const [userA, userB] = await seedUsers(db)

  await db.collection('users').doc(userA._id).update({ data: { partnerId: userB._id } })
  await db.collection('users').doc(userB._id).update({ data: { partnerId: userA._id } })

  const bindPartner = loadFunction('cloudfunctions/bindPartner/index.js', mock)
  const res = await bindPartner.main({ action: 'unbind' }, {})

  assert.equal(res.success, true)
  const updatedA = await db.collection('users').doc(userA._id).get()
  const updatedB = await db.collection('users').doc(userB._id).get()
  assert.equal(updatedA.data.partnerId, null)
  assert.equal(updatedB.data.partnerId, null)
})
