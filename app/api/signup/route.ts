export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password são obrigatórios' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email já registado' }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name: name || email.split('@')[0], password: hashedPassword, role: 'CONDOMINO' },
    });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 });
  }
}
