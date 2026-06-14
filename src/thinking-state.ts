let count = 0

const listeners = new Set<() => void>()
const notify = () => {
  for (const fn of listeners) fn()
}

export const thinkingStore = {
  isThinking: () => count > 0,
  subscribe: (fn: () => void) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  begin: () => {
    count += 1
    notify()
  },
  end: () => {
    count = Math.max(0, count - 1)
    notify()
  },
}
