const rateLimit = require('express-rate-limit');



const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: process.env.NODE_ENV === 'test' ? 100 : 10, 
  message: { 
    erro: 'Muitas tentativas de login bloqueadas. Por segurança, tente novamente em 15 minutos.' 
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: process.env.NODE_ENV === 'test' ? 100 : 5, 
  message: { 
    erro: 'Muitas tentativas de cadastro a partir deste IP. Tente novamente mais tarde.' 
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: process.env.NODE_ENV === 'test' ? 100 : 5, 
  message: {
    erro: 'Muitas tentativas de alteração de senha bloqueadas. Aguarde 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, registerLimiter, passwordChangeLimiter };

