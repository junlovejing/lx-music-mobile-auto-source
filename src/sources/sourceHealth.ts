import { getData, saveData } from '@/plugins/storage'

export interface SourceHealth {
  success: number
  failure: number
  latencyMs: number | null
  consecutiveFailures: number
  cooldownUntil: number
  updatedAt: number
}

type SourceHealthMap = Record<string, SourceHealth>

const STORAGE_KEY = '@adaptive_source_health_v1'
const FAILURE_COOLDOWN_MS = 10 * 60_000
const MAX_SAMPLES = 40
let health: SourceHealthMap = {}
let hydrated = false

const emptyHealth = (): SourceHealth => ({
  success: 0,
  failure: 0,
  latencyMs: null,
  consecutiveFailures: 0,
  cooldownUntil: 0,
  updatedAt: 0,
})

const normalize = (value: unknown): SourceHealthMap => {
  if (!value || typeof value !== 'object') return {}
  const result: SourceHealthMap = {}
  for (const [id, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Partial<SourceHealth>
    result[id] = {
      success: Math.max(0, Number(item.success) || 0),
      failure: Math.max(0, Number(item.failure) || 0),
      latencyMs: item.latencyMs == null ? null : Math.max(0, Number(item.latencyMs) || 0),
      consecutiveFailures: Math.max(0, Number(item.consecutiveFailures) || 0),
      cooldownUntil: Math.max(0, Number(item.cooldownUntil) || 0),
      updatedAt: Math.max(0, Number(item.updatedAt) || 0),
    }
  }
  return result
}

export const hydrateSourceHealth = async() => {
  if (hydrated) return
  health = normalize(await getData<SourceHealthMap>(STORAGE_KEY))
  // eslint-disable-next-line require-atomic-updates
  hydrated = true
}

const persist = () => {
  void saveData(STORAGE_KEY, health)
}

const compact = (item: SourceHealth) => {
  if (item.success + item.failure <= MAX_SAMPLES) return
  item.success = Math.ceil(item.success / 2)
  item.failure = Math.ceil(item.failure / 2)
}

export const recordSourceSuccess = (id: string, latencyMs: number, now = Date.now()) => {
  if (!id) return
  const item = health[id] ??= emptyHealth()
  item.success++
  item.latencyMs = item.latencyMs == null
    ? Math.max(0, latencyMs)
    : Math.round(item.latencyMs * 0.7 + Math.max(0, latencyMs) * 0.3)
  item.consecutiveFailures = 0
  item.cooldownUntil = 0
  item.updatedAt = now
  compact(item)
  persist()
}

export const recordSourceFailure = (id: string, now = Date.now()) => {
  if (!id) return
  const item = health[id] ??= emptyHealth()
  item.failure++
  item.consecutiveFailures++
  item.cooldownUntil = item.consecutiveFailures >= 2 ? now + FAILURE_COOLDOWN_MS : 0
  item.updatedAt = now
  compact(item)
  persist()
}

const reliability = (item: SourceHealth | undefined) => item
  ? (item.success + 1) / (item.success + item.failure + 2)
  : 0.5

export const rankSourceIds = (ids: string[], now = Date.now()): string[] => {
  const original = new Map(ids.map((id, index) => [id, index]))
  return [...ids].sort((a, b) => {
    const left = health[a]
    const right = health[b]
    const leftCooling = (left?.cooldownUntil ?? 0) > now
    const rightCooling = (right?.cooldownUntil ?? 0) > now
    if (leftCooling !== rightCooling) return leftCooling ? 1 : -1
    const reliabilityDelta = reliability(right) - reliability(left)
    if (Math.abs(reliabilityDelta) > 0.0001) return reliabilityDelta > 0 ? 1 : -1
    const latencyDelta = (left?.latencyMs ?? Number.POSITIVE_INFINITY) - (right?.latencyMs ?? Number.POSITIVE_INFINITY)
    if (latencyDelta) return latencyDelta
    return (original.get(a) ?? 0) - (original.get(b) ?? 0)
  })
}

export const getSourceHealth = (id: string) => health[id]

export const pickSourceToProbe = (ids: string[], currentId = '', now = Date.now()): string | null => {
  const candidates = ids.filter(id => id !== currentId && (health[id]?.cooldownUntil ?? 0) <= now)
  candidates.sort((a, b) => {
    const left = health[a]
    const right = health[b]
    const samplesDelta = ((left?.success ?? 0) + (left?.failure ?? 0)) - ((right?.success ?? 0) + (right?.failure ?? 0))
    if (samplesDelta) return samplesDelta
    return (left?.updatedAt ?? 0) - (right?.updatedAt ?? 0)
  })
  return candidates[0] ?? null
}

/** Tests only. */
export const resetSourceHealth = () => {
  health = {}
  hydrated = true
  persist()
}
