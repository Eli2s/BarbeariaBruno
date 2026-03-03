import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import clientsRouter from './routes/clients';
import servicesRouter from './routes/services';
import plansRouter from './routes/plans';
import productsRouter from './routes/products';
import planPaymentsRouter from './routes/planPayments';
import serviceItemsRouter from './routes/serviceItems';
import ordersRouter from './routes/orders';
import barbersRouter from './routes/barbers';
import barberCommissionsRouter from './routes/barberCommissions';
import cashbacksRouter from './routes/cashbacks';
import messageTemplatesRouter from './routes/messageTemplates';
import settingsRouter from './routes/settings';
import adminWhatsAppRouter from './routes/adminWhatsApp';
import webhookRouter from './routes/webhook';
import appointmentsRouter from './routes/appointmentRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/clients', clientsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/plans', plansRouter);
app.use('/api/products', productsRouter);
app.use('/api/plan-payments', planPaymentsRouter);
app.use('/api/service-items', serviceItemsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/barbers', barbersRouter);
app.use('/api/barber-commissions', barberCommissionsRouter);
app.use('/api/cashbacks', cashbacksRouter);
app.use('/api/message-templates', messageTemplatesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admin/whatsapp', adminWhatsAppRouter);
app.use('/api/webhook/whatsmiau', webhookRouter);
app.use('/api/appointments', appointmentsRouter);

// Iniciar servidor apenas em ambiente local (não na Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`🚀 API rodando em http://localhost:${PORT}`);
    });
}

export default app;
