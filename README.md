# WargaKita Backend API

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
</p>

<p align="center">
  <b>Backend API untuk aplikasi WargaKita</b><br/>
  Sistem manajemen data warga, pengumuman, laporan keluhan, SOS darurat, dan pengelolaan dana.
</p>

---

## 📌 Deskripsi

**WargaKita Backend** adalah REST API yang dibangun menggunakan **NestJS** untuk mendukung aplikasi WargaKita.  
Backend ini menangani autentikasi, pengelolaan data warga, pengumuman, laporan keluhan, SOS darurat, serta pengelolaan dana warga.

Backend ini dibuat sebagai **karya lomba aplikasi inovatif** pada kategori sosial & kehidupan sehari-hari.

---

## 🧠 Teknologi

- **Framework**: NestJS
- **Bahasa**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT & OTP
- **Email Service**: SMTP / Resend
- **File Storage**: Cloudinary
- **OAuth**: Google OAuth

---

## 📂 Struktur Proyek

```bash
src/
├── auth/              # Autentikasi & OTP
├── users/             # Manajemen user
├── warga/             # Data warga
├── pengumuman/        # Pengumuman
├── laporan/           # Laporan keluhan
├── sos/               # SOS darurat
├── dana/              # Dana warga
├── prisma/            # Prisma service
├── common/            # Guard, decorator, helper
└── main.ts            # Entry point
```

---

### ⚙️ Environment Variables

Gunakan file .env.example sebagai template.
```bash
cp .env.example .env
```
⚠️ File .env tidak disertakan dalam repository demi keamanan data.

---

### 🧪 Mode Demo (Untuk Juri)

Backend menyediakan Demo Mode untuk memudahkan penilaian lomba.
```env
DEMO_MODE=true
DEMO_OTP=123456
DEMO_ACCOUNTS=admin@wargaapp.id,satpam@wargaapp.id
```

---

### 📦 Instalasi

```bash
npm install
```

### ▶️ Menjalankan Aplikasi
```bash
# Development
npm run start

# Watch mode
npm run start:dev

# Production
npm run start:prod
```
Server berjalan pada:
```arduino
http://localhost:1922
```

---

### 🗄️ Prisma

```bash
# Generate Prisma Client
npx prisma generate

# Migration
npx prisma migrate dev

# Prisma Studio
npx prisma studio
```

---

### 🧪 Testing

```bash
npm run test
npm run test:e2e
npm run test:cov
```

---

### 🔐 Keamanan

- JWT Authentication

- Role-based Access Control

- Validasi file upload

- Environment variable protection

- Demo mode terisolasi

---

# 👨‍💻 Developer

- Nama: Mohammad Nabil Anwar Kencana
- Project: WargaKita

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan edukasi dan lomba.
Hak cipta © 2025 – WargaKita.

---



