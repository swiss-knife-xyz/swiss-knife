/** Shared IndexedDB lifecycle used by compiler history and disposable caches. */
export function browserDatabase(
  name: string,
  version: number,
  upgrade: (
    database: IDBDatabase,
    event: IDBVersionChangeEvent,
    transaction: IDBTransaction
  ) => void,
  blockedMessage: string
) {
  let database: Promise<IDBDatabase> | undefined;
  return () => {
    if (!database) {
      database = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name, version);
        let blocked = false;
        request.onupgradeneeded = (event) =>
          upgrade(request.result, event, request.transaction!);
        request.onerror = () => {
          database = undefined;
          reject(request.error);
        };
        request.onblocked = () => {
          blocked = true;
          database = undefined;
          reject(new Error(blockedMessage));
        };
        request.onsuccess = () => {
          const db = request.result;
          if (blocked) {
            db.close();
            return;
          }
          db.onversionchange = () => {
            db.close();
            database = undefined;
          };
          db.onclose = () => {
            database = undefined;
          };
          resolve(db);
        };
      }).catch((error) => {
        database = undefined;
        throw error;
      });
    }
    return database;
  };
}
