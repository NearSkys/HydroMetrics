const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('../controllers/authController');

const authMiddleware = (req, res, next) => {
  
  
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ erro: 'Acesso não autorizado. Sessão inexistente.' });
  }

  
  if (isTokenBlacklisted(token)) {
    return res.status(401).json({ erro: 'Sessão revogada. Faça login novamente.' });
  }

  try {
    
    
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    
    
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
};

module.exports = authMiddleware;
