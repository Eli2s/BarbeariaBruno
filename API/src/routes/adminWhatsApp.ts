import { Router } from 'express';
import whatsMiauService from '../services/WhatsMiauService';

const router = Router();

// Middleware simples para proteger a rota admin (pode ser ajustado conforme a autenticação da aplicação)
const adminAuth = (req: any, res: any, next: any) => {
    // const authHeader = req.headers.authorization;
    // Aqui você pode inserir sua lógica de validação de token ou admin
    // if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });
    next();
};

router.use(adminAuth);

router.get('/qrcode', async (req, res) => {
    console.log('[WhatsApp] GET /qrcode');
    try {
        const qrCodeData = await whatsMiauService.getQRCode();
        res.json(qrCodeData);
    } catch (error: any) {
        console.error('[WhatsApp] Erro em GET /qrcode:', error.message);
        res.status(500).json({ error: error.message || 'Erro ao obter QR Code' });
    }
});

router.post('/create-instance', async (req, res) => {
    console.log('[WhatsApp] POST /create-instance');
    try {
        const instanceData = await whatsMiauService.createInstance();
        res.status(201).json(instanceData);
    } catch (error: any) {
        console.error('[WhatsApp] Erro em POST /create-instance:', error.message);
        res.status(500).json({ error: error.message || 'Erro ao criar instância' });
    }
});

router.delete('/delete-instance', async (req, res) => {
    console.log('[WhatsApp] DELETE /delete-instance');
    try {
        const result = await whatsMiauService.deleteInstance();
        res.json({ success: true, result });
    } catch (error: any) {
        console.error('[WhatsApp] Erro em DELETE /delete-instance:', error.message);
        res.status(500).json({ success: false, error: error.message || 'Erro ao deletar instância' });
    }
});

router.post('/send-text', async (req, res) => {
    try {
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
        }
        // Usar serviço do WhatsMiau
        const result = await whatsMiauService.sendText(phone, message);
        res.json({ success: true, result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Erro ao enviar mensagem' });
    }
});

export default router;
