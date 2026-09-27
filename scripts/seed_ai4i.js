require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');



const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ast_db',
  user: process.env.DB_USER || 'ast_app_user',
  password: process.env.DB_PASSWORD,
});

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    
    

    
    console.log('Inserindo equipamentos...');
    const equipamentos = [
      { cod: 'EQP-L01', nome: 'Bomba de Captação e Recalque B-01', tipo: 'Bomba Centrífuga', crit: 'Alta' },
      { cod: 'EQP-M02', nome: 'Motor de Tratamento Biológico M-02', tipo: 'Motor de Aeração', crit: 'Média' },
      { cod: 'EQP-H03', nome: 'Compressor de Aeração C-03', tipo: 'Compressor', crit: 'Alta' }
    ];

    const equipIds = {};
    for (const eq of equipamentos) {
      const res = await client.query(
        `INSERT INTO equipamentos (codigo_patrimonio, nome_equipamento, tipo, criticidade)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (codigo_patrimonio) DO UPDATE SET nome_equipamento = EXCLUDED.nome_equipamento
         RETURNING id`,
        [eq.cod, eq.nome, eq.tipo, eq.crit]
      );
      
      equipIds[eq.cod.substring(4, 5)] = res.rows[0].id; 
    }

    
    console.log('Iniciando ETL do arquivo AI4I 2020...');
    
    
    let targetPath = path.join(__dirname, '../data/ai4i2020.xls');
    if (!fs.existsSync(targetPath)) {
        targetPath = path.join(__dirname, '../docs/ai4i2020.xls');
    }
    if (!fs.existsSync(targetPath)) {
        targetPath = path.join(__dirname, '../docs_projeto/ai4i2020.xls');
    }

    if (!fs.existsSync(targetPath)) {
        throw new Error(`Arquivo de dados CSV não encontrado.`);
    }

    const records = [];
    const parser = fs.createReadStream(targetPath).pipe(parse({
      columns: true,
      skip_empty_lines: true,
      cast: true 
    }));

    let baseTime = new Date().getTime(); 
    
    for await (const row of parser) {
      const equipId = equipIds[row['Type']];
      if (!equipId) continue;

      
      const timestamp = new Date(baseTime);
      baseTime -= 15 * 60 * 1000;

      const machineFailure = parseInt(row['Machine failure']) === 1;
      let eficiencia = 0;
      let status = 'Operacional';
      let tipoFalha = null;

      if (!machineFailure) {
        
        const torque = parseFloat(row['Torque [Nm]']);
        const toolWear = parseInt(row['Tool wear [min]']);
        eficiencia = 100 - (toolWear * 0.08) - (Math.abs((torque - 40) / 40) * 5);
        if (eficiencia < 82.0) eficiencia = 82.0;
        if (eficiencia > 99.5) eficiencia = 99.5;
      } else {
        
        eficiencia = Math.random() * 35.0;
        status = 'Falha';
        
        
        if (parseInt(row['TWF']) === 1) tipoFalha = 'TWF';
        else if (parseInt(row['HDF']) === 1) tipoFalha = 'HDF';
        else if (parseInt(row['PWF']) === 1) tipoFalha = 'PWF';
        else if (parseInt(row['OSF']) === 1) tipoFalha = 'OSF';
        else if (parseInt(row['RNF']) === 1) tipoFalha = 'RNF';
        else tipoFalha = 'OUTRA_FALHA';
      }

      records.push([
        equipId,
        timestamp,
        parseFloat(eficiencia.toFixed(2)),
        status,
        parseFloat(row['Air temperature [K]']),
        parseFloat(row['Process temperature [K]']),
        parseInt(row['Rotational speed [rpm]']),
        parseFloat(row['Torque [Nm]']),
        parseInt(row['Tool wear [min]']),
        tipoFalha
      ]);

      
      if (records.length === 1000) {
        await insertBatch(client, records);
        records.length = 0; 
      }
    }

    
    if (records.length > 0) {
      await insertBatch(client, records);
    }

    await client.query('COMMIT');
    console.log('ETL concluído com sucesso! Banco de dados inicializado.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro durante o ETL:', err);
  } finally {
    client.release();
    await pool.end();
  }
}


async function insertBatch(client, records) {
  const values = [];
  const placeholders = [];
  let paramCount = 1;
  
  for (const record of records) {
    const recordPlaceholders = [];
    for (const val of record) {
      values.push(val);
      recordPlaceholders.push(`$${paramCount}`);
      paramCount++;
    }
    placeholders.push(`(${recordPlaceholders.join(',')})`);
  }

  const query = `
    INSERT INTO leituras_operacao (
      equipamento_id, data_leitura, eficiencia_percentual, status,
      temperatura_ar_k, temperatura_processo_k, velocidade_rotacao_rpm,
      torque_nm, desgaste_ferramenta_min, tipo_falha
    ) VALUES ${placeholders.join(',')}
  `;

  await client.query(query, values);
}

seed();
