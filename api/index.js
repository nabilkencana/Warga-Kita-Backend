// api/index.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Import serverless handler dari NestJS
const serverless = require('serverless-http');
const { bootstrap } = require('../dist/main');

let app;
let serverlessHandler;

module.exports = async (req, res) => {
    if (!app) {
        app = await bootstrap();
        serverlessHandler = serverless(app);
    }

    return serverlessHandler(req, res);
};