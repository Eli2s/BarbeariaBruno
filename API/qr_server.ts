import 'dotenv/config';
import axios from 'axios';
import * as http from 'http';

const API_KEY = '895f1ebb-762e-4c54-bf53-662ad5777c2b';
const INSTANCE_ID = '69a4b6e99cf22707df138d3d';
const BASE_URL = 'https://api.whatsmiau.dev';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
});

async function main() {
    console.log('Buscando QR Code...');
    let qrBase64 = '';
    let errorMsg = '';

    try {
        const r = await api.get(`/evolution/instance/connect/${INSTANCE_ID}`);
        qrBase64 = r.data?.base64 || '';
        console.log('QR Code obtido com sucesso!');
    } catch (e: any) {
        errorMsg = JSON.stringify(e?.response?.data || e.message);
        console.log('Erro ao obter QR Code:', errorMsg);
    }

    const html = `<!DOCTYPE html>
<html>
<head>
    <title>WhatsMiau - QR Code</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #1a1a2e; color: white; }
        .box { text-align: center; background: #16213e; padding: 40px; border-radius: 16px; }
        h1 { color: #25D366; }
        p { color: #aaa; }
        img { background: white; padding: 16px; border-radius: 12px; }
        .err { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="box">
        <h1>WhatsApp - Bruno Online</h1>
        <p>Escaneie o QR Code abaixo com seu WhatsApp</p>
        ${qrBase64 ? `<img src="${qrBase64}" width="300" height="300" />` : `<p class="err">Erro: ${errorMsg}</p>`}
        <p style="margin-top:20px;color:#666;">Abra WhatsApp > Dispositivos Conectados > Conectar</p>
    </div>
</body>
</html>`;

    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    });

    server.listen(3333, () => {
        console.log('Servidor rodando em http://localhost:3333');
        console.log('Abra no navegador para ver o QR Code');
    });
}

main();
