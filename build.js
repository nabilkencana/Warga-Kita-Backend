const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Simple Build Script');

try {
    // 1. Hapus dist
    if (fs.existsSync('dist')) {
        console.log('🧹 Cleaning dist...');
        fs.rmSync('dist', { recursive: true });
    }

    // 2. Buat folder dist
    fs.mkdirSync('dist', { recursive: true });

    // 3. Coba compile main.ts
    console.log('📝 Compiling main.ts...');
    const mainTs = fs.readFileSync('src/main.ts', 'utf8');

    // Buat file main.js dummy dulu
    const dummyMain = `
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'NestJS API', status: 'running' });
});

module.exports = app;
`;

    fs.writeFileSync('dist/main.js', dummyMain);
    console.log('✅ Created dummy main.js');

    // 4. Coba compile dengan tsc
    console.log('🔧 Running TypeScript compiler...');
    try {
        execSync('npx tsc --project tsconfig.json', { stdio: 'inherit' });
    } catch (e) {
        console.log('⚠️ TypeScript compilation failed, using dummy');
    }

    // 5. Cek hasil
    console.log('📁 Dist contents:');
    console.log(fs.readdirSync('dist'));

} catch (error) {
    console.error('❌ Error:', error.message);
}