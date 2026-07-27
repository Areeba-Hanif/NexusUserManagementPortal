const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET  ;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: "No Authorization header provided." });
    }

    // Expecting: "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ message: "Access Token Missing or Invalid." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        return res.status(403).json({ message: "Invalid or expired token. Please log in again." });
    }
};

module.exports = verifyToken;