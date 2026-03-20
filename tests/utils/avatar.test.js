const test = require('node:test')
const assert = require('node:assert/strict')
const { filterAvatar } = require('../../utils/avatar')

test('filterAvatar returns default for empty', () => {
  assert.equal(filterAvatar('', '👨‍🍳'), '👨‍🍳')
})

test('filterAvatar returns default for long strings', () => {
  assert.equal(filterAvatar('verylongavatarid-string', '👩‍🍳'), '👩‍🍳')
})

test('filterAvatar returns original for short value', () => {
  assert.equal(filterAvatar('🙂', '👨‍🍳'), '🙂')
})
