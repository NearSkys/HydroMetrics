const db = require('../config/database');

exports.listarEquipamentos = async (req, res) => {
  try {
    
    const query = `
      SELECT e.id, e.codigo_patrimonio, e.nome_equipamento, e.tipo, e.criticidade,
             COUNT(l.id) AS total_leituras,
             (SELECT eficiencia_percentual 
              FROM leituras_operacao 
              WHERE equipamento_id = e.id 
              ORDER BY data_leitura DESC LIMIT 1) AS ultima_eficiencia
      FROM equipamentos e
      LEFT JOIN leituras_operacao l ON e.id = l.equipamento_id
      GROUP BY e.id
      ORDER BY e.codigo_patrimonio ASC;
    `;
    
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao listar equipamentos:', error);
    res.status(500).json({ erro: 'Erro interno ao consultar base de equipamentos.' });
  }
};
