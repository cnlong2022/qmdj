import { HistoryItem } from '../types';

const DB_NAME = 'QiMenMasterDB';
const STORE_NAME = 'History';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveHistory(item: HistoryItem): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getAllHistory(): Promise<HistoryItem[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function deleteHistory(id: string): Promise<void> {
  console.log('开始删除历史记录，ID:', id);
  
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    console.log('删除请求已发起，事务ID:', transaction.id);

    // 监听请求成功
    request.onsuccess = () => {
      console.log('删除请求成功，ID:', id);
      // 这里不 resolve，等待事务完成
    };

    // 监听请求错误
    request.onerror = (event) => {
      console.error('删除请求失败:', request.error);
      reject(request.error || new Error('删除请求失败'));
    };

    // 监听事务完成 - 这是关键
    transaction.oncomplete = () => {
      console.log('事务完成，删除操作已提交');
      resolve();
    };

    // 监听事务错误
    transaction.onerror = (event) => {
      console.error('事务失败:', transaction.error);
      reject(transaction.error || new Error('事务失败'));
    };

    // 确保事务正常开始
    transaction.onabort = (event) => {
      console.error('事务被中止:', transaction.error);
      reject(transaction.error || new Error('事务被中止'));
    };
  });
}

export async function clearHistory(): Promise<void> {
  console.log('开始清空历史记录');
  
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    console.log('清空请求已发起，事务ID:', transaction.id);

    request.onsuccess = () => {
      console.log('清空请求成功');
    };

    transaction.oncomplete = () => {
      console.log('事务完成，清空操作已提交');
      resolve();
    };

    request.onerror = (event) => {
      console.error('清空请求失败:', request.error);
      reject(request.error || new Error('清空请求失败'));
    };

    transaction.onerror = (event) => {
      console.error('事务失败:', transaction.error);
      reject(transaction.error || new Error('事务失败'));
    };
  });
}