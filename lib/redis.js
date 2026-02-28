import { Redis } from '@upstash/redis'

const hasRedisConfig = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN

let redis = null
if (hasRedisConfig) {
  redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

// ローカル開発用のインメモリストア
const memoryStore = new Map()

export async function kvGet(key) {
  if (redis) return await redis.get(key)
  return memoryStore.get(key) || null
}

export async function kvSet(key, value) {
  if (redis) return await redis.set(key, value)
  memoryStore.set(key, value)
}
