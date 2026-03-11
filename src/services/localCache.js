const KEY = 'domadoo_state'
const USER_KEY = 'domadoo_user'

export function saveToCache(state) {
  try {
    const { user, syncStatus, detailsModalNodeId, showDoneToday, showLabelManager, ...persist } = state
    localStorage.setItem(KEY, JSON.stringify(persist))
  } catch (e) {
    console.warn('Failed to save to localStorage', e)
  }
}

export function loadFromCache() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export function clearCache() {
  localStorage.removeItem(KEY)
}

export function saveUser(user) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)) } catch (e) {}
}

export function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
}
