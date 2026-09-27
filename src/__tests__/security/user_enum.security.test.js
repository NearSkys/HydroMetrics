const request = require('supertest');
const app = require('../../server');
const pool = require('../../config/database');

describe('User Enumeration Security Test', () => {
  const testUser = {
    nome: 'Test Enum',
    email: 'enum@teste.com',
    senha: 'senhaMuitoSegura123!',
    confirmacao_senha: 'senhaMuitoSegura123!'
  };

  beforeAll(async () => {
    await request(app).post('/api/register').send(testUser);
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM usuarios WHERE email = $1', [testUser.email]);
    } catch (e) {}
  });

  test('Não deve revelar se o email já existe (Prevenção de Enumeração)', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ ...testUser, nome: 'Outro Nome' });

    
    
    expect(res.status).toBe(202); 
    expect(res.body.mensagem).toBe('Solicitação de cadastro recebida. Se os dados forem válidos, a conta será processada.');
  });
});
