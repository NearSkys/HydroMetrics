const request = require('supertest');
const app = require('../../server');


async function getAuthCookie() {
  const res = await request(app)
    .post('/api/login')
    .send({ email: 'gestor@test.com', senha: 'senhavalida123' });
  return res.headers['set-cookie'][0];
}




describe('[VULN-06] Proteção contra SQL Injection', () => {

  
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE usuarios; --",
    "1' UNION SELECT * FROM usuarios --",
    "admin'--",
    "' OR 1=1--",
    "1; SELECT pg_sleep(5)--",    
    "\\x27 OR 1=1",               
  ];

  describe('No endpoint de login (email field)', () => {
    sqlInjectionPayloads.forEach((payload) => {
      test(`Payload "${payload.substring(0, 30)}..." deve retornar 401 e não 500`, async () => {
        const res = await request(app)
          .post('/api/login')
          .send({ email: payload, senha: 'qualquercoisa' });

        
        
        expect(res.status).not.toBe(200); 
        expect(res.status).not.toBe(500); 
      });
    });
  });

  describe('No endpoint de indicadores (query params)', () => {
    sqlInjectionPayloads.forEach((payload) => {
      test(`Query param injetado "${payload.substring(0, 30)}..." deve retornar 400 ou 200 seguro`, async () => {
        const cookie = await getAuthCookie();

        const res = await request(app)
          .get('/api/indicadores')
          .query({ equipamento_id: payload }) 
          .set('Cookie', cookie);

        
        
        expect(res.status).not.toBe(500);
        
        if (res.status === 200) {
          expect(res.body).toHaveProperty('kpis');
        }
      });
    });
  });
});
