// api/index.js
const fs = require('fs');
const path = require('path');

console.log('📁 Current directory:', process.cwd());
console.log('📁 Directory contents:', fs.readdirSync('.'));
console.log('📁 Dist exists?', fs.existsSync('dist'));
if (fs.existsSync('dist')) {
    console.log('📁 Dist contents:', fs.readdirSync('dist'));
}

module.exports = async (req, res) => {
    try {
        // Cek apakah dist/main.js ada
        const mainPath = path.join(__dirname, '../dist/main.js');

        if (!fs.existsSync(mainPath)) {
            console.error('❌ dist/main.js not found at:', mainPath);
            return res.status(500).json({
                error: 'Build Error',
                message: 'Application not built properly. Please check build logs.'
            });
        }

        console.log('✅ Found dist/main.js at:', mainPath);

        // Dynamic import untuk NestJS app
        const { bootstrap } = require(mainPath);

        // Initialize app
        const { app } = await bootstrap();

        // Get Express instance
        const server = app.getHttpAdapter().getInstance();

        // Handle request
        return server(req, res);

    } catch (error) {
        console.error('🔥 Vercel handler error:', error);
        console.error('🔥 Error stack:', error.stack);

        return res.status(500).json({
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'production'
                ? 'Server error. Please try again later.'
                : error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};