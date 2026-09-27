const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authMiddleware');
const { loginLimiter, registerLimiter, passwordChangeLimiter } = require('../middlewares/rateLimiter');

const AuthController = require('../controllers/authController');
const EquipamentoController = require('../controllers/equipamentoController');
const IndicadorController = require('../controllers/indicadorController');





router.post('/login', loginLimiter, AuthController.login);
router.post('/register', registerLimiter, AuthController.register);
router.post('/logout', AuthController.logout);





router.use(authMiddleware);

router.get('/equipamentos', EquipamentoController.listarEquipamentos);
router.get('/indicadores', IndicadorController.obterIndicadores);


router.get('/seguranca/totp-status', AuthController.obterStatusTOTP);
router.post('/seguranca/totp-setup', AuthController.iniciarSetupTOTP);
router.post('/seguranca/totp-confirmar', AuthController.confirmarSetupTOTP);
router.post('/seguranca/trocar-senha', passwordChangeLimiter, AuthController.trocarSenhaComTOTP);

module.exports = router;
