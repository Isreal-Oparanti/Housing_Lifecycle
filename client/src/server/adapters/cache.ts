/** Small in-memory cache with an expiry and a size cap, for slow-changing lookups. */
export class TtlCache<T> {
  private readonly entries = new Map<string, { expires: number; value: T }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
  ) {}

  get(key: string): { value: T } | undefined {
    const hit = this.entries.get(key);
    if (!hit || hit.expires <= Date.now()) return undefined;
    return { value: hit.value };
  }

  set(key: string, value: T): void {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { expires: Date.now() + this.ttlMs, value });
  }
}
