const request = require('supertest');
const app = require('../../server');

describe('[VULN-10] Headers de Segurança HTTP (Helmet + CSP)', () => {

  test('Resposta deve conter X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('Resposta deve conter X-Frame-Options para prevenir Clickjacking', async () => {
    const res = await request(app).get('/');
    const frameOptions = res.headers['x-frame-options'];
    expect(['DENY', 'SAMEORIGIN']).toContain(frameOptions);
  });

  test('Resposta deve conter Strict-Transport-Security (HSTS)', async () => {
    const res = await request(app).get('/');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  test('Resposta deve ter Content-Security-Policy configurado', async () => {
    const res = await request(app).get('/');
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    
    expect(csp).toContain("default-src 'self'");
    
    expect(csp).toContain('cdn.jsdelivr.net');
  });

  test('X-Powered-By deve ser removido (não vazar stack)', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
