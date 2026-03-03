import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const services = [
    { name: 'CORTE', price: 35 },
    { name: 'BARBA', price: 35 },
    { name: 'CORTE + BARBA', price: 60 },
    { name: 'BARBA SÓ MAQUINA', price: 15 },
    { name: 'ABAIXAR A BARBA', price: 5 },
    { name: 'SOBRANCELHA', price: 5 },
    { name: 'BIGODE', price: 5 },
    { name: 'PEZINHO', price: 10 },
    { name: 'DEPILAÇÃO DE NARIZ', price: 10 },
    { name: 'CORTE SÓ UM PENTE SIMPLES', price: 30 },
    { name: 'ALISAMENTO', price: 30 },
];

async function main() {
    console.log('Iniciando inserção de serviços...');

    for (const svc of services) {
        await prisma.serviceItem.upsert({
            where: { id: 0 }, // This is a trick, we'll use name if we had a unique constraint, but we don't.
            // Better: check if it exists by name.
            create: svc,
            update: svc,
        });
    }

    // Since ServiceItem doesn't have a unique 'name' field in schema.prisma, 
    // let's just create them if they don't exist yet.
    for (const svc of services) {
        const exists = await prisma.serviceItem.findFirst({
            where: { name: svc.name }
        });

        if (!exists) {
            await prisma.serviceItem.create({ data: svc });
            console.log(`Inserido: ${svc.name}`);
        } else {
            await prisma.serviceItem.update({
                where: { id: exists.id },
                data: { price: svc.price }
            });
            console.log(`Atualizado: ${svc.name}`);
        }
    }

    console.log('Inserção concluída!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
