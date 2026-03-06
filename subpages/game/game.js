// subpages/game/game.js
Page({
  data: {
    phase: 'select', // select | tap | dice | rps | result
    gameType: '',
    // 疯狂点点点
    tapStarted: false,
    tapCountdown: 0,
    gameCountdown: 0, // 游戏倒计时（5秒）
    player1Taps: 0,
    player2Taps: 0,
    player1Height: 50,
    player2Height: 50,
    tapTimer: null,
    gameTimer: null,
    // 骰子
    myDice: 0,
    partnerDice: 0,
    rolling: false,
    // 剪刀石头布
    myRps: '',
    partnerRps: '',
    rpsEmoji: { rock: '✊', scissors: '✌️', paper: '🖐️' },
    // 结果
    resultEmoji: '',
    resultText: '',
    resultSub: '',
  },

  selectGame(e) {
    const { game } = e.currentTarget.dataset
    this.setData({ phase: game, gameType: game })

    // 如果是点点点游戏，初始化状态
    if (game === 'tap') {
      this.setData({
        tapStarted: false,
        tapCountdown: 0,
        player1Taps: 0,
        player2Taps: 0,
        player1Height: 50,
        player2Height: 50,
      })
    }
  },

  // 疯狂点点点
  startTapGame() {
    // 3秒倒计时
    this.setData({ tapCountdown: 3 })

    const countdownInterval = setInterval(() => {
      const countdown = this.data.tapCountdown - 1
      this.setData({ tapCountdown: countdown })

      if (countdown === 0) {
        clearInterval(countdownInterval)
        // 开始游戏
        this.setData({ tapStarted: true, gameCountdown: 5 })

        // 游戏倒计时
        this.data.gameTimer = setInterval(() => {
          const gameTime = this.data.gameCountdown - 1
          this.setData({ gameCountdown: gameTime })

          if (gameTime === 0) {
            clearInterval(this.data.gameTimer)
          }
        }, 1000)

        // 5秒后结束游戏
        this.data.tapTimer = setTimeout(() => {
          this.endTapGame()
        }, 5000)
      }
    }, 1000)
  },

  tapPlayer1() {
    if (!this.data.tapStarted || this.data.tapCountdown > 0) return

    const newTaps = this.data.player1Taps + 1
    const totalTaps = newTaps + this.data.player2Taps
    const newHeight = totalTaps > 0 ? (newTaps / totalTaps) * 100 : 50

    this.setData({
      player1Taps: newTaps,
      player1Height: newHeight,
      player2Height: 100 - newHeight,
    })

    // 震动反馈
    wx.vibrateShort({ type: 'light' })
  },

  tapPlayer2() {
    if (!this.data.tapStarted || this.data.tapCountdown > 0) return

    const newTaps = this.data.player2Taps + 1
    const totalTaps = this.data.player1Taps + newTaps
    const newHeight = totalTaps > 0 ? (newTaps / totalTaps) * 100 : 50

    this.setData({
      player2Taps: newTaps,
      player2Height: newHeight,
      player1Height: 100 - newHeight,
    })

    // 震动反馈
    wx.vibrateShort({ type: 'light' })
  },

  endTapGame() {
    this.setData({ tapStarted: false })

    const { player1Taps, player2Taps } = this.data
    let resultEmoji, resultText, resultSub

    if (player1Taps > player2Taps) {
      resultEmoji = '🎉'
      resultText = '你赢了！'
      resultSub = `你点了 ${player1Taps} 次，TA 点了 ${player2Taps} 次，TA 去洗碗！`
    } else if (player2Taps > player1Taps) {
      resultEmoji = '😭'
      resultText = '你输了！'
      resultSub = `你点了 ${player1Taps} 次，TA 点了 ${player2Taps} 次，你去洗碗~`
    } else {
      resultEmoji = '🤝'
      resultText = '平局！'
      resultSub = `都点了 ${player1Taps} 次，手速一样快！`
    }

    this.setData({ phase: 'result', resultEmoji, resultText, resultSub })
  },

  // 骰子 - 改为单人模式，自动掷两次
  rollDice() {
    if (this.data.rolling) return

    wx.vibrateShort({ type: 'medium' })
    this.setData({ rolling: true, myDice: 0, partnerDice: 0 })

    // 第一次掷骰（你的）
    setTimeout(() => {
      const myNum = Math.floor(Math.random() * 6) + 1
      this.setData({ myDice: myNum })
      wx.vibrateShort({ type: 'light' })
    }, 300)

    // 第二次掷骰（TA的）
    setTimeout(() => {
      const partnerNum = Math.floor(Math.random() * 6) + 1
      this.setData({ partnerDice: partnerNum, rolling: false })
      wx.vibrateShort({ type: 'light' })

      // 自动显示结果
      setTimeout(() => {
        this._showDiceResult()
      }, 800)
    }, 900)
  },

  _showDiceResult() {
    const { myDice, partnerDice } = this.data
    let resultEmoji, resultText, resultSub

    if (myDice > partnerDice) {
      resultEmoji = '🎉'
      resultText = '你赢了！'
      resultSub = `你掷了 ${myDice} 点，TA 掷了 ${partnerDice} 点，TA 去洗碗！`
    } else if (partnerDice > myDice) {
      resultEmoji = '😭'
      resultText = '你输了！'
      resultSub = `你掷了 ${myDice} 点，TA 掷了 ${partnerDice} 点，轮到你洗碗啦~`
    } else {
      resultEmoji = '🤝'
      resultText = '平局！'
      resultSub = `都掷了 ${myDice} 点，再来一局决定胜负`
    }

    this.setData({ phase: 'result', resultEmoji, resultText, resultSub })
  },

  // 剪刀石头布 - 改为单人模式，对战系统
  chooseRps(e) {
    const { choice } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'medium' })

    // 系统随机出拳
    const choices = ['rock', 'scissors', 'paper']
    const partnerChoice = choices[Math.floor(Math.random() * 3)]

    this.setData({
      myRps: choice,
      partnerRps: partnerChoice
    })

    // 延迟显示结果，增加悬念
    setTimeout(() => {
      this._calcRpsResult()
    }, 500)
  },

  _calcRpsResult() {
    const { myRps, partnerRps, rpsEmoji } = this.data
    // rock>scissors, scissors>paper, paper>rock
    const winsAgainst = { rock: 'scissors', scissors: 'paper', paper: 'rock' }
    let resultEmoji, resultText, resultSub

    if (myRps === partnerRps) {
      resultEmoji = '🤝'
      resultText = '平局！'
      resultSub = '太有默契了，再来一次吧'
    } else if (winsAgainst[myRps] === partnerRps) {
      resultEmoji = '🎉'
      resultText = '你赢了！'
      resultSub = `你出${['rock','scissors','paper'].indexOf(myRps)>=0 ? this._rpsName(myRps) : ''}，TA出${this._rpsName(partnerRps)}，TA 去洗碗！`
    } else {
      resultEmoji = '😭'
      resultText = '你输了！'
      resultSub = `你出${this._rpsName(myRps)}，TA出${this._rpsName(partnerRps)}，你去洗碗~`
    }

    this.setData({ phase: 'result', resultEmoji, resultText, resultSub })
  },

  _rpsName(key) {
    const names = { rock: '石头', scissors: '剪刀', paper: '布' }
    return names[key] || key
  },

  playAgain() {
    // 清理定时器
    if (this.data.tapTimer) {
      clearTimeout(this.data.tapTimer)
    }
    if (this.data.gameTimer) {
      clearInterval(this.data.gameTimer)
    }

    this.setData({
      phase: 'select',
      tapStarted: false, tapCountdown: 0, gameCountdown: 0,
      player1Taps: 0, player2Taps: 0,
      player1Height: 50, player2Height: 50,
      myDice: 0, partnerDice: 0, rolling: false,
      myRps: '', partnerRps: '',
      resultEmoji: '', resultText: '', resultSub: '',
    })
  },

  goHome() {
    // 清理定时器
    if (this.data.tapTimer) {
      clearTimeout(this.data.tapTimer)
    }
    if (this.data.gameTimer) {
      clearInterval(this.data.gameTimer)
    }
    wx.switchTab({ url: '/pages/home/home' })
  },

  onUnload() {
    // 页面卸载时清理定时器
    if (this.data.tapTimer) {
      clearTimeout(this.data.tapTimer)
    }
    if (this.data.gameTimer) {
      clearInterval(this.data.gameTimer)
    }
  },
})
