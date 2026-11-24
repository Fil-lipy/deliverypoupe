'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { ADMIN_SECTIONS } from '@/lib/permissions';
import { Users, Plus, Pencil, X, Shield, ShieldCheck, Power } from 'lucide-react';
import { toast } from 'sonner';

type AdminUser = { id: string; name: string; email: string; permissions: string[]; active: boolean; createdAt: string };

const emptyForm = { id: '', name: '', email: '', password: '', permissions: [] as string[], fullAccess: true };

export default function AdminUsuariosPage() {
  const { data: session } = useSession() || {};
  const myId = (session?.user as any)?.id;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(form.id);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(Array.isArray(d?.users) ? d.users : [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ ...emptyForm }); setModalOpen(true); };
  const openEdit = (u: AdminUser) => {
    const full = !u.permissions || u.permissions.length === 0 || u.permissions.includes('all');
    setForm({ id: u.id, name: u.name, email: u.email, password: '', permissions: full ? [] : u.permissions, fullAccess: full });
    setModalOpen(true);
  };

  const togglePerm = (key: string) => {
    setForm(f => ({ ...f, permissions: f.permissions.includes(key) ? f.permissions.filter(k => k !== key) : [...f.permissions, key] }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Preencha nome e e-mail.'); return; }
    if (!isEdit && (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))) { toast.error('A senha deve ter ao menos 8 caracteres, com letras e números.'); return; }
    setSaving(true);
    try {
      const permissions = form.fullAccess ? ['all'] : form.permissions;
      const payload: any = { name: form.name.trim(), permissions };
      if (form.password) payload.password = form.password;
      let res;
      if (isEdit) {
        res = await fetch(`/api/admin/users/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, email: form.email.trim(), password: form.password }) });
      }
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro ao salvar.'); return; }
      toast.success(isEdit ? 'Usuário atualizado!' : 'Administrador criado!');
      setModalOpen(false);
      load();
    } catch { toast.error('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u: AdminUser) => {
    if (u.id === myId) { toast.error('Você não pode desativar a sua própria conta.'); return; }
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !u.active }) });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro.'); return; }
      toast.success(u.active ? 'Usuário desativado.' : 'Usuário ativado.');
      load();
    } catch { toast.error('Erro.'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users size={24} className="text-[#CD0301]" />
          <div>
            <h1 className="text-2xl font-bold">Usuários e Permissões</h1>
            <p className="text-sm text-[#666666] mt-1">Gerencie os administradores do painel e o que cada um pode acessar</p>
          </div>
        </div>
        <button onClick={openCreate} className="bg-[#CD0301] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#b00201] flex items-center gap-2"><Plus size={16} /> Novo admin</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid gap-3">
          {users.length === 0 ? <p className="text-sm text-[#666666]">Nenhum administrador cadastrado ainda.</p> : users.map(u => {
            const full = !u.permissions || u.permissions.length === 0 || u.permissions.includes('all');
            return (
              <div key={u.id} className={`bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 ${!u.active ? 'opacity-60' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  {full ? <ShieldCheck size={18} className="text-[#CD0301]" /> : <Shield size={18} className="text-[#CD0301]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{u.name} {u.id === myId && <span className="text-xs font-normal text-[#999]">(você)</span>}</p>
                  <p className="text-xs text-[#666666]">{u.email}</p>
                  <p className="text-xs text-[#999] mt-0.5">{full ? 'Acesso total' : `${u.permissions.length} área(s) permitida(s)`}{!u.active ? ' • inativo' : ''}</p>
                </div>
                <button onClick={() => toggleActive(u)} title={u.active ? 'Desativar' : 'Ativar'} className={`p-2 rounded-lg ${u.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}><Power size={16} /></button>
                <button onClick={() => openEdit(u)} className="p-2 rounded-lg text-[#666666] hover:bg-gray-100"><Pencil size={16} /></button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-bold text-lg">{isEdit ? 'Editar administrador' : 'Novo administrador'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A]"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#666666] block mb-1">Nome</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#666666] block mb-1">E-mail</label>
                <input type="email" value={form.email} disabled={isEdit} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301] disabled:bg-gray-50 disabled:text-[#999]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#666666] block mb-1">{isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha'}</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={isEdit ? '••••••' : 'Mínimo 8 caracteres, letras e números'} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.fullAccess} onChange={e => setForm(f => ({ ...f, fullAccess: e.target.checked }))} className="w-4 h-4 accent-[#CD0301]" />
                  <span className="text-sm font-medium text-[#1A1A1A]">Acesso total (todas as áreas)</span>
                </label>
              </div>
              {!form.fullAccess && (
                <div>
                  <label className="text-sm font-medium text-[#666666] block mb-2">Áreas permitidas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ADMIN_SECTIONS.map(sec => (
                      <label key={sec.key} className="flex items-center gap-2 cursor-pointer bg-[#F8F8F8] rounded-lg px-2.5 py-2">
                        <input type="checkbox" checked={form.permissions.includes(sec.key)} onChange={() => togglePerm(sec.key)} className="w-4 h-4 accent-[#CD0301]" />
                        <span className="text-xs text-[#1A1A1A]">{sec.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-[#666666] hover:bg-gray-50">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#CD0301] text-white text-sm font-semibold hover:bg-[#b00201] disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
