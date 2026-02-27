/**
 * Basit in-memory rate limiter.
 *
 * NOT: Her Vercel serverless function instance'ı kendi belleğine sahiptir.
 * Bu limiter aynı instance'a gelen istekleri kısıtlar — birden fazla
 * instance varsa (yüksek trafik) tam koruma sağlamaz.
 *
 * Tam koruma için: Upstash Redis + @upstash/ratelimit kullanın.
 * https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */

type Entry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Entry>();

/**
 * Verilen key için rate limit kontrolü yapar.
 * @param key       Benzersiz tanımlayıcı (ör. "register:1.2.3.4")
 * @param limit     İzin verilen maksimum istek sayısı
 * @param windowMs  Zaman penceresi (milisaniye)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Süresi dolmuş girişleri temizle (lazy cleanup)
  store.forEach((v, k) => {
    if (now > v.resetAt) store.delete(k);
  });

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * İstemci IP adresini döndürür.
 * Vercel'de X-Forwarded-For başlığı güvenilirdir.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
