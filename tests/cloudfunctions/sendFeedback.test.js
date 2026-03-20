const test = require('node:test')
const assert = require('node:assert/strict')
const { createMockCloud, loadFunction } = require('../helpers/mock-wx-server-sdk')

test('sendFeedback validates content', async () => {
  const mock = createMockCloud({ openid: 'openid-1' })
  const feedback = loadFunction('cloudfunctions/sendFeedback/index.js', mock)
  const res = await feedback.main({ content: '' }, {})
  assert.equal(res.success, false)
  assert.match(res.error, /反馈内容不能为空/)
})

test('sendFeedback stores feedback and tolerates subscribe failure', async () => {
  const mock = createMockCloud({ openid: 'openid-2', subscribeShouldFail: true })
  const db = mock.database()

  await db.collection('users').add({
    data: { openid: 'openid-2', nickname: '测试用户', avatar: '🙂', code: 'AAA111' }
  })

  const feedback = loadFunction('cloudfunctions/sendFeedback/index.js', mock)
  const res = await feedback.main({ content: '测试反馈', contact: '微信号' }, {})

  assert.equal(res.success, true)
  const feedbacks = db._getCollection('feedbacks')
  assert.equal(feedbacks.length, 1)
  assert.equal(feedbacks[0].content, '测试反馈')
  assert.equal(feedbacks[0].contact, '微信号')
  assert.equal(feedbacks[0].userName, '测试用户')
})
