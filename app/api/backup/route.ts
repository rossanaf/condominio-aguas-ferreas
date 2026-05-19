export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === 'object' && typeof obj.toNumber === 'function') return Number(obj.toNumber());
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serialize(obj[key]);
    }
    return result;
  }
  return obj;
}

async function fetchAllData() {
  const [users, fracoes, cotas, pagamentos, despesas, saldosTransitados, dividasTransitadas, movimentosCaixa, orcamentos, orcamentosExtraordinarios, cotasExtraordinarias, notas] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.fracao.findMany({ orderBy: { letra: 'asc' } }),
    prisma.cota.findMany({ orderBy: [{ ano: 'asc' }, { mes: 'asc' }] }),
    prisma.pagamento.findMany({ orderBy: { dataPagamento: 'desc' } }),
    prisma.despesa.findMany({ orderBy: { dataEmissao: 'desc' } }),
    prisma.saldoTransitado.findMany({ orderBy: { ano: 'asc' } }),
    prisma.dividaTransitada.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.movimentoCaixa.findMany({ orderBy: { data: 'desc' } }),
    prisma.orcamento.findMany({ orderBy: { ano: 'asc' } }),
    prisma.orcamentoExtraordinario.findMany({ orderBy: { ano: 'asc' } }),
    prisma.cotaExtraordinaria.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.nota.findMany({ orderBy: { data: 'desc' } }),
  ]);

  const sanitizedUsers = users.map((u: any) => {
    const { password, ...rest } = u;
    return rest;
  });

  return serialize({
    users: sanitizedUsers,
    fracoes,
    cotas,
    pagamentos,
    despesas,
    saldosTransitados,
    dividasTransitadas,
    movimentosCaixa,
    orcamentos,
    orcamentosExtraordinarios,
    cotasExtraordinarias,
    notas,
  });
}

const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.build', '.git', '.deploy', '.cache', 'dist', 'out']);
const EXCLUDE_FILES = new Set(['.env', 'yarn.lock', 'package.json', 'tsconfig.tsbuildinfo']);

function collectFiles(dir: string, baseDir: string, files: Map<string, string>) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      collectFiles(fullPath, baseDir, files);
    } else if (entry.isFile()) {
      if (EXCLUDE_FILES.has(entry.name)) continue;
      if (entry.name.startsWith('.abacus')) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files.set(relativePath, content);
      } catch {
        // skip unreadable
      }
    }
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const data = await fetchAllData();
    const appRoot = process.cwd();

    // Collect source files
    const sourceFiles = new Map<string, string>();
    collectFiles(appRoot, appRoot, sourceFiles);
    for (const [relPath, content] of sourceFiles) {
      // Skip prisma schema — we add a fixed version below
      if (relPath === 'prisma/schema.prisma') continue;
      zip.file(relPath, content);
    }

    // Add fixed prisma schema for local use
    let schemaContent = '';
    try {
      schemaContent = fs.readFileSync(path.join(appRoot, 'prisma', 'schema.prisma'), 'utf-8');
    } catch { schemaContent = ''; }
    const localSchema = schemaContent
      .replace(/output\s*=\s*"[^"]+"/, 'output = "./generated/client"')
      .replace(/binaryTargets\s*=\s*\[[^\]]*\]/, 'binaryTargets = ["native"]');
    zip.file('prisma/schema.prisma', localSchema);

    // Add database data
    zip.file('backup/dados.json', JSON.stringify({
      metadata: { app: 'Condomínio Águas Férreas', exportDate: new Date().toISOString(), version: '1.0' },
      data,
    }, null, 2));

    // Add import script
    zip.file('backup/importar-dados.js', `const { PrismaClient } = require('../prisma/generated/client');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function importData() {
  const raw = fs.readFileSync('./backup/dados.json', 'utf-8');
  const { data } = JSON.parse(raw);

  console.log('A importar dados...');

  // 1. Frações
  for (const f of data.fracoes) {
    await prisma.fracao.upsert({
      where: { id: f.id },
      update: { letra: f.letra, permilagem: f.permilagem, descricao: f.descricao, proprietario: f.proprietario },
      create: { id: f.id, letra: f.letra, permilagem: f.permilagem, descricao: f.descricao, proprietario: f.proprietario },
    });
  }
  console.log('  ✓ ' + data.fracoes.length + ' frações');

  // 2. Users
  const defaultHash = await bcrypt.hash('condominio2025', 10);
  for (const u of data.users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, email: u.email, role: u.role, fracaoId: u.fracaoId, telefone: u.telefone, morada: u.morada },
      create: { id: u.id, name: u.name, email: u.email, password: defaultHash, role: u.role, fracaoId: u.fracaoId, telefone: u.telefone, morada: u.morada, mustChangePassword: true },
    });
  }
  console.log('  ✓ ' + data.users.length + ' utilizadores (password: condominio2025)');

  // 3. Orçamentos
  for (const o of data.orcamentos) {
    await prisma.orcamento.upsert({ where: { id: o.id }, update: o, create: o });
  }
  console.log('  ✓ ' + data.orcamentos.length + ' orçamentos');

  // 4. Saldos Transitados
  for (const s of data.saldosTransitados) {
    await prisma.saldoTransitado.upsert({ where: { id: s.id }, update: s, create: s });
  }
  console.log('  ✓ ' + data.saldosTransitados.length + ' saldos transitados');

  // 5. Cotas
  for (const c of data.cotas) {
    await prisma.cota.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log('  ✓ ' + data.cotas.length + ' cotas');

  // 6. Dívidas Transitadas
  for (const d of data.dividasTransitadas) {
    await prisma.dividaTransitada.upsert({ where: { id: d.id }, update: d, create: d });
  }
  console.log('  ✓ ' + data.dividasTransitadas.length + ' dívidas transitadas');

  // 7. Pagamentos
  for (const p of data.pagamentos) {
    await prisma.pagamento.upsert({ where: { id: p.id }, update: p, create: p });
  }
  console.log('  ✓ ' + data.pagamentos.length + ' pagamentos');

  // 8. Despesas
  for (const d of data.despesas) {
    await prisma.despesa.upsert({ where: { id: d.id }, update: d, create: d });
  }
  console.log('  ✓ ' + data.despesas.length + ' despesas');

  // 9. Movimentos Caixa
  for (const m of data.movimentosCaixa) {
    await prisma.movimentoCaixa.upsert({ where: { id: m.id }, update: m, create: m });
  }
  console.log('  ✓ ' + data.movimentosCaixa.length + ' movimentos de caixa');

  // 10. Orçamentos Extraordinários
  for (const o of data.orcamentosExtraordinarios) {
    await prisma.orcamentoExtraordinario.upsert({ where: { id: o.id }, update: o, create: o });
  }
  console.log('  ✓ ' + data.orcamentosExtraordinarios.length + ' orçamentos extraordinários');

  // 11. Cotas Extraordinárias
  for (const c of data.cotasExtraordinarias) {
    await prisma.cotaExtraordinaria.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log('  ✓ ' + data.cotasExtraordinarias.length + ' cotas extraordinárias');

  // 12. Notas
  for (const n of data.notas) {
    await prisma.nota.upsert({ where: { id: n.id }, update: n, create: n });
  }
  console.log('  ✓ ' + data.notas.length + ' notas');

  console.log('\\n✅ Importação concluída com sucesso!');
  await prisma.$disconnect();
}

importData().catch(e => { console.error('Erro:', e); process.exit(1); });
`);

    // Add local package.json
    zip.file('package.json', JSON.stringify({
      name: 'condominio-aguas-ferreas',
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        'prisma:generate': 'prisma generate',
        'prisma:push': 'prisma db push',
        'importar-dados': 'node backup/importar-dados.js',
      },
      dependencies: {
        'next': '14.2.28', 'react': '^18.2.0', 'react-dom': '^18.2.0',
        '@prisma/client': '^5.0.0', 'prisma': '^5.0.0', 'next-auth': '^4.24.0',
        'bcryptjs': '^2.4.3', '@types/bcryptjs': '^2.4.6', 'sonner': '^1.4.0',
        'recharts': '^2.10.0', 'lucide-react': '^0.300.0', 'next-themes': '^0.2.1',
        'class-variance-authority': '^0.7.0', 'clsx': '^2.0.0',
        'tailwind-merge': '^2.2.0', 'tailwindcss-animate': '^1.0.7',
        '@radix-ui/react-accordion': '^1.1.2', '@radix-ui/react-alert-dialog': '^1.0.5',
        '@radix-ui/react-avatar': '^1.0.4', '@radix-ui/react-checkbox': '^1.0.4',
        '@radix-ui/react-collapsible': '^1.0.3', '@radix-ui/react-context-menu': '^2.1.5',
        '@radix-ui/react-dialog': '^1.0.5', '@radix-ui/react-dropdown-menu': '^2.0.6',
        '@radix-ui/react-hover-card': '^1.0.7', '@radix-ui/react-label': '^2.0.2',
        '@radix-ui/react-menubar': '^1.0.4', '@radix-ui/react-navigation-menu': '^1.1.4',
        '@radix-ui/react-popover': '^1.0.7', '@radix-ui/react-progress': '^1.0.3',
        '@radix-ui/react-radio-group': '^1.1.3', '@radix-ui/react-scroll-area': '^1.0.5',
        '@radix-ui/react-select': '^2.0.0', '@radix-ui/react-separator': '^1.0.3',
        '@radix-ui/react-slider': '^1.1.2', '@radix-ui/react-slot': '^1.0.2',
        '@radix-ui/react-switch': '^1.0.3', '@radix-ui/react-tabs': '^1.0.4',
        '@radix-ui/react-toast': '^1.1.5', '@radix-ui/react-toggle': '^1.0.3',
        '@radix-ui/react-toggle-group': '^1.0.4', '@radix-ui/react-tooltip': '^1.0.7',
        'cmdk': '^0.2.0', 'date-fns': '^3.0.0', 'embla-carousel-react': '^8.0.0',
        'input-otp': '^1.0.0', 'react-day-picker': '^8.10.0',
        'react-resizable-panels': '^1.0.0', 'vaul': '^0.9.0',
        'typescript': '^5.0.0', '@types/node': '^20.0.0',
        '@types/react': '^18.2.0', '@types/react-dom': '^18.2.0',
        'autoprefixer': '^10.4.0', 'postcss': '^8.4.0', 'tailwindcss': '^3.4.0',
        'framer-motion': '^11.0.0',
      },
    }, null, 2));

    // .env.example
    zip.file('.env.example', `# Base de dados PostgreSQL local
DATABASE_URL="postgresql://user:password@localhost:5432/condominio_aguas_ferreas"

# NextAuth
NEXTAUTH_SECRET="gerar-um-secret-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
`);

    // next.config.js for local
    zip.file('next.config.js', `/** @type {import('next').NextConfig} */\nconst nextConfig = {\n  reactStrictMode: true,\n  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },\n};\nmodule.exports = nextConfig;\n`);

    // README
    zip.file('README.md', `# Condomínio Águas Férreas — Instalação Local

## Pré-requisitos
- Node.js 18+
- PostgreSQL instalado e a correr
- Yarn (npm install -g yarn)

## Passos

### 1. Instalar dependências
\`\`\`bash
yarn install
\`\`\`

### 2. Configurar base de dados
\`\`\`bash
cp .env.example .env
\`\`\`
Editar \`.env\` com os dados da tua base de dados PostgreSQL.
Para gerar o NEXTAUTH_SECRET: \`openssl rand -base64 32\`

### 3. Gerar Prisma Client e criar tabelas
\`\`\`bash
yarn prisma generate
yarn prisma db push
\`\`\`

### 4. Importar dados do backup
\`\`\`bash
yarn importar-dados
\`\`\`
Nota: Todos os utilizadores ficam com a password **condominio2025** e terão de a alterar no primeiro login.

### 5. Arrancar a aplicação
\`\`\`bash
yarn dev
\`\`\`
Aplicação disponível em **http://localhost:3000**
`);

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

    const now = new Date();
    const filename = `condominio_aguas_ferreas_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.zip`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Erro ao gerar backup: ' + (error?.message ?? '') }, { status: 500 });
  }
}
