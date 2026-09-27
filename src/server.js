require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();






app.set('trust proxy', 1);


app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"], 
      styleSrc:  ["'self'", "'unsafe-inline'"], 
      imgSrc:    ["'self'", "data:"],
      connectSrc:["'self'"], 
    },
  },
}));

app.use(express.json());


app.use(cookieParser()); 


app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://seu-dominio-aqui.com' : 'http://localhost:3000',
  credentials: true 
}));





app.use(express.static(path.join(__dirname, '../public')));






const apiRoutes = require('./routes/apiRoutes'); 
app.use('/api', apiRoutes);





const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Servidor O&M] Inicializado na porta ${PORT} - Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
