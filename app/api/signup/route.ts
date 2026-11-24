export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { isValidEmail, validatePassword } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit('signup:ip:' + ip, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Muitas contas criadas a partir desta conexão. Tente novamente mais tarde.' }, { status: 429 });
    }

    const body = await req.json();
    const { email, password, name, cpf, phone, birthDate,
      street, number, complement, neighborhood, reference, zipCode } = body ?? {};

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
    }

    const pwErr = validatePassword(password);
    if (pwErr) {
      return NextResponse.json({ error: pwErr }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 });
    }

    const cleanCpf = cpf?.replace(/\D/g, '') ?? '';
    if (cleanCpf && cleanCpf !== '00000000000') {
      const existingCpf = await prisma.user.findUnique({ where: { cpf: cleanCpf } });
      if (existingCpf) {
        return NextResponse.json({ error: 'Este CPF já está cadastrado.' }, { status: 409 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        cpf: (cleanCpf && cleanCpf !== '00000000000') ? cleanCpf : null,
        phone: phone || null,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    // Create address if provided
    if (street && number && neighborhood && zipCode) {
      await prisma.address.create({
        data: {
          userId: user.id,
          street,
          number,
          complement: complement || null,
          neighborhood,
          reference: reference || null,
          zipCode,
          isDefault: true,
        },
      });
    }

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Erro interno ao criar conta.' }, { status: 500 });
  }
}
