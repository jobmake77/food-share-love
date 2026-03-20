// scripts/soak-test.js
// Run unit tests repeatedly for a configured duration.

const { spawnSync } = require('node:child_process')

const minutes = Number(process.env.SOAK_MINUTES || 60)
const maxRuns = Number(process.env.SOAK_MAX_RUNS || 0)
const durationMs = Math.max(1, minutes) * 60 * 1000

const start = Date.now()
let runs = 0

while (Date.now() - start < durationMs) {
  runs += 1
  const result = spawnSync(process.execPath, ['--test'], { stdio: 'inherit' })
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
  if (maxRuns > 0 && runs >= maxRuns) {
    break
  }
}

const elapsedSec = Math.round((Date.now() - start) / 1000)
console.log(`Soak test complete: ${runs} runs in ${elapsedSec}s`)
