'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    cpf: '', phone: '', birthDate: '',
    termsAccepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCPF = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const handleChange = (field: string, value: string | boolean) => {
    if (field === 'cpf') value = formatCPF(value as string);
    if (field === 'phone') value = formatPhone(value as string);
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nome obrigatório';
    if (!form.email.trim()) e.email = 'E-mail obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Informe um e-mail válido';
    if (!form.password) e.password = 'Senha obrigatória';
    else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    else if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) e.password = 'Use letras e números';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Senhas não coincidem';
    if (!form.termsAccepted) e.termsAccepted = 'Aceite os termos';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          cpf: form.cpf.replace(/\D/g, '') || undefined,
          phone: form.phone.replace(/\D/g, '') || undefined,
          birthDate: form.birthDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao criar conta.');
        setLoading(false);
        return;
      }
      // Auto login
      const loginResult = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (loginResult?.error) {
        toast.error('Conta criada! Faça login.');
        router.replace('/login');
      } else {
        toast.success('Conta criada com sucesso! Bem-vindo!');
        router.replace('/home');
      }
    } catch {
      toast.error('Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD0301] focus:border-transparent text-sm ${
      errors[field] ? 'border-red-400' : 'border-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl font-bold text-center text-[#1A1A1A] mb-1">Crie sua conta</h1>
        <p className="text-sm text-[#666666] text-center mb-6">Preencha os dados para começar</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados de acesso */}
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wide">Dados de acesso</h2>
            <div className="space-y-3">
              <div>
                <input placeholder="Nome completo *" value={form.name} onChange={e => handleChange('name', e.target.value)} className={inputClass('name')} />
                {errors.name && <p className="text-xs text-[#CD0301] mt-1">{errors.name}</p>}
              </div>
              <div>
                <input type="email" placeholder="E-mail *" value={form.email} onChange={e => handleChange('email', e.target.value)} className={inputClass('email')} />
                {errors.email && <p className="text-xs text-[#CD0301] mt-1">{errors.email}</p>}
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="Senha *" value={form.password} onChange={e => handleChange('password', e.target.value)} className={inputClass('password')} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {errors.password && <p className="text-xs text-[#CD0301] mt-1">{errors.password}</p>}
              </div>
              <div>
                <input type="password" placeholder="Confirmar senha *" value={form.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} className={inputClass('confirmPassword')} />
                {errors.confirmPassword && <p className="text-xs text-[#CD0301] mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>

          {/* Dados pessoais */}
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wide">Dados pessoais</h2>
            <div className="space-y-3">
              <input placeholder="CPF" value={form.cpf} onChange={e => handleChange('cpf', e.target.value)} className={inputClass('cpf')} />
              <input placeholder="Celular (DDD + número)" value={form.phone} onChange={e => handleChange('phone', e.target.value)} className={inputClass('phone')} />
              <input type="date" placeholder="Data de nascimento" value={form.birthDate} onChange={e => handleChange('birthDate', e.target.value)} className={inputClass('birthDate')} />
            </div>
          </div>

          {/* Termos */}
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={form.termsAccepted} onChange={e => handleChange('termsAccepted', e.target.checked)} className="mt-1 accent-[#CD0301]" />
              <span className="text-xs text-[#666666]">Li e aceito os termos de uso e política de privacidade *</span>
            </label>
            {errors.termsAccepted && <p className="text-xs text-[#CD0301] mt-1">{errors.termsAccepted}</p>}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#CD0301] text-white py-3 rounded-lg font-semibold hover:bg-[#b00201] transition disabled:opacity-50 flex items-center justify-center gap-2 h-12">
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Criar minha conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#666666]">
          Já tem conta? <Link href="/login" className="text-[#CD0301] font-semibold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
