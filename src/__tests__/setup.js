const app = require('../server'); 
const pool = require('../config/database');


beforeAll(async () => {
  process.env.JWT_SECRET = 'chave_secreta_teste';
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('senhavalida123', 10);
  
  
  
  try {
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
      ['Gestor Teste', 'gestor@test.com', hash]
    );
  } catch (err) {
    
    await pool.query(
      'UPDATE usuarios SET senha = $1 WHERE email = $2',
      [hash, 'gestor@test.com']
    );
  }
});

afterAll(async () => {
  await pool.end(); 
});

module.exports = { app };
