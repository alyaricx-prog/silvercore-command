'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'system'

type ThemeCtx = {
  theme: Theme
  setTheme: (t: Theme) => void
  resolvedTheme: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
})

function getResolved(t: Theme): 'dark' | 'light' {
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return t
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  function apply(t: Theme) {
    const resolved = getResolved(t)
    document.documentElement.setAttribute('data-theme', resolved)
    setResolvedTheme(resolved)
  }

  useEffect(() => {
    const stored = (localStorage.getItem('sc-theme') as Theme | null) ?? 'dark'
    setThemeState(stored)
    apply(stored)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const current = (localStorage.getItem('sc-theme') as Theme | null) ?? 'dark'
      if (current === 'system') apply('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('sc-theme', t)
    apply(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
