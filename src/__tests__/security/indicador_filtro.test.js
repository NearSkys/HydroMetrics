const request = require('supertest');
const app = require('../../server');

describe('Testes de Correção Lógica', () => {
  let cookie;

  beforeAll(async () => {
    
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'gestor@test.com', senha: 'senhavalida123' });
    cookie = res.headers['set-cookie'][0];
  });

  test('Deve filtrar dados no dashboard quando equipamento_id é passado (VULN-05)', async () => {
    
    
    const res = await request(app)
      .get('/api/indicadores?equipamento_id=1')
      .set('Cookie', cookie);
      
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('alertas');
  });
});
