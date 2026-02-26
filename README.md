# KolayAidat

Apartman yöneticileri ve sakinler için modern, tam-stack aidat takip uygulaması. Yöneticiler daire ve aidat tanımlar, sakinler dekont yükler; yönetici onay/red yapıp e-posta bildirimi gönderir.

> **Canlı Demo:** _Yakında eklenecek_

---

## Özellikler

| Rol | Özellikler |
|---|---|
| **Yönetici** | Apartman & daire yönetimi, sakin davet (e-posta), aidat tanımlama, dekont onay/red, e-posta bildirimi |
| **Sakin** | Dekont yükleme (UploadThing), ödeme geçmişi, durum takibi |

- JWT tabanlı oturum yönetimi (NextAuth v5)
- Davet bağlantısı ile sakin kaydı (48 saat geçerli token)
- Mobil uyumlu arayüz (hamburger menü)
- Türkçe kullanıcı arayüzü

---

## Tech Stack

| Katman | Teknoloji |
|---|---|
| **Framework** | Next.js 14 (App Router, Server Components) |
| **Dil** | TypeScript 5 |
| **Veritabanı** | PostgreSQL (Neon) |
| **ORM** | Prisma 5 |
| **Auth** | NextAuth.js v5 beta (Credentials + JWT) |
| **UI** | Tailwind CSS + shadcn/ui + Radix UI |
| **E-posta** | Resend |
| **Dosya yükleme** | UploadThing v7 |
| **İkonlar** | Lucide React |
| **Toast** | Sonner |
| **Deploy** | Vercel |

---

## Mimari

```
src/
├── app/
│   ├── (auth)/              # /login  /register  /invite
│   ├── (dashboard)/         # Korumalı sayfalar (middleware)
│   │   ├── layout.tsx       # Server Component — session kontrolü
│   │   ├── loading.tsx      # Skeleton fallback
│   │   ├── error.tsx        # Error boundary
│   │   ├── dashboard/       # Admin & Resident dashboard
│   │   ├── apartments/      # CRUD + daire + aidat + dekont
│   │   ├── my-payments/     # Sakin: dekont yükleme
│   │   └── profile/         # Profil & şifre
│   └── api/
│       ├── auth/            # register
│       ├── apartments/      # CRUD, units, invite, dues, payments
│       ├── payments/        # Onay / red
│       ├── profile/         # Profil & şifre güncelleme
│       └── uploadthing/     # UploadThing file router
├── components/
│   ├── ui/                  # shadcn/ui bileşenleri
│   ├── sidebar.tsx          # Dashboard navigasyon
│   └── dashboard-shell.tsx  # Mobile sidebar yönetimi
├── lib/
│   ├── prisma.ts            # Prisma singleton
│   ├── email.ts             # Resend e-posta şablonları
│   └── uploadthing.ts       # UploadThing file router
├── auth.ts                  # NextAuth config
└── middleware.ts            # Route koruma
```

**Veri akışı:**
- Dashboard sayfaları Server Component — Prisma doğrudan çağrılır, fetch() cache'i devre dışı
- Mutasyonlar REST API Route'ları üzerinden yapılır (Client Component → fetch → API Route → Prisma)
- Oturum bilgisi JWT token içinde tutulur; middleware her dashboard isteğinde kontrol eder

---

## Kurulum

### Gereksinimler

- Node.js 18+
- PostgreSQL veritabanı (Neon önerilir — ücretsiz tier yeterli)
- Resend hesabı (e-posta gönderimi için)
- UploadThing hesabı (dekont yükleme için)

### 1. Repoyu klonla

```bash
git clone https://github.com/akincskn/kolayaidat.git
cd kolayaidat
npm install
```

### 2. Ortam değişkenlerini ayarla

`.env` dosyası oluştur:

```env
# Veritabanı (Neon — pgbouncer pooling)
DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require&pgbouncer=true&connect_timeout=15"
DIRECT_URL="postgresql://USER:PASS@HOST/DB?sslmode=require"

# NextAuth
AUTH_SECRET="en-az-32-karakter-rastgele-string"
NEXTAUTH_URL="http://localhost:3000"

# Resend (e-posta)
RESEND_API_KEY="re_..."
RESEND_FROM="KolayAidat <noreply@yourdomain.com>"

# UploadThing
UPLOADTHING_TOKEN="eyJ..."

# Uygulama URL (davet linkleri için)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Veritabanını hazırla

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Uygulamayı başlat

```bash
npm run dev
```

`http://localhost:3000/register` adresine giderek ilk yönetici hesabını oluşturun. Sisteme ikinci bir yönetici eklenemez; sakinler davet bağlantısı ile kayıt olur.

---

## Vercel Deploy

1. Repoyu Vercel'e bağla
2. **Environment Variables** bölümünden `.env` değişkenlerini ekle (`NEXTAUTH_URL` = production URL)
3. Deploy et — `postinstall: prisma generate` otomatik çalışır
4. İlk deploy sonrası production veritabanını hazırla:

```bash
npx prisma migrate deploy
```

---

## Lisans

MIT
