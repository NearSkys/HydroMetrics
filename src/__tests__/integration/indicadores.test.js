const request = require('supertest');
const app = require('../../server');

async function getAuthCookie() {
  const res = await request(app)
    .post('/api/login')
    .send({ email: 'gestor@test.com', senha: 'senhavalida123' });
  return res.headers['set-cookie'][0];
}

describe('[INTEGRAÇÃO] GET /api/indicadores', () => {
  let cookie;

  beforeAll(async () => { cookie = await getAuthCookie(); });

  test('Retorna estrutura correta de KPIs', async () => {
    const res = await request(app)
      .get('/api/indicadores')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('distribuicao_status');
    expect(res.body).toHaveProperty('evolucao_eficiencia');
    expect(res.body.kpis).toHaveProperty('eficiencia_media_geral');
    expect(res.body.kpis).toHaveProperty('taxa_disponibilidade_percentual');
    expect(res.body.kpis).toHaveProperty('total_falhas');
  });

  test('KPI de eficiência é numérico entre 0 e 100', async () => {
    const res = await request(app)
      .get('/api/indicadores')
      .set('Cookie', cookie);

    const eficiencia = res.body.kpis.eficiencia_media_geral;
    expect(typeof eficiencia).toBe('number');
    expect(eficiencia).toBeGreaterThanOrEqual(0);
    expect(eficiencia).toBeLessThanOrEqual(100);
  });

  test('Filtro por equipamento_id válido retorna 200', async () => {
    const res = await request(app)
      .get('/api/indicadores?equipamento_id=1')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
  });

  test('Filtro por equipamento_id inválido (não numérico) retorna 400', async () => {
    const res = await request(app)
      .get('/api/indicadores?equipamento_id=abc')
      .set('Cookie', cookie);

    expect(res.status).toBe(400);
  });
});
