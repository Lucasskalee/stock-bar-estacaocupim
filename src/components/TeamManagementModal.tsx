import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  Mail,
  Shield,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  isValidTeamEmail,
  normalizeEmailKey,
  removeTeamMemberCloud,
  saveTeamMemberCloud,
  subscribeTeamMembers,
  TeamMemberRecord,
  TeamRole,
} from '../services/firestoreSync';

interface TeamManagementModalProps {
  open: boolean;
  onClose: () => void;
  actorUid: string;
  onNotify: (text: string, tone?: 'neutral' | 'success' | 'alert') => void;
}

export function TeamManagementModal({
  open,
  onClose,
  actorUid,
  onNotify,
}: TeamManagementModalProps) {
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<TeamRole>('operador');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmRemoveEmail, setConfirmRemoveEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const unsub = subscribeTeamMembers(
      (list) => {
        setMembers(list.filter((m) => m.email !== BOOTSTRAP_ADMIN_EMAIL));
        setLoading(false);
      },
      () => {
        setLoading(false);
        setFormError('Não foi possível carregar a lista da equipe.');
      }
    );
    return unsub;
  }, [open]);

  if (!open) return null;

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const normalized = normalizeEmailKey(email);
    if (!isValidTeamEmail(normalized)) {
      setFormError('Informe um endereço de e-mail válido.');
      return;
    }
    if (normalized === BOOTSTRAP_ADMIN_EMAIL) {
      setFormError('Este e-mail já é o Administrador Principal da Estação Cupim.');
      return;
    }

    const cleanName = nome.trim() || normalized.split('@')[0];
    setSaving(true);
    try {
      await saveTeamMemberCloud(actorUid, {
        email: normalized,
        nome: cleanName,
        role,
      });
      setEmail('');
      setNome('');
      setRole('operador');
      onNotify(`${cleanName} liberado(a) no estoque compartilhado.`, 'success');
    } catch {
      setFormError('Não foi possível salvar o colaborador. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = async (member: TeamMemberRecord) => {
    const nextRole: TeamRole = member.role === 'admin' ? 'operador' : 'admin';
    try {
      await saveTeamMemberCloud(actorUid, {
        email: member.email,
        nome: member.nome,
        role: nextRole,
      });
      onNotify(
        `${member.nome} agora é ${nextRole === 'admin' ? 'Administrador' : 'Operador'}.`,
        'success'
      );
    } catch {
      onNotify('Erro ao atualizar permissão do colaborador.', 'alert');
    }
  };

  const handleRemove = async (memberEmail: string, memberName: string) => {
    try {
      await removeTeamMemberCloud(memberEmail);
      setConfirmRemoveEmail(null);
      onNotify(`Acesso de ${memberName} revogado imediatamente.`, 'neutral');
    } catch {
      onNotify('Erro ao remover colaborador.', 'alert');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-modal-title"
    >
      <div className="w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#171512] border border-[#FFF4E0]/12 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#FFF4E0]/8">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#D98A2B]/15 text-[#D98A2B] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="team-modal-title"
                className="font-display text-lg font-semibold text-[#F5F0E8] truncate"
              >
                Equipe Estação Cupim
              </h2>
              <p className="text-xs text-[#A69D8E] truncate">
                Todos os autorizados compartilham o mesmo estoque em tempo real
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de equipe"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#221E19] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Add Team Member Form */}
          <form onSubmit={handleAddMember} className="space-y-3" noValidate>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D98A2B]">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Liberar nova conta</span>
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-[#E05A47]/12 border border-[#E05A47]/30 px-3 py-2.5 text-xs text-[#F7B2A8]"
              >
                <AlertCircle className="w-4 h-4 text-[#E05A47] shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Mail className="w-4 h-4 text-[#736B5E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@equipe.com"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/10 text-sm text-[#F5F0E8] placeholder:text-[#5E574C] focus:outline-none focus:border-[#D98A2B]"
                />
              </div>

              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#736B5E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome (ex.: João · Bar)"
                  maxLength={80}
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/10 text-sm text-[#F5F0E8] placeholder:text-[#5E574C] focus:outline-none focus:border-[#D98A2B]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/8 flex-1">
                <button
                  type="button"
                  onClick={() => setRole('operador')}
                  className={`h-9 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    role === 'operador'
                      ? 'bg-[#221E19] text-[#F5F0E8]'
                      : 'text-[#8C8375] hover:text-[#F5F0E8]'
                  }`}
                >
                  Operador
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`h-9 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    role === 'admin'
                      ? 'bg-[#221E19] text-[#D98A2B]'
                      : 'text-[#8C8375] hover:text-[#F5F0E8]'
                  }`}
                >
                  Administrador
                </button>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="h-11 px-5 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                {saving ? 'Liberando...' : 'Liberar acesso'}
              </button>
            </div>
          </form>

          {/* Authorized Roster */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#A69D8E]">
              <span className="font-semibold uppercase tracking-wider">Contas autorizadas</span>
              <span className="font-mono tabular-nums">{members.length + 1} conta(s)</span>
            </div>

            {/* Bootstrap Admin (locked) */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0E0D0B]/90 border border-[#D98A2B]/25 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F5F0E8] flex items-center gap-1.5 truncate">
                  <Crown className="w-3.5 h-3.5 text-[#D98A2B] shrink-0" />
                  <span>Administrador Principal</span>
                </p>
                <p className="text-xs text-[#8C8375] truncate">{BOOTSTRAP_ADMIN_EMAIL}</p>
              </div>
              <span className="text-[11px] font-medium text-[#D98A2B] shrink-0">
                Proprietário
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-[#8C8375] py-3 text-center">Carregando equipe...</p>
            ) : members.length === 0 ? (
              <div className="rounded-xl bg-[#0E0D0B]/60 border border-[#FFF4E0]/6 px-4 py-4 text-center">
                <p className="text-xs text-[#A69D8E]">
                  Nenhum colaborador extra liberado ainda. Adicione o e-mail da equipe acima para
                  compartilhar este mesmo estoque.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const confirming = confirmRemoveEmail === member.email;
                  return (
                    <div
                      key={member.email}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#0E0D0B]/70 border border-[#FFF4E0]/8 px-3.5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#F5F0E8] truncate">{member.nome}</p>
                        <p className="text-xs text-[#8C8375] truncate">{member.email}</p>
                      </div>

                      {confirming ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleRemove(member.email, member.nome)}
                            className="h-8 px-2.5 rounded-lg bg-[#E05A47] text-white text-xs font-semibold cursor-pointer"
                          >
                            Revogar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveEmail(null)}
                            className="h-8 px-2.5 rounded-lg bg-[#221E19] text-[#A69D8E] text-xs cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleToggleRole(member)}
                            title="Clique para alternar entre Operador e Administrador"
                            className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                              member.role === 'admin'
                                ? 'bg-[#D98A2B]/15 border-[#D98A2B]/35 text-[#D98A2B]'
                                : 'bg-[#1F1C18] border-[#FFF4E0]/10 text-[#C8BFB1] hover:text-[#F5F0E8]'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{member.role === 'admin' ? 'Admin' : 'Operador'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmRemoveEmail(member.email)}
                            aria-label={`Remover ${member.nome}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8C8375] hover:text-[#E05A47] hover:bg-[#E05A47]/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-[#4CA975]/10 border border-[#4CA975]/20 px-3.5 py-3 text-xs text-[#AEE3C5] leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-[#4CA975] shrink-0 mt-0.5" />
            <span>
              <strong>Operadores</strong> contam estoque, cadastram bebidas e fecham turnos no banco
              compartilhado. <strong>Administradores</strong> também gerenciam a equipe e podem
              excluir registros do histórico.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
