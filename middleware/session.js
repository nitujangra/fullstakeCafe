const session = require('express-session');

const sessionMiddleware = session({
    secret: 'fullstack_cafe_secret_key', // Keep this secret
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        secure: false // Set to true if using https
    }
});

module.exports = sessionMiddleware;