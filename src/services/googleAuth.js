// Google Identity Services auth

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Scopes needed: Drive App Data folder
export const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'

let tokenClient = null
let accessToken = null

export function getAccessToken() {
  return accessToken
}

export function initGoogleAuth({ onSignIn, onError }) {
  console.log('[auth] initGoogleAuth called')
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error) {
        console.warn('[auth] token error:', response.error)
        onError && onError(response.error)
        return
      }
      console.log('[auth] token received, expires in', response.expires_in, 's')
      accessToken = response.access_token
      onSignIn && onSignIn(response.access_token)
    },
  })
}

export function requestToken() {
  if (!tokenClient) return
  console.log('[auth] requestToken (manual sign-in)')
  tokenClient.requestAccessToken({ prompt: '' })
}

export function silentRequestToken() {
  if (!tokenClient) return
  console.log('[auth] silentRequestToken (prompt: none)')
  tokenClient.requestAccessToken({ prompt: 'none' })
}

export function signOut() {
  if (accessToken) {
    window.google.accounts.oauth2.revoke(accessToken, () => {})
    accessToken = null
  }
}

export async function getUserInfo(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}
