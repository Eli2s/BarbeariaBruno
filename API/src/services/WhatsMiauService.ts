import axios, { AxiosInstance } from 'axios';

class WhatsMiauService {
    private static instance: WhatsMiauService;
    private api: AxiosInstance;
    private apiKey: string;
    private instanceName: string;
    private instanceId: string; // ObjectID retornado por GET /evolution/instances

    private constructor() {
        this.apiKey = process.env.WHATSMIAU_API_KEY || '';
        this.instanceName = process.env.WHATSMIAU_INSTANCE_NAME || 'bruno-online_92679e64';
        this.instanceId = process.env.WHATSMIAU_INSTANCE_ID || '69a4b6e99cf22707df138d3d';
        const baseURL = process.env.WHATSMIAU_BASE_URL || 'https://api.whatsmiau.dev';

        if (!this.apiKey) {
            console.warn('⚠️ WHATSMIAU_API_KEY não está definida no ambiente.');
        }

        this.api = axios.create({
            baseURL,
            headers: {
                'apikey': this.apiKey,
                'Content-Type': 'application/json',
            },
        });
    }

    public static getInstance(): WhatsMiauService {
        if (!WhatsMiauService.instance) {
            WhatsMiauService.instance = new WhatsMiauService();
        }
        return WhatsMiauService.instance;
    }

    /**
     * Cria uma nova instância no WhatsMiau. Se qrcode for true, ela já estará pronta para leitura.
     */
    public async createInstance() {
        try {
            const response = await this.api.post('/evolution/instance/create', {
                instanceName: this.instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
            });
            console.info(`✅ Instância ${this.instanceName} criada com sucesso.`);
            return response.data;
        } catch (error: any) {
            console.error(`❌ Erro ao criar instância ${this.instanceName}:`, error?.response?.data || error.message);
            throw new Error(error?.response?.data?.response?.message || 'Erro ao criar instância no WhatsMiau');
        }
    }

    /**
     * Recupera o QR Code (base64) para conectar uma instância criada.
     */
    public async getQRCode() {
        console.log(`[WhatsApp] getQRCode INICIADO para instanceId=${this.instanceId}`);
        try {
            const response = await this.api.get(`/evolution/instance/connect/${this.instanceId}`);
            const data = response.data;
            console.log('[WhatsApp] Resposta do connect:', JSON.stringify(data));

            // Caso 1: Já conectado — WhatsMiau retorna { instance: "Instance already connected" }
            if (typeof data?.instance === 'string' && data.instance.toLowerCase().includes('connected')) {
                return { status: 'CONNECTED' };
            }
            // Caso 2: Conectado — formatos alternativos
            if (data?.instance?.state === 'open' || data?.instance?.status === 'open' || data?.state === 'open' || data?.connected) {
                return { status: 'CONNECTED' };
            }
            // Caso 3: QR Code retornado
            if (data?.base64) {
                return { status: 'DISCONNECTED', base64: data.base64 };
            }
            // Caso 4: Resposta não reconhecida — assume desconectado
            console.warn('[WhatsApp] Resposta não reconhecida do connect, assumindo desconectado:', data);
            return { status: 'DISCONNECTED' };
        } catch (error: any) {
            const status = error?.response?.status;
            const errorData = error?.response?.data;
            console.warn(`[WhatsApp] Erro ao buscar QR Code. HTTP Status: ${status}. Data:`, errorData);

            // Se for 404, a instância não existe. Criar nova automaticamente.
            if (status === 404) {
                console.info(`[WhatsApp] Instância não encontrada (404). Criando nova...`);
                try {
                    const newInstance = await this.createInstance();
                    const qrBase64 = newInstance?.qrcode?.base64 || newInstance?.base64;
                    if (qrBase64) {
                        return { status: 'DISCONNECTED', base64: qrBase64 };
                    }
                    // Se não veio QR na criação, tenta connect novamente
                    const retryResponse = await this.api.get(`/evolution/instance/connect/${this.instanceId}`);
                    const retryData = retryResponse.data;
                    if (retryData?.base64) {
                        return { status: 'DISCONNECTED', base64: retryData.base64 };
                    }
                    return { status: 'DISCONNECTED' };
                } catch (createErr: any) {
                    console.error('[WhatsApp] Erro fatal ao recriar instância:', createErr?.response?.data || createErr.message);
                    throw new Error(`Não foi possível iniciar conexão. Erro na criação: ${createErr?.response?.status || 'desconhecido'}`);
                }
            }

            // Se não for 404, expor o erro real para facilitar o debug em produção
            const errorMessage = errorData?.response?.message || errorData?.message || error.message;
            throw new Error(`Erro API WhatsMiau (${status}): ${errorMessage}`);
        }
    }

    /**
     * Deleta a instância do WhatsMiau (desconecta e apaga registros da API).
     */
    public async deleteInstance() {
        console.log(`[DEBUG] WhatsMiauService.deleteInstance INICIADO para ${this.instanceName}`);
        try {
            const response = await this.api.delete(`/evolution/instance/delete/${this.instanceName}`);
            console.info(`✅ [DEBUG] Instância ${this.instanceName} removida/deslogada com sucesso. Resposta:`, response.data);
            return response.data;
        } catch (error: any) {
            const errorData = error?.response?.data || error.message;
            const status = error?.response?.status;
            console.error(`❌ [DEBUG] Erro ao deletar instância ${this.instanceName}. Status: ${status}. Data:`, errorData);

            // Se for 404, a instância já não existe, então consideramos sucesso no "delete"
            if (status === 404) {
                console.info(`ℹ️ [DEBUG] Instância ${this.instanceName} não encontrada (404). Sucesso implícito.`);
                return { success: true, message: 'Instância já não existe' };
            }

            console.error(`❌ Erro ao deletar instância ${this.instanceName}:`, errorData);
            throw new Error(`Erro ao deletar instância: ${JSON.stringify(errorData)}`);
        }
    }

    /**
     * Envia uma mensagem de texto simples. Suporta emojis.
     */
    public async sendText(number: string, text: string, options?: { delay?: number }) {
        try {
            let cleanedNumber = number.replace(/\D/g, '');
            if (cleanedNumber.length === 10 || cleanedNumber.length === 11) {
                cleanedNumber = `55${cleanedNumber}`;
            }

            // Conforme docs: body é { number, text, delay } diretamente
            const response = await this.api.post(`/message/sendText/${this.instanceName}`, {
                number: cleanedNumber,
                text,
                delay: options?.delay || 1200,
            });
            console.info(`✅ Mensagem de texto enviada para ${cleanedNumber}`);
            return response.data;
        } catch (error: any) {
            console.error(`❌ Erro ao enviar mensagem de texto para ${number}:`, error?.response?.data || error.message);
            throw new Error('Erro ao enviar mensagem de texto');
        }
    }

    /**
     * Envia imagens ou vídeos via URL ou Base64.
     */
    public async sendMedia(number: string, mediaUrl: string, caption?: string, mediaType: 'image' | 'video' | 'document' = 'image') {
        try {
            // Conforme docs: body é { number, mediatype, media, caption } diretamente
            const response = await this.api.post(`/message/sendMedia/${this.instanceName}`, {
                number,
                mediatype: mediaType,
                media: mediaUrl,
                caption: caption || '',
            });
            console.info(`✅ Mídia enviada para ${number}`);
            return response.data;
        } catch (error: any) {
            console.error(`❌ Erro ao enviar mídia para ${number}:`, error?.response?.data || error.message);
            throw new Error('Erro ao enviar mídia');
        }
    }

    /**
     * Envia um arquivo de áudio como se fosse gravado na hora (Push-To-Talk).
     */
    public async sendAudio(number: string, audioUrl: string) {
        try {
            // Conforme docs: body é { number, audio } diretamente
            const response = await this.api.post(`/message/sendWhatsAppAudio/${this.instanceName}`, {
                number,
                audio: audioUrl,
            });
            console.info(`✅ Áudio enviado para ${number}`);
            return response.data;
        } catch (error: any) {
            console.error(`❌ Erro ao enviar áudio para ${number}:`, error?.response?.data || error.message);
            throw new Error('Erro ao enviar áudio');
        }
    }

    /**
     * Envia uma reação a uma mensagem.
     */
    public async sendReaction(number: string, reaction: string, messageId: string) {
        try {
            const response = await this.api.post(`/message/sendReaction/${this.instanceName}`, {
                number,
                reactionMessage: {
                    key: {
                        id: messageId,
                        fromMe: false, // ajustar conforme necessário ou parametrizar
                    },
                    reaction,
                },
            });
            return response.data;
        } catch (error: any) {
            console.error(`❌ Erro ao enviar reação para ${number}:`, error?.response?.data || error.message);
            throw new Error('Erro ao enviar reação');
        }
    }

    /**
     * Marca mensagens como lidas
     */
    public async markAsRead(remoteJid: string, messageIds: string[]) {
        try {
            const response = await this.api.post(`/chat/markMessageAsRead/${this.instanceName}`, {
                readMessages: messageIds.map(id => ({
                    remoteJid,
                    fromMe: false,
                    id
                }))
            });
            return response.data;
        } catch (error: any) {
            console.error(`❌ Erro ao marcar como lido para ${remoteJid}:`, error?.response?.data || error.message);
            throw new Error('Erro ao marcar como lido');
        }
    }
}

export default WhatsMiauService.getInstance();
