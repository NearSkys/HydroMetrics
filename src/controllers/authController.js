const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const totp = require('../utils/totp');
const qrcode = require('qrcode');


const tokenBlacklist = new Set();
exports.isTokenBlacklisted = (token) => tokenBlacklist.has(token);

exports.register = async (req, res) => {
  const { nome, email, senha, confirmacao_senha } = req.body;

  if (!nome || !email || !senha || !confirmacao_senha) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
  }

  if (senha !== confirmacao_senha) {
    return res.status(400).json({ erro: 'As senhas não coincidem.' });
  }

  if (senha.length < 8) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ erro: 'Formato de e-mail inválido.' });
  }

  try {
    const salt = await bcrypt.genSalt(12); 
    const hash = await bcrypt.hash(senha, salt);

    const { rows } = await db.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email, criado_em',
      [nome, email.toLowerCase(), hash]
    );

    const novoUsuario = rows[0];

    return res.status(202).json({
      mensagem: 'Solicitação de cadastro recebida. Se os dados forem válidos, a conta será processada.'
    });

  } catch (error) {
    
    if (error.code === '23505') {
      
      return res.status(202).json({ 
        mensagem: 'Solicitação de cadastro recebida. Se os dados forem válidos, a conta será processada.' 
      });
    }
    console.error('Erro no cadastro:', error);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
};

exports.login = async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });

  try {
    
    const { rows } = await db.query('SELECT id, nome, email, senha FROM usuarios WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(401).json({ erro: 'Credenciais inválidas.' });

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) return res.status(401).json({ erro: 'Credenciais inválidas.' });

    
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '30m' }
    );

    
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 30 * 60 * 1000 
    });

    res.status(200).json({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
};

exports.logout = (req, res) => {
  
  const token = req.cookies.auth_token;
  if (token) {
    tokenBlacklist.add(token);
  }

  
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });
  res.status(200).json({ mensagem: 'Sessão encerrada com sucesso.' });
};






exports.obterStatusTOTP = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, email, totp_ativo FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const u = rows[0];
    return res.status(200).json({
      totp_ativo: Boolean(u.totp_ativo),
      email: u.email,
      nome: u.nome
    });
  } catch (error) {
    console.error('Erro ao consultar status TOTP:', error);
    return res.status(500).json({ erro: 'Erro interno ao consultar status de segurança.' });
  }
};


exports.iniciarSetupTOTP = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, email, totp_ativo, totp_secret FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    if (rows[0].totp_ativo) {
      return res.status(403).json({ erro: 'Autenticador 2FA já está ativo. Para reconfigurar, solicite a desativação através do suporte ou de um fluxo seguro.' });
    }

    const u = rows[0];
    const secret = totp.generateSecret();

    
    await db.query(
      'UPDATE usuarios SET totp_secret = $1 WHERE id = $2',
      [secret, u.id]
    );

    const uri = totp.getOtpAuthUri(u.email, 'HydroMetrics O&M', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(uri);

    return res.status(200).json({
      secret,
      uri,
      qrCode: qrCodeDataUrl,
      mensagem: 'Chave de autenticação gerada com sucesso.'
    });
  } catch (error) {
    console.error('Erro no setup TOTP:', error);
    return res.status(500).json({ erro: 'Erro interno ao iniciar setup do autenticador.' });
  }
};


exports.confirmarSetupTOTP = async (req, res) => {
  const { codigo } = req.body;
  if (!codigo) {
    return res.status(400).json({ erro: 'O código de 6 dígitos do autenticador é obrigatório.' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, totp_secret FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0 || !rows[0].totp_secret) {
      return res.status(400).json({ erro: 'Nenhum segredo de autenticação encontrado. Inicie a configuração novamente.' });
    }

    const { totp_secret } = rows[0];
    const valido = totp.verifyTOTP(codigo, totp_secret);

    if (!valido) {
      return res.status(400).json({ erro: 'Código incorreto ou expirado. Verifique o relógio do seu dispositivo.' });
    }

    await db.query(
      'UPDATE usuarios SET totp_ativo = TRUE WHERE id = $1',
      [req.user.id]
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Autenticação de 2 Fatores (TOTP) ativada com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao confirmar TOTP:', error);
    return res.status(500).json({ erro: 'Erro interno ao validar autenticador.' });
  }
};


exports.trocarSenhaComTOTP = async (req, res) => {
  const { senha_atual, nova_senha, confirmacao_senha, codigo_totp } = req.body;

  if (!senha_atual || !nova_senha || !confirmacao_senha || !codigo_totp) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios (senha atual, nova senha, confirmação e código TOTP).' });
  }

  if (nova_senha !== confirmacao_senha) {
    return res.status(400).json({ erro: 'A nova senha e a confirmação não coincidem.' });
  }

  if (nova_senha.length < 8) {
    return res.status(400).json({ erro: 'A nova senha deve ter no mínimo 8 caracteres.' });
  }

  if (senha_atual === nova_senha) {
    return res.status(400).json({ erro: 'A nova senha deve ser diferente da senha atual.' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, senha, totp_secret, totp_ativo FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const user = rows[0];

    
    const senhaCorreta = await bcrypt.compare(senha_atual, user.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Senha atual incorreta.' });
    }

    
    if (!user.totp_ativo || !user.totp_secret) {
      return res.status(403).json({
        erro: 'É obrigatório ativar o Autenticador TOTP (2FA) antes de alterar a senha.'
      });
    }

    const totpValido = totp.verifyTOTP(codigo_totp, user.totp_secret);
    if (!totpValido) {
      return res.status(401).json({
        erro: 'Código TOTP incorreto ou expirado. Verifique o código de 6 dígitos no app.'
      });
    }

    
    const salt = await bcrypt.genSalt(12);
    const novoHash = await bcrypt.hash(nova_senha, salt);

    await db.query(
      'UPDATE usuarios SET senha = $1 WHERE id = $2',
      [novoHash, user.id]
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Senha alterada com sucesso com confirmação TOTP!'
    });
  } catch (error) {
    console.error('Erro na alteração de senha com TOTP:', error);
    return res.status(500).json({ erro: 'Erro interno ao atualizar senha.' });
  }
};
