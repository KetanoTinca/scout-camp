// Provide a real IndexedDB implementation in the Node test environment so the Dexie
// mirror can be exercised exactly as it runs in the browser.
import "fake-indexeddb/auto";
