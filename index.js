const express = require('express');
const env = require('dotenv');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool, safeEnd } = require('./db');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');

env.config();
const app = express();
const PORT = process.env.PORT;

app.use(
    session({
        store: new pgSession({
            pool: pool,
            tableName: 'session',
        }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/cart', cartRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
    console.log('Gracefully shutting down...');
    server.close(async () => {
        try {
            await safeEnd();
        } catch (err) {
            console.error('Error closing database pool:', err);
        } finally {
            process.exit(0);
        }
    });
});
