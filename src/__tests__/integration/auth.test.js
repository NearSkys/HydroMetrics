const request = require('supertest');
const app = require('../../server');

describe('[INTEGRAÇÃO] Fluxo de Autenticação Completo', () => {

  describe('POST /api/login', () => {
    test('Credenciais válidas retornam 200 com dados do usuário', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ email: 'gestor@test.com', senha: 'senhavalida123' });

      expect(res.status).toBe(200);
      expect(res.body.usuario).toHaveProperty('id');
      expect(res.body.usuario).toHaveProperty('nome');
      expect(res.body.usuario).toHaveProperty('email');
      expect(res.body.usuario).not.toHaveProperty('senha'); 
    });

    test('Credenciais inválidas retornam 401', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ email: 'gestor@test.com', senha: 'senhaerrada' });

      expect(res.status).toBe(401);
    });

    test('Corpo incompleto (sem email) retorna 400', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ senha: 'alguma' });

      expect(res.status).toBe(400);
    });

    test('Corpo incompleto (sem senha) retorna 400', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ email: 'gestor@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('Rotas protegidas sem cookie', () => {
    const rotasProtegidas = [
      { method: 'get', path: '/api/equipamentos' },
      { method: 'get', path: '/api/indicadores' },
    ];

    rotasProtegidas.forEach(({ method, path }) => {
      test(`${method.toUpperCase()} ${path} sem cookie retorna 401`, async () => {
        const res = await request(app)[method](path);
        expect(res.status).toBe(401);
      });
    });
  });
});
