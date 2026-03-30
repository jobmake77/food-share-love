// utils/avatar.js
// 头像处理工具函数

function isImageSource(value) {
  if (!value || typeof value !== 'string') return false
  return /^(cloud:\/\/|https?:\/\/|wxfile:\/\/|data:image\/)/.test(value.trim())
}

function isEmojiLike(value) {
  if (!value || typeof value !== 'string') return false
  const text = value.trim()
  if (!text || text.length > 8) return false
  return !/^[a-zA-Z0-9_\-/.:%?#=&\s]+$/.test(text)
}

function resolveAvatar(avatar, defaultEmoji = '👨‍🍳') {
  if (isImageSource(avatar)) {
    return {
      image: avatar,
      emoji: defaultEmoji
    }
  }

  if (isEmojiLike(avatar)) {
    return {
      image: '',
      emoji: avatar.trim()
    }
  }

  return {
    image: '',
    emoji: defaultEmoji
  }
}

function filterAvatar(avatar, defaultEmoji = '👨‍🍳') {
  return resolveAvatar(avatar, defaultEmoji).emoji
}

module.exports = {
  filterAvatar,
  isImageSource,
  resolveAvatar
}
