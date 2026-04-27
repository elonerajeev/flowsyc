// Mock ioredis so tests never attempt a real TCP connection
const store = new Map<string, string>();

class RedisMock {
  async get(key: string) { return store.get(key) ?? null; }
  async set(key: string, value: string) { store.set(key, value); return "OK"; }
  async del(...keys: string[]) { keys.forEach(k => store.delete(k)); return keys.length; }
  async scan(_cursor: string, _match: string, _pattern: string, _count: string, _n: number) {
    return ["0", []];
  }
  on() { return this; }
  connect() { return Promise.resolve(); }
  quit() { return Promise.resolve(); }
}

export default RedisMock;
module.exports = RedisMock;
module.exports.default = RedisMock;
