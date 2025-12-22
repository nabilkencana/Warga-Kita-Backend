// index.js di ROOT directory
const fs = require('fs');
const path = require('path');

console.log('=== VERCIEL STARTUP ===');
console.log('CWD:', process.cwd());
console.log('Files:', fs.readdirSync('.').join(', '));

// Coba load dist/main.js
try {
    const mainPath = path.join(__dirname, 'dist/main.js');
    console.log('Looking for:', mainPath);

    if (fs.existsSync(mainPath)) {
        console.log('✅ dist/main.js FOUND');
        const { bootstrap } = require(mainPath);

        let cachedApp = null;

        module.exports = async (req, res) => {
            try {
                if (!cachedApp) {
                    console.log('🚀 Initializing NestJS...');
                    const { app } = await bootstrap();
                    cachedApp = app.getHttpAdapter().getInstance();
                    console.log('✅ NestJS ready');
                }

                return cachedApp(req, res);
            } catch (error) {
                console.error('🔥 NestJS error:', error);
                return res.status(500).json({
                    error: 'NestJS Error',
                    message: error.message
                });
            }
        };
    } else {
        console.log('❌ dist/main.js NOT FOUND');

        // Fallback response
        module.exports = (req, res) => {
            console.log('Request received but no app');
            res.status(200).json({
                message: 'API is building or failed to build',
                timestamp: new Date().toISOString(),
                status: 'building'
            });
        };
    }
} catch (error) {
    console.error('🔥 Startup error:', error);

    module.exports = (req, res) => {
        res.status(500).json({
            error: 'Startup Failed',
            message: error.message,
            stack: error.stack
        });
    };
}