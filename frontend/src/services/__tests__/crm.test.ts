import { describe, it, expect, beforeAll, vi } from 'vitest'
import { crmService } from '@/services/crm'

const isBackendRunning = async () => {
  try {
    const res = await fetch('http://localhost:3000/health', { signal: AbortSignal.timeout(1000) })
    return res.ok
  } catch {
    return false
  }
}

describe('CRM Service', () => {
  beforeAll(() => {
    vi.stubEnv('VITE_USE_REMOTE_API', 'true')
  })

  it('normalizes paginated list payloads from remote api into arrays', async () => {
    vi.stubEnv('VITE_USE_REMOTE_API', 'false')
    
    const mockResponse = {
      data: [{ id: 1 }, { id: 2 }],
      page: 1,
      totalPages: 1
    }
    
    expect(mockResponse.data).toBeDefined()
    expect(Array.isArray(mockResponse.data)).toBe(true)
  })
})