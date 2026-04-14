import axios from 'axios'
import { useAuthStore } from '@/store/auth'

const api = axios.create({
  baseURL: 'http://62.169.25.212:8005/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = useAuthStore.getState().refreshToken
        const { data } = await axios.post('/api/v1/auth/token/refresh/', { refresh })
        useAuthStore.getState().setTokens(data.access, refresh!)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

/**
 * Extracts the most useful error message from an Axios error
 * matching our API's { success, message, errors } response shape.
 */
export function apiErrorMsg(err: any, fallback = 'Something went wrong.'): string {
  const data = err?.response?.data
  if (!data) return err?.message || fallback

  const parts: string[] = []

  // Top-level message — skip the meaningless generic ones
  if (data.message && !['An error occurred.', 'Error', 'Internal server error.'].includes(data.message)) {
    parts.push(data.message)
  }

  // Field / non-field errors object
  if (data.errors && typeof data.errors === 'object') {
    Object.entries(data.errors as Record<string, unknown>).forEach(([key, val]) => {
      const msgs = Array.isArray(val) ? val : [val]
      msgs.forEach((m: any) => {
        const text = String(m)
        if (key === 'non_field_errors' || key === 'detail') {
          if (!parts.includes(text)) parts.push(text)
        } else {
          parts.push(`${key.replace(/_/g, ' ')}: ${text}`)
        }
      })
    })
  }

  return parts.length > 0 ? parts.join('\n') : fallback
}
