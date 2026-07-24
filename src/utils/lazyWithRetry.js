import { lazy } from 'react'

export const lazyWithRetry = (loader, chunkName) => lazy(async () => {
  const retryKey = `taskflow:chunk-retry:${chunkName}`

  try {
    const module = await loader()
    sessionStorage.removeItem(retryKey)
    return module
  } catch (error) {
    if (!sessionStorage.getItem(retryKey)) {
      sessionStorage.setItem(retryKey, '1')
      window.location.reload()
      return new Promise(() => {})
    }

    sessionStorage.removeItem(retryKey)
    throw error
  }
})
