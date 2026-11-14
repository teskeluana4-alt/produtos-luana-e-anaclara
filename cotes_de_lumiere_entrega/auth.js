const crypto = require('crypto');

const sessions = new Map();

const TTL = 1000 * 60 * 60 * 8;

function cookie(req) {
    const m = (req.headers.cookie || '').match(
        /(?:^|;\s*)cl_session=([^;]+)/
    );

    return m ? m[1] : null;
}

function auth(req, res, next) {
    const token = cookie(req);
    const data = token && sessions.get(token);

    if (data && data.expires > Date.now()) {
        req.auth = data;
        data.expires = Date.now() + TTL;
    } else {
        if (token) {
            sessions.delete(token);
        }

        req.auth = null;
    }

    res.locals.currentUser = req.auth || null;

    next();
}

function login(res, user) {
    const token = crypto.randomBytes(32).toString('hex');

    sessions.set(token, {
        ...user,
        expires: Date.now() + TTL
    });

    res.cookie('cl_session', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: TTL,
        path: '/'
    });
}


function logout(req, res) {
    const token = cookie(req);

    if (token) {
        sessions.delete(token);
    }

    res.clearCookie('cl_session', {
        path: '/'
    });
}

function requireUser(req, res, next) {
    if (!req.auth) {
        return res.redirect('/');
    }

    next();
}

module.exports = {
    auth,
    login,
    logout,
    requireUser
};
