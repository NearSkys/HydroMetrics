const db = require('../config/database');

exports.obterIndicadores = async (req, res) => {
  try {
    const periodoDias = parseInt(req.query.periodo_dias) || 30;

    
    
    const equipamentoIdRaw = req.query.equipamento_id;
    let equipamentoId = null;
    if (equipamentoIdRaw !== undefined && equipamentoIdRaw !== null && String(equipamentoIdRaw).trim() !== '') {
      equipamentoId = parseInt(equipamentoIdRaw, 10);
      if (isNaN(equipamentoId) || equipamentoId <= 0) {
        return res.status(400).json({ erro: 'Parâmetro equipamento_id inválido. Deve ser um número inteiro positivo.' });
      }
    }
    
    let eqFiltro = '';
    const paramArray = [periodoDias];
    if (equipamentoId) {
      eqFiltro = ' AND equipamento_id = $2';
      paramArray.push(equipamentoId);
    }

    
    const kpiQuery = `
      SELECT 
        ROUND(AVG(eficiencia_percentual), 2) as eficiencia_media_geral,
        COUNT(id) as total_leituras,
        SUM(CASE WHEN status = 'Falha' THEN 1 ELSE 0 END) as total_falhas
      FROM leituras_operacao
      WHERE data_leitura >= NOW() - ($1 || ' days')::INTERVAL
      ${eqFiltro}
    `;
    const kpiResult = await db.query(kpiQuery, paramArray);
    const kpis = kpiResult.rows[0];
    
    kpis.eficiencia_media_geral = parseFloat(kpis.eficiencia_media_geral) || 0;
    kpis.total_leituras = parseInt(kpis.total_leituras) || 0;
    kpis.total_falhas = parseInt(kpis.total_falhas) || 0;

    const disponibilidadeQuery = `
      SELECT status, COUNT(*) as quantidade
      FROM leituras_operacao
      WHERE data_leitura >= NOW() - ($1 || ' days')::INTERVAL
      ${eqFiltro}
      GROUP BY status
    `;
    const dispResult = await db.query(disponibilidadeQuery, paramArray);
    
    const distribuicao_status = { operacional: 0, falha: 0, detalhe_falhas: {} };
    for (const r of dispResult.rows) {
      if (r.status === 'Operacional') distribuicao_status.operacional = parseInt(r.quantidade);
      else if (r.status === 'Falha') distribuicao_status.falha = parseInt(r.quantidade);
    }
    
    const totalLeituras = kpis.total_leituras || 1;
    kpis.taxa_disponibilidade_percentual = parseFloat(((distribuicao_status.operacional / totalLeituras) * 100).toFixed(2));

    const falhasQuery = `
      SELECT tipo_falha, COUNT(*) as qtd
      FROM leituras_operacao
      WHERE status = 'Falha' AND data_leitura >= NOW() - ($1 || ' days')::INTERVAL
      ${eqFiltro}
      GROUP BY tipo_falha
    `;
    const falhasResult = await db.query(falhasQuery, paramArray);
    for (const f of falhasResult.rows) {
      distribuicao_status.detalhe_falhas[f.tipo_falha] = parseInt(f.qtd);
    }

    
    const serieTemporalQuery = `
      SELECT DATE(data_leitura) as data, ROUND(AVG(eficiencia_percentual), 2) as eficiencia_media
      FROM leituras_operacao
      WHERE data_leitura >= NOW() - ($1 || ' days')::INTERVAL
      ${eqFiltro}
      GROUP BY DATE(data_leitura)
      ORDER BY data ASC
    `;
    const serieResult = await db.query(serieTemporalQuery, paramArray);

    
    const scatterQuery = `
      SELECT torque_nm as y, velocidade_rotacao_rpm as x, status
      FROM leituras_operacao
      WHERE data_leitura >= NOW() - ($1 || ' days')::INTERVAL
      ${eqFiltro}
      ORDER BY RANDOM() LIMIT 300
    `;
    const scatterResult = await db.query(scatterQuery, paramArray);

    
    const alertasQuery = `
      SELECT e.nome_equipamento, l.data_leitura, l.tipo_falha
      FROM leituras_operacao l
      JOIN equipamentos e ON e.id = l.equipamento_id
      WHERE l.status = 'Falha'
      ${equipamentoId ? ' AND l.equipamento_id = $1 ' : ''}
      ORDER BY l.data_leitura DESC
      LIMIT 10
    `;
    const alertasResult = await db.query(alertasQuery, equipamentoId ? [equipamentoId] : []);

    res.status(200).json({
      kpis,
      distribuicao_status,
      evolucao_eficiencia: serieResult.rows,
      dispersao: scatterResult.rows,
      alertas: alertasResult.rows
    });
  } catch (error) {
    console.error('Erro analítico em Indicadores:', error);
    res.status(500).json({ erro: 'Erro interno ao processar indicadores.' });
  }
};
