// Encrypted, client-side persistence for editor sessions.
//
// Security model:
// - Data never leaves the browser; it is only written to IndexedDB.
// - Session data is encrypted at rest with AES-GCM (256-bit) via the Web Crypto
//   API. The key is generated once and stored as a NON-EXTRACTABLE CryptoKey in
//   IndexedDB, so its raw bytes can never be read back out by any script. This
//   is the browser's best-practice for protecting a key at rest: even code with
//   storage access (or a raw dump of IndexedDB) only ever sees ciphertext and an
//   unusable key handle.
// - Every write uses a fresh random 12-byte IV.

const DB_NAME = 'jsonedit-tool'
const DB_VERSION = 1
const KEY_STORE = 'keys'
const SESSION_STORE = 'sessions'
const MASTER_KEY_ID = 'master'

let dbPromise = null
let keyPromise = null

const openDB = () => {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE)
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

// Get the master key, generating and persisting a non-extractable one if absent.
// The get-or-create runs inside a single readwrite transaction so concurrent
// browser tabs cannot end up with diverging keys.
const getKey = () => {
  if (keyPromise) return keyPromise
  keyPromise = (async () => {
    const db = await openDB()
    // Generate a candidate before opening the transaction: awaiting a non-IDB
    // promise mid-transaction would let the transaction auto-close.
    const candidate = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable
      ['encrypt', 'decrypt'],
    )
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KEY_STORE, 'readwrite')
      const store = tx.objectStore(KEY_STORE)
      const getReq = store.get(MASTER_KEY_ID)
      getReq.onsuccess = () => {
        if (getReq.result) {
          resolve(getReq.result)
          return
        }
        const putReq = store.put(candidate, MASTER_KEY_ID)
        putReq.onsuccess = () => resolve(candidate)
        putReq.onerror = () => reject(putReq.error)
      }
      getReq.onerror = () => reject(getReq.error)
    })
  })()
  return keyPromise
}

const encrypt = async (value) => {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { iv, ciphertext }
}

const decrypt = async (record) => {
  const key = await getKey()
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: record.iv },
    key,
    record.ciphertext,
  )
  return JSON.parse(new TextDecoder().decode(plaintext))
}

export const loadSession = async (sessionId) => {
  try {
    const db = await openDB()
    const tx = db.transaction(SESSION_STORE, 'readonly')
    const record = await requestToPromise(tx.objectStore(SESSION_STORE).get(sessionId))
    if (!record) return null
    return await decrypt(record)
  } catch (error) {
    console.error('Failed to load session', error)
    return null
  }
}

export const saveSession = async (sessionId, state) => {
  try {
    const { iv, ciphertext } = await encrypt(state)
    const db = await openDB()
    const tx = db.transaction(SESSION_STORE, 'readwrite')
    await requestToPromise(tx.objectStore(SESSION_STORE).put({ id: sessionId, iv, ciphertext }))
  } catch (error) {
    console.error('Failed to save session', error)
  }
}

// Wipe every stored session (all browser tabs / sessionIds).
export const clearAllSessions = async () => {
  try {
    const db = await openDB()
    const tx = db.transaction(SESSION_STORE, 'readwrite')
    await requestToPromise(tx.objectStore(SESSION_STORE).clear())
  } catch (error) {
    console.error('Failed to clear sessions', error)
  }
}
