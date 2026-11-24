export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import bcrypt from 'bcryptjs';
import { validatePassword } from '@/lib/validation';

const HIDDEN_EMAILS = ['abacus-6f57402f@example.com'];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await adminGuard('usuarios');
  if (error) return error;
  try {
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target || target.role !== 'ADMIN' || HIDDEN_EMAILS.includes(target.email)) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    const b = (await req.json()) ?? {};
    const data: any = {};
    if (typeof b.name === 'string' && b.name.trim()) data.name = b.name.trim();
    if (Array.isArray(b.permissions)) data.permissions = b.permissions;
    if (typeof b.active === 'boolean') {
      // Prevent an admin from deactivating their own account
      if (!b.active && (session!.user as any).id === params.id) return NextResponse.json({ error: 'Você não pode desativar a sua própria conta.' }, { status: 400 });
      data.active = b.active;
    }
    if (typeof b.password === 'string' && b.password.length > 0) {
      const pwErr = validatePassword(b.password);
      if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
      data.password = await bcrypt.hash(b.password, 10);
    }
    const user = await prisma.user.update({ where: { id: params.id }, data, select: { id: true, name: true, email: true, permissions: true, active: true, createdAt: true } });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'update', entity: 'user', entityId: user.id, details: `Atualizou o administrador ${user.name} (${user.email})` });
    return NextResponse.json({ user });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar usuário.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await adminGuard('usuarios');
  if (error) return error;
  try {
    if ((session!.user as any).id === params.id) return NextResponse.json({ error: 'Você não pode remover a sua própria conta.' }, { status: 400 });
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target || target.role !== 'ADMIN' || HIDDEN_EMAILS.includes(target.email)) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    // Soft-remove: deactivate instead of deleting to preserve historical carts/logs references
    await prisma.user.update({ where: { id: params.id }, data: { active: false } });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'update', entity: 'user', entityId: params.id, details: `Desativou o administrador ${target.name} (${target.email})` });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao remover usuário.' }, { status: 500 });
  }
}
