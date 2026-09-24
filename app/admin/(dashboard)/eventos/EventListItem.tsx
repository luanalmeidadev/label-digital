"use client";

import { useTransition } from "react";
import { Edit2, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { toggleEventStatus } from "./actions";
import { cn } from "@/lib/utils";
import DeleteEventButton from "./DeleteEventButton";

export default function EventListItem({ event }: { event: { id: string; name: string; status: string; schedule_type: string; weekdays: number[] | null; start_time: string | null; end_time: string | null; starts_at: string | null; ends_at: string | null; itemsCount: number; active: boolean; } }) {
  const [isPending, startTransition] = useTransition();

  function onToggleActive(checked: boolean) {
    startTransition(() => {
      toggleEventStatus(event.id, checked);
    });
  }

  function getStatusColor(status: string) {
    if (status === "Ativo agora") return "bg-green-100 text-green-700";
    if (status === "Agendado") return "bg-blue-100 text-blue-700";
    if (status === "Encerrado") return "bg-gray-100 text-gray-700";
    return "bg-red-100 text-red-700"; // Inativo
  }

  const formatSchedule = () => {
    if (event.schedule_type === "weekly") {
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const activeDays = event.weekdays?.map((d: number) => days[d]).join(", ");
      return `${activeDays} (${event.start_time?.slice(0, 5)} às ${event.end_time?.slice(0, 5)})`;
    }
    if (event.starts_at && event.ends_at) {
      const start = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.starts_at));
      const end = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.ends_at));
      return `${start} até ${end}`;
    }
    return "Agenda indefinida";
  };

  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <Calendar size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-brand-foreground">{event.name}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", getStatusColor(event.status))}>
              {event.status}
            </span>
          </div>
          <div className="mt-1 space-y-1">
            <p className="text-xs font-medium text-brand-muted-foreground">
              {event.schedule_type === "weekly" ? "Semanal" : "Período"}: {formatSchedule()}
            </p>
            <p className="text-xs text-brand-muted-foreground">
              {event.itemsCount} produto(s) participante(s)
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 self-end sm:self-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-brand-muted-foreground">
            Ativo
          </span>
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
          ) : (
            <input
              type="checkbox"
              checked={event.active}
              onChange={(e) => onToggleActive(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
            />
          )}
        </div>
        <Link
          href={`/admin/eventos/${event.id}/editar`}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light-gray text-brand-foreground transition-colors hover:bg-brand-border"
          title="Editar Evento"
        >
          <Edit2 size={18} />
        </Link>
        <DeleteEventButton id={event.id} />
      </div>
    </div>
  );
}
