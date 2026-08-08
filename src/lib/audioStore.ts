const DB_NAME = 'pista-audio-v1'
const STORE = 'tracks'

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const waitForTransaction = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve()
  transaction.onabort = () => reject(transaction.error ?? new Error('La operación de audio fue cancelada.'))
  transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo guardar el audio.'))
})

export async function saveTrack(skaterId: string, file: File) {
  const db = await openDb()
  try {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(file, skaterId)
    await waitForTransaction(transaction)
  } finally {
    db.close()
  }
}

export async function loadTrack(skaterId: string): Promise<Blob | undefined> {
  const db = await openDb()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(skaterId)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return blob
}

export async function removeTrack(skaterId: string) {
  const db = await openDb()
  try {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).delete(skaterId)
    await waitForTransaction(transaction)
  } finally {
    db.close()
  }
}
