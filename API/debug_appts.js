const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Update all 'pendent' to 'confirmado'
    const result = await p.appointment.updateMany({
        where: { status: 'pendente' },
        data: { status: 'confirmado' },
    });
    console.log(`Updated ${result.count} appointments from pendente to confirmado`);

    // Verify
    const all = await p.appointment.findMany();
    all.forEach(a => {
        console.log(`ID=${a.id} status=${a.status} phone=${a.clientPhone} date=${a.dateTime}`);
    });
    await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
