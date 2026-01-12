const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
const expiry = process.env.JWT_EXPIRY || '7d';

const generateToken = (adminId, username) => {
  return jwt.sign(
    { adminId, username },
    secret,
    { expiresIn: expiry }
  );
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
      console.error("Error is " + error)
    return null;
  }
};

module.exports = { generateToken, verifyToken };