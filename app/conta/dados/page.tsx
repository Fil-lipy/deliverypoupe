'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useCart } from '@/hooks/use-cart';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DadosPessoaisPage() {
  const { data: session } = useSession() || {};
  const { totalItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', cpf: '', phone: '', birthDate: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    fetch('/api/account').then(r => r.json()).then(d => {
      setForm({
        name: d?.name ?? '',
        email: d?.email ?? '',
        cpf: d?.cpf ?? '',
        phone: d?.phone ?? '',
        birthDate: d?.birthDate ? new Date(d.birthDate).toISOString().split('T')[0] : '',
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) toast.success('Dados atualizados!');
      else toast.error('Erro ao atualizar.');
    } catch { toast.error('Erro.'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      toast.error('Preencha todos os campos de senha.');
      return;
    }
    if (pwForm.newPassword.length < 8 || !/[a-zA-Z]/.test(pwForm.newPassword) || !/[0-9]/.test(pwForm.newPassword)) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres, com letras e números.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('A confirmação não coincide com a nova senha.');
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Senha alterada com sucesso!');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data?.error ?? 'Erro ao alterar senha.');
      }
    } catch { toast.error('Erro ao alterar senha.'); }
    finally { setChangingPw(false); }
  };

  if (loading) return <div className="min-h-screen bg-white"><CustomerHeader cartCount={totalItems} /><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-lg mx-auto px-4 py-4">
        <Link href="/conta" className="flex items-center gap-1 text-sm text-[#666666] mb-4"><ArrowLeft size={16} /> Voltar</Link>
        <h1 className="text-xl font-bold mb-6">Dados pessoais</h1>
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-[#666666]">Nome</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" /></div>
          <div><label className="text-sm font-medium text-[#666666]">E-mail</label><input value={form.email} disabled className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" /></div>
          <div><label className="text-sm font-medium text-[#666666]">CPF</label><input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" /></div>
          <div><label className="text-sm font-medium text-[#666666]">Celular</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" /></div>
          <div><label className="text-sm font-medium text-[#666666]">Data de nascimento</label><input type="date" value={form.birthDate} onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))} className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" /></div>
          <button onClick={handleSave} disabled={saving} className="w-full bg-[#CD0301] text-white py-3 rounded-lg font-semibold hover:bg-[#b00201] transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar alterações'}
          </button>
        </div>

        {/* Alterar senha */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <h2 className="text-lg font-bold mb-1">Alterar senha</h2>
          <p className="text-sm text-[#666666] mb-4">Digite sua senha atual e escolha uma nova senha.</p>
          <div className="space-y-4">
            <div className="relative">
              <label className="text-sm font-medium text-[#666666]">Senha atual</label>
              <input type={showPw ? 'text' : 'password'} value={pwForm.currentPassword} onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-9 text-gray-400">{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <div><label className="text-sm font-medium text-[#666666]">Nova senha</label><input type={showPw ? 'text' : 'password'} value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" /></div>
            <div><label className="text-sm font-medium text-[#666666]">Confirmar nova senha</label><input type={showPw ? 'text' : 'password'} value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" /></div>
            <button onClick={handleChangePassword} disabled={changingPw} className="w-full bg-[#1A1A1A] text-white py-3 rounded-lg font-semibold hover:bg-black transition disabled:opacity-50 flex items-center justify-center gap-2">
              {changingPw ? <Loader2 size={18} className="animate-spin" /> : 'Alterar senha'}
            </button>
          </div>
        </div>
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
