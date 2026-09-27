const request = require('supertest');
const app = require('../../server');
const pool = require('../../config/database');

describe('Fluxo de Cadastro Seguro (Registration)', () => {
  const newUser = {
    nome: 'Novo Usuário',
    email: 'novo@teste.com',
    senha: 'senhaMuitoSegura123!',
    confirmacao_senha: 'senhaMuitoSegura123!'
  };

  afterAll(async () => {
    
    
    try {
      await pool.query('DELETE FROM usuarios WHERE email = $1', [newUser.email]);
    } catch (e) {
      
    }
  });

  test('Deve permitir cadastro com dados válidos', async () => {
    const res = await request(app)
      .post('/api/register')
      .send(newUser);

    expect(res.status).toBe(202);
    expect(res.body.mensagem).toBe('Solicitação de cadastro recebida. Se os dados forem válidos, a conta será processada.');
    
    expect(res.body).not.toHaveProperty('usuario');
  });

  test('Não deve permitir cadastro com e-mail duplicado (mas deve retornar 202 genérico para evitar enumeração)', async () => {
    const res = await request(app)
      .post('/api/register')
      .send(newUser);

    
    expect(res.status).toBe(202);
    expect(res.body.mensagem).toContain('Solicitação de cadastro recebida');
  });

  test('Não deve permitir cadastro se senhas não coincidem', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ ...newUser, email: 'outro@teste.com', confirmacao_senha: 'outrasenha' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('As senhas não coincidem.');
  });

  test('Não deve permitir cadastro com e-mail inválido', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ ...newUser, email: 'email_invalido' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Formato de e-mail inválido.');
  });
  
  test('Não deve permitir cadastro com senha menor que 8 caracteres', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ ...newUser, email: 'outro2@teste.com', senha: '123', confirmacao_senha: '123' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('A senha deve ter pelo menos 8 caracteres.');
  });

  test('Não deve permitir injeção de parâmetros administrativos', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ ...newUser, email: 'admin@teste.com', role: 'admin', isAdmin: true });

    
    
    expect(res.status).toBe(202);
    expect(res.body).not.toHaveProperty('usuario');
    
    
    try {
      await pool.query('DELETE FROM usuarios WHERE email = $1', ['admin@teste.com']);
    } catch (e) {}
  });
});
