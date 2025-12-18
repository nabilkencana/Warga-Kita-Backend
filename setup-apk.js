const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔄 Setup APK Warga Kita\n');

const publicDir = path.join(__dirname, 'public');
const downloadDir = path.join(publicDir, 'download');

// Buat folder jika belum ada
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
    console.log('✅ Folder download dibuat');
}

const apkPath = path.join(downloadDir, 'app-release.apk');

// Cek apakah sudah ada APK
if (fs.existsSync(apkPath)) {
    const stats = fs.statSync(apkPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    rl.question(`APK sudah ada (${sizeMB} MB). Ganti dengan file baru? (y/N): `, (answer) => {
        if (answer.toLowerCase() === 'y') {
            copyApkFile();
        } else {
            showCurrentInfo();
            rl.close();
        }
    });
} else {
    copyApkFile();
}

function copyApkFile() {
    console.log('\n📋 Instruksi:');
    console.log('1. Letakkan file APK Anda di lokasi berikut:');
    console.log(`   ${apkPath}`);
    console.log('\n2. Atau masukkan path lengkap ke file APK Anda:');

    rl.question('Path ke file APK (kosongkan untuk skip): ', (inputPath) => {
        if (inputPath.trim()) {
            try {
                if (fs.existsSync(inputPath)) {
                    fs.copyFileSync(inputPath, apkPath);
                    const stats = fs.statSync(apkPath);
                    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                    console.log(`✅ APK berhasil disalin (${sizeMB} MB)`);
                    showCurrentInfo();
                } else {
                    console.log('❌ File tidak ditemukan');
                }
            } catch (error) {
                console.log('❌ Error:', error.message);
            }
        } else {
            console.log('⚠️  Lewati. Pastikan Anda menempatkan APK secara manual.');
            console.log(`   Lokasi: ${apkPath}`);
        }
        rl.close();
    });
}

function showCurrentInfo() {
    if (fs.existsSync(apkPath)) {
        const stats = fs.statSync(apkPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('\n📊 Informasi APK:');
        console.log(`   Nama: warga-kita.apk`);
        console.log(`   Ukuran: ${sizeMB} MB`);
        console.log(`   Lokasi: ${apkPath}`);
        console.log(`\n🌐 URL Download: http://localhost:1922/download/app-release.apk`);
        console.log(`📝 Halaman: http://localhost:1922`);
        console.log(`🔍 Verifikasi: http://localhost:1922/api/verify-apk`);
    } else {
        console.log('\n❌ APK belum tersedia');
        console.log(`   Letakkan file APK di: ${apkPath}`);
    }
    console.log('\n🚀 Jalankan server: npm run start:dev');
}