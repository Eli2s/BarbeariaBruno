import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.post('/whatsmiau', async (req, res) => {
    try {
        const payload = req.body;

        // Opcional: Validar secret via header ou query param, se configurado no WhatsMiau
        // const secret = req.headers['authorization'];

        console.info(`[Webhook WhatsMiau] Evento recebido: ${payload.event}`);

        // Tratar evento de nova mensagem
        if (payload.event === 'messages.upsert') {
            const messages = payload.data?.messages || [];

            for (const msg of messages) {
                // Salvar apenas mensagens recebidas (podemos salvar as enviadas também se preferir)
                if (!msg.key.fromMe) {
                    const remoteJid = msg.key.remoteJid;
                    const messageId = msg.key.id;
                    const pushName = msg.pushName || '';

                    // Extrair texto (pode vir em textMessage, extendedTextMessage ou conversation)
                    const content = msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text ||
                        msg.message?.textMessage?.text ||
                        '[Mídia/Outro]';

                    // Usa o Prisma para salvar a mensagem na tabela WhatsmiauMessage
                    await prisma.whatsmiauMessage.create({
                        data: {
                            remoteJid,
                            fromMe: msg.key.fromMe || false,
                            messageId,
                            content,
                            pushName,
                            messageType: Object.keys(msg.message || {})[0] || 'text',
                            timestamp: new Date((msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000),
                        }
                    });

                    console.info(`[Webhook WhatsMiau] Mensagem salva de ${remoteJid}`);
                }
            }
        }

        if (payload.event === 'messages.update') {
            console.info(`[Webhook WhatsMiau] Update message:`, payload.data);
            // Aqui você pode atualizar status de lido ou entregue na tabela Message no futuro
        }

        // Importante: Sempre retornar 200 para a WhatsMiau a fim de evitar reenvio de eventos já recebidos
        res.status(200).send('OK');
    } catch (error: any) {
        console.error('[Webhook WhatsMiau] Erro:', error);
        // Mesmo no erro, retornamos 200 no webhook para não prender o lado do provedor em retries constantes
        res.status(200).send('Error Processed');
    }
});

export default router;
