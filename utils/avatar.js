// utils/avatar.js
// 头像处理工具函数

/**
 * 过滤错误的 avatar 值
 * 如果 avatar 是长字符串（可能是ID），返回默认 emoji
 * @param {String} avatar - 头像值
 * @param {String} defaultEmoji - 默认 emoji，默认为 '👨‍🍳'
 * @returns {String} 过滤后的头像值
 */
function filterAvatar(avatar, defaultEmoji = '👨‍🍳') {
  if (!avatar) return defaultEmoji
  // 如果是长字符串（可能是ID），使用默认emoji
  if (avatar.length > 10) return defaultEmoji
  return avatar
}

module.exports = {
  filterAvatar
}
