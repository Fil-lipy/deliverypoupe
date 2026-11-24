export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import bcrypt from 'bcryptjs';
import { isValidEmail, validatePassword } from '@/lib/validation';

const HIDDEN_EMAILS = ['abacus-6f57402f@example.com'];

export async function GET() {
  const { error } = await adminGuard('usuarios');
  if (error) return error;
  try {
    const users = await prisma.user.findMany({
      where: { role: 'ADMIN', email: { notIn: HIDDEN_EMAILS } },
      select: { id: true, name: true, email: true, permissions: true, active: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ users });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, session } = await adminGuard('usuarios');
  if (error) return error;
  try {
    const b = (await req.json()) ?? {};
    const name = String(b.name ?? '').trim();
    const email = String(b.email ?? '').trim().toLowerCase();
    const password = String(b.password ?? '');
    const permissions: string[] = Array.isArray(b.permissions) ? b.permissions : [];
    if (!name || !email || !password) return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
    const pwErr = validatePassword(password);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'Já existe um usuário com este e-mail.' }, { status: 409 });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role: 'ADMIN', permissions, active: true },
      select: { id: true, name: true, email: true, permissions: true, active: true, createdAt: true },
    });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'create', entity: 'user', entityId: user.id, details: `Criou o administrador ${name} (${email})` });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 });
  }
}
