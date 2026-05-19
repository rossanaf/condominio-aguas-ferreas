import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const fracoes = [
  { letra: 'A', permilagem: 86, proprietario: 'José Reis Lima Barreto', descricao: 'Casa 36' },
  { letra: 'B', permilagem: 76, proprietario: 'Manuel Ferreira da Silva', descricao: 'T2, 1º Direito' },
  { letra: 'C', permilagem: 76, proprietario: 'José Manuel Alves Correia', descricao: 'T2, 2º Esquerdo' },
  { letra: 'D', permilagem: 76, proprietario: 'Salvador Souto', descricao: 'T2, 2º Direito' },
  { letra: 'E', permilagem: 76, proprietario: 'Carla Sofia Rosa de Oliveira Isidro', descricao: 'T2, 3º Esquerdo' },
  { letra: 'F', permilagem: 76, proprietario: 'Álvaro Pereira Caldas', descricao: 'T2, 3º Direito' },
  { letra: 'G', permilagem: 76, proprietario: 'Carlos Elias Gomes Mateus', descricao: 'T2, 4º Esquerdo' },
  { letra: 'H', permilagem: 99, proprietario: 'Vítor Manuel Antunes Esteves', descricao: 'T3, 4º Direito' },
  { letra: 'I', permilagem: 100, proprietario: 'Fernando Lima Mendes', descricao: 'T3, 5º Esquerdo' },
  { letra: 'J', permilagem: 76, proprietario: 'Rui Manuel Pontedeira Vieira', descricao: 'T2, 5º Direito' },
  { letra: 'L', permilagem: 76, proprietario: 'Martha Rossana Rodrigues Ferreira', descricao: 'T2, R/C Esquerdo' },
  { letra: 'M', permilagem: 107, proprietario: 'Maria Adelaide Pinto Soares', descricao: 'T4, R/C Direito' },
];

// Cotas anuais (Proposta Orçamento 1 = 2805€)
const cotasAnuais: Record<string, { orcamento: number; fundoReserva: number; total: number }> = {
  A: { orcamento: 219.30, fundoReserva: 21.93, total: 241.23 },
  B: { orcamento: 193.80, fundoReserva: 19.38, total: 213.18 },
  C: { orcamento: 193.80, fundoReserva: 19.38, total: 213.18 },
  D: { orcamento: 193.80, fundoReserva: 19.38, total: 213.18 },
  E: { orcamento: 193.80, fundoReserva: 19.38, total: 213.18 },
  F: { orcamento: 193.80, fundoReserva: 19.38, total: 213.18 },
  G: { orcamento: 193.80, fundoReserva: 19.38, total: 213.18 },
  H: { orcamento: 252.45, fundoReserva: 25.25, total: 277.70 },
  I: { orcamento: 255.00, fundoReserva: 25.50, total: 280.50 },
  J: { orcamento: 193.80, fundoReserva: 19.38, total: 213.18 },
  L: { orcamento: 193.80, fundoReserva: 19.38, total: 213.18 },
  M: { orcamento: 272.85, fundoReserva: 27.29, total: 300.14 },
};

async function main() {
  console.log('Seeding database...');

  // Create admin user (test account)
  const adminPassword = await bcrypt.hash('johndoe123', 12);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: { password: adminPassword, role: 'ADMIN' },
    create: { email: 'john@doe.com', name: 'Administrador', password: adminPassword, role: 'ADMIN' },
  });

  // Create admin user for condominio
  const adminPassword2 = await bcrypt.hash('admin2026!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@aguasferreas.pt' },
    update: { password: adminPassword2, role: 'ADMIN' },
    create: { email: 'admin@aguasferreas.pt', name: 'Presidente do Condomínio', password: adminPassword2, role: 'ADMIN' },
  });

  // Upsert fractions
  const fracaoRecords: any[] = [];
  for (const f of fracoes) {
    const record = await prisma.fracao.upsert({
      where: { letra: f.letra },
      update: { permilagem: f.permilagem, proprietario: f.proprietario, descricao: f.descricao },
      create: { letra: f.letra, permilagem: f.permilagem, proprietario: f.proprietario, descricao: f.descricao },
    });
    fracaoRecords.push(record);
  }

  // Condómino users are created manually by the admin via the UI

  // Upsert budget 2026
  await prisma.orcamento.upsert({
    where: { ano: 2026 },
    update: {
      designacao: 'Orçamento 2026 - Proposta 1',
      valorEDP: 1000,
      valorLimpeza: 100,
      valorJardinagem: 600,
      valorAssistencia: 650,
      valorAdministrativas: 100,
      valorBancarias: 100,
      subtotal: 2550,
      fundoReserva: 255,
      total: 2805,
      aprovado: true,
    },
    create: {
      ano: 2026,
      designacao: 'Orçamento 2026 - Proposta 1',
      valorEDP: 1000,
      valorLimpeza: 100,
      valorJardinagem: 600,
      valorAssistencia: 650,
      valorAdministrativas: 100,
      valorBancarias: 100,
      subtotal: 2550,
      fundoReserva: 255,
      total: 2805,
      aprovado: true,
    },
  });

  // Create monthly cotas for 2026 (12 months x 12 fractions)
  for (const fracaoRecord of fracaoRecords) {
    const letra = fracaoRecord?.letra ?? '';
    const cotaAnual = cotasAnuais[letra];
    if (!cotaAnual) continue;

    const valorMensalOrc = Number((cotaAnual.orcamento / 12).toFixed(2));
    const valorMensalFR = Number((cotaAnual.fundoReserva / 12).toFixed(2));
    const valorMensalTotal = Number((cotaAnual.total / 12).toFixed(2));

    for (let mes = 1; mes <= 12; mes++) {
      await prisma.cota.upsert({
        where: {
          fracaoId_ano_mes: { fracaoId: fracaoRecord.id, ano: 2026, mes },
        },
        update: {
          valorOrcamento: valorMensalOrc,
          valorFundoReserva: valorMensalFR,
          valorTotal: valorMensalTotal,
        },
        create: {
          fracaoId: fracaoRecord.id,
          ano: 2026,
          mes,
          valorOrcamento: valorMensalOrc,
          valorFundoReserva: valorMensalFR,
          valorTotal: valorMensalTotal,
          status: 'PENDENTE',
        },
      });
    }
  }

  // Pagamentos, despesas e saldos são registados manualmente pelo administrador

  console.log('Seed completed successfully!');
}

main()
  .catch((e: any) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
