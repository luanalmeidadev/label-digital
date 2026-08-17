"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  UserCog,
  UserPlus,
} from "lucide-react";

import {
  createAdminAccount,
  updateAdminAccount,
} from "@/app/admin/(dashboard)/configuracoes/accounts-actions";
import type { AdminAccount } from "@/lib/admin-accounts";
import {
  adminPermissionOptions,
  defaultAttendantPermissions,
  type AdminRole,
} from "@/lib/admin-permissions";

function PermissionFields({
  role,
  selected,
  disabled,
}: {
  role: AdminRole;
  selected: string[];
  disabled: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {adminPermissionOptions.map((permission) => (
        <label
          key={permission.key}
          className={`flex gap-3 rounded-xl border border-[#EEE6DF] p-3 ${
            role === "admin"
              ? "cursor-default bg-[#FFFDF9] opacity-60"
              : "cursor-pointer"
          }`}
        >
          <input
            type="checkbox"
            name="permissions"
            value={permission.key}
            defaultChecked={selected.includes(
              permission.key
            )}
            disabled={disabled || role === "admin"}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#8B0000]"
          />
          <span>
            <span className="block text-xs font-bold text-[#241B19]">
              {permission.label}
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-[#756A66]">
              {permission.description}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function ResultMessage({
  message,
}: {
  message: {
    type: "success" | "error";
    text: string;
  } | null;
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="status"
      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
        message.type === "success"
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {message.text}
    </p>
  );
}

function NewAccountForm() {
  const router = useRouter();
  const [role, setRole] =
    useState<AdminRole>("attendant");
  const [pending, startTransition] =
    useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createAdminAccount(
        formData
      );

      if (!result.success) {
        setMessage({
          type: "error",
          text:
            result.error ??
            "Não foi possível criar a conta.",
        });
        return;
      }

      form.reset();
      setRole("attendant");
      setMessage({
        type: "success",
        text: "Convite enviado para o e-mail informado.",
      });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-[#EEE6DF] bg-[#FFFDF9] p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <UserPlus size={18} className="text-[#8B0000]" />
        <h3 className="font-bold text-[#241B19]">
          Nova conta
        </h3>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-[#49352C]">
            Nome
          </span>
          <input
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            disabled={pending}
            className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-[#49352C]">
            E-mail de acesso
          </span>
          <input
            name="email"
            type="email"
            required
            disabled={pending}
            className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-[#49352C]">
            Perfil
          </span>
          <select
            name="role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as AdminRole)
            }
            disabled={pending}
            className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
          >
            <option value="attendant">Atendente</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
      </div>

      <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
        A pessoa receberá um convite por e-mail e definirá a própria senha no primeiro acesso.
      </p>

      <div className="mt-5">
        <p className="mb-3 text-xs font-bold text-[#49352C]">
          Permissões
        </p>
        {role === "admin" && (
          <p className="mb-3 rounded-xl bg-[#8B0000]/5 px-3 py-2 text-xs text-[#756A66]">
            Administradores têm acesso completo ao sistema e ao gerenciamento de contas.
          </p>
        )}
        <PermissionFields
          role={role}
          selected={defaultAttendantPermissions}
          disabled={pending}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ResultMessage message={message} />
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#700000] disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar convite"}
        </button>
      </div>
    </form>
  );
}

function ExistingAccountForm({
  account,
  currentUserId,
}: {
  account: AdminAccount;
  currentUserId: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState(account.role);
  const [pending, startTransition] =
    useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const isCurrentUser = account.id === currentUserId;

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget
    );

    startTransition(async () => {
      const result = await updateAdminAccount(
        formData
      );

      if (!result.success) {
        setMessage({
          type: "error",
          text:
            result.error ??
            "Não foi possível atualizar a conta.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Conta atualizada.",
      });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 sm:p-6"
    >
      <input type="hidden" name="id" value={account.id} />
      {isCurrentUser && (
        <input type="hidden" name="role" value="admin" />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[#241B19]">
              {account.name}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                account.role === "admin"
                  ? "bg-[#8B0000]/10 text-[#8B0000]"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {account.role === "admin"
                ? "Administrador"
                : "Atendente"}
            </span>
            {isCurrentUser && (
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                Sua conta
              </span>
            )}
            {!account.emailConfirmed && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                Convite pendente
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#756A66]">
            {account.email}
          </p>
        </div>
        {account.role === "admin" ? (
          <ShieldCheck size={22} className="text-[#8B0000]" />
        ) : (
          <UserCog size={22} className="text-blue-700" />
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-[#49352C]">
            Nome
          </span>
          <input
            name="name"
            type="text"
            required
            defaultValue={account.name}
            disabled={pending}
            className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-[#49352C]">
            Perfil
          </span>
          <select
            name="role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as AdminRole)
            }
            disabled={pending || isCurrentUser}
            className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
          >
            <option value="attendant">Atendente</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
      </div>

      <div className="mt-5">
        <PermissionFields
          role={role}
          selected={account.permissions}
          disabled={pending}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ResultMessage message={message} />
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-xl border border-[#8B0000] px-4 py-2.5 text-sm font-bold text-[#8B0000] transition hover:bg-[#8B0000] hover:text-white disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar acesso"}
        </button>
      </div>
    </form>
  );
}

export default function AdminAccountsManager({
  accounts,
  currentUserId,
}: {
  accounts: AdminAccount[];
  currentUserId: string;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
      <div className="border-b border-[#EEE6DF] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
            <UserCog size={20} />
          </div>
          <div>
            <h2 className="font-bold text-[#241B19]">
              Contas e permissões
            </h2>
            <p className="text-xs text-[#756A66]">
              Envie convites e defina acessos administrativos ou limitados para atendentes.
            </p>
          </div>
        </div>
      </div>

      <NewAccountForm />

      <div className="divide-y divide-[#EEE6DF]">
        {accounts.map((account) => (
          <ExistingAccountForm
            key={account.id}
            account={account}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </section>
  );
}
