// Google Drive App Data folder operations
import { getAccessToken } from './googleAuth.js'

const FILE_NAME = 'domadoo.json'
const SPACE = 'appDataFolder'
const BASE_URL = 'https://www.googleapis.com'

function authHeaders() {
  const token = getAccessToken()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function findFile() {
  const res = await fetch(
    `${BASE_URL}/drive/v3/files?spaces=${SPACE}&fields=files(id,name)&q=name='${FILE_NAME}'`,
    { headers: authHeaders() }
  )
  const data = await res.json()
  return data.files?.[0] ?? null
}

export async function loadFromDrive() {
  try {
    const file = await findFile()
    if (!file) return null
    const res = await fetch(
      `${BASE_URL}/drive/v3/files/${file.id}?alt=media`,
      { headers: authHeaders() }
    )
    return await res.json()
  } catch (e) {
    console.error('Drive load error:', e)
    return null
  }
}

export async function saveToDrive(stateData) {
  try {
    const { user, syncStatus, detailsModalNodeId, showDoneToday, showLabelManager, historyViewDate, ...persist } = stateData
    const body = JSON.stringify({ ...persist, savedAt: Date.now() })

    const existing = await findFile()

    if (existing) {
      // Update
      await fetch(
        `${BASE_URL}/upload/drive/v3/files/${existing.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body,
        }
      )
    } else {
      // Create
      const metadata = { name: FILE_NAME, parents: [SPACE] }
      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('media', new Blob([body], { type: 'application/json' }))

      await fetch(
        `${BASE_URL}/upload/drive/v3/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${getAccessToken()}` },
          body: form,
        }
      )
    }
  } catch (e) {
    console.error('Drive save error:', e)
    throw e
  }
}
