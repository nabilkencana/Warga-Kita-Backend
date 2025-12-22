// api/index.js
const { createServer } = require('http');

// Import Prisma client dulu
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let cachedServer;

module.exports = async (req, res) => {
    if (!cachedServer) {
        try {
            // Pastikan Prisma client siap
            await prisma.$connect();
            console.log('✅ Prisma connected');

            // Import NestJS app setelah Prisma ready
            const { bootstrap } = require('../dist/main');
            const { app } = await bootstrap();

            cachedServer = createServer(app.getHttpAdapter().getInstance());
            console.log('✅ NestJS app initialized for Vercel');
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: error.message
            });
        }
    }

    return cachedServer.emit('request', req, res);
};