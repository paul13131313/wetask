import { Redis } from '@upstash/redis'

const hasRedisConfig = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN

let redis = null
if (hasRedisConfig) {
  redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

// ローカル開発用のインメモリストア（サーバーレス環境では揮発性）
const memoryStore = new Map()

export async function kvGet(key) {
  if (redis) {
    try {
      return await redis.get(key)
    } catch (err) {
      console.error(`kvGet(${key}) Redis error:`, err)
      throw err
    }
  }
  return memoryStore.get(key) || null
}

export async function kvSet(key, value) {
  if (redis) {
    try {
      return await redis.set(key, value)
    } catch (err) {
      console.error(`kvSet(${key}) Redis error:`, err)
      throw err
    }
  }
  memoryStore.set(key, value)
}
