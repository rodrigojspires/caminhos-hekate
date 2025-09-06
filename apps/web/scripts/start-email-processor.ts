import { runEmailProcessor } from '../src/lib/background/email-processor'

runEmailProcessor().catch((err) => {
  console.error('Email processor error:', err)
  process.exit(1)
})
