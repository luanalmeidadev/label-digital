"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPromotionalEvent, updatePromotionalEvent, type EventScheduleType, type EventAvailabilityMode, type CreateEventPayload, type UpdateEventPayload } from "@/app/actions/events";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type FormEvent = {
  id?: string;
  name: string;
  active: boolean;
  schedule_type: EventScheduleType;
  starts_at: string;
  ends_at: string;
  weekdays: number[];
  start_time: string;
  end_time: string;
  products: {
    product_id: string;
    variant_id: string | null;
    promotional_price: number | null;
    availability_mode: EventAvailabilityMode;
  }[];
};

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export default function EventForm({
  catalog,
  initialData,
}: {
  catalog: { id: string; name: string; variants: { id: string; name: string }[] }[];
  initialData?: {
    id: string;
    name: string;
    active: boolean;
    schedule_type: EventScheduleType;
    starts_at: string | null;
    ends_at: string | null;
    weekdays: number[] | null;
    start_time: string | null;
    end_time: string | null;
    promotional_event_products: {
      product_id: string;
      variant_id: string | null;
      promotional_price: number | null;
      availability_mode: EventAvailabilityMode;
    }[];
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormEvent>({
    id: initialData?.id,
    name: initialData?.name ?? "",
    active: initialData?.active ?? true,
    schedule_type: initialData?.schedule_type ?? "period",
    starts_at: initialData?.starts_at ? new Date(new Date(initialData.starts_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
    ends_at: initialData?.ends_at ? new Date(new Date(initialData.ends_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
    weekdays: initialData?.weekdays ?? [],
    start_time: initialData?.start_time ?? "",
    end_time: initialData?.end_time ?? "",
    products: initialData?.promotional_event_products?.map((p: { product_id: string; variant_id: string | null; promotional_price: number | null; availability_mode: EventAvailabilityMode }) => ({
      product_id: p.product_id,
      variant_id: p.variant_id,
      promotional_price: p.promotional_price,
      availability_mode: p.availability_mode,
    })) ?? [],
  });

  const toggleWeekday = (day: number) => {
    setForm((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter((d) => d !== day)
        : [...prev.weekdays, day].sort(),
    }));
  };

  const handleProductToggle = (productId: string, variantId: string | null = null, checked: boolean) => {
    setForm(prev => {
      if (checked) {
        return {
          ...prev,
          products: [
            ...prev.products,
            { product_id: productId, variant_id: variantId, promotional_price: null, availability_mode: "inherit" }
          ]
        };
      } else {
        return {
          ...prev,
          products: prev.products.filter(p => !(p.product_id === productId && p.variant_id === variantId))
        };
      }
    });
  };

  const updateProductConfig = (productId: string, variantId: string | null, field: "promotional_price" | "availability_mode", value: number | string | null) => {
    setForm(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.product_id === productId && p.variant_id === variantId) {
          return { ...p, [field]: value };
        }
        return p;
      })
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return alert("Informe o nome do evento.");

    if (form.schedule_type === "period") {
      if (!form.starts_at || !form.ends_at) return alert("Informe a data inicial e final.");
      if (new Date(form.starts_at) >= new Date(form.ends_at)) return alert("A data inicial deve ser menor que a final.");
    } else {
      if (form.weekdays.length === 0) return alert("Selecione ao menos um dia da semana.");
      if (!form.start_time || !form.end_time) return alert("Informe a hora inicial e final.");
      if (form.start_time >= form.end_time) return alert("A hora inicial deve ser menor que a hora final. (Sem pernoite)");
    }

    if (form.products.length === 0) return alert("Selecione ao menos um produto participante.");

    startTransition(async () => {
      const basePayload = {
        name: form.name.trim(),
        active: form.active,
        schedule_type: form.schedule_type,
        starts_at: form.schedule_type === "period" ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.schedule_type === "period" ? new Date(form.ends_at).toISOString() : null,
        weekdays: form.schedule_type === "weekly" ? form.weekdays : null,
        start_time: form.schedule_type === "weekly" ? form.start_time : null,
        end_time: form.schedule_type === "weekly" ? form.end_time : null,
        products: form.products,
      };

      let res: { error?: string, success?: boolean };
      if (form.id) {
        res = await updatePromotionalEvent({ ...basePayload, id: form.id } as unknown as UpdateEventPayload);
      } else {
        res = await createPromotionalEvent(basePayload as unknown as CreateEventPayload);
      }

      if (res.error) {
        alert(res.error);
      } else {
        alert(form.id ? "Evento atualizado!" : "Evento criado!");
        router.push("/admin/eventos");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl pb-24">
      <div className="flex items-center gap-4 py-6">
        <Link
          href="/admin/eventos"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-foreground transition-colors hover:bg-gray-50"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-brand-foreground">
          {form.id ? "Editar Evento" : "Novo Evento"}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-medium">Ativo</span>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <section className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Informações Básicas</h2>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium">Nome do Evento</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border-brand-border bg-gray-50 px-4 py-3"
                placeholder="Ex: Semana do X-Burger"
              />
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium">Tipo de Agenda</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="schedule_type"
                    checked={form.schedule_type === "period"}
                    onChange={() => setForm({ ...form, schedule_type: "period" })}
                  />
                  <span>Período Fixo</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="schedule_type"
                    checked={form.schedule_type === "weekly"}
                    onChange={() => setForm({ ...form, schedule_type: "weekly" })}
                  />
                  <span>Recorrente Semanal</span>
                </label>
              </div>
            </div>

            {form.schedule_type === "period" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Início</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={e => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full rounded-xl border-brand-border bg-gray-50 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Fim</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={e => setForm({ ...form, ends_at: e.target.value })}
                    className="w-full rounded-xl border-brand-border bg-gray-50 px-4 py-3"
                  />
                </div>
              </div>
            )}

            {form.schedule_type === "weekly" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium">Dias da Semana</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                        form.weekdays.includes(day.value)
                          ? "bg-brand-primary text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Hora Início</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={e => setForm({ ...form, start_time: e.target.value })}
                      className="w-full rounded-xl border-brand-border bg-gray-50 px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Hora Fim</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={e => setForm({ ...form, end_time: e.target.value })}
                      className="w-full rounded-xl border-brand-border bg-gray-50 px-4 py-3"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-brand-border bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border">
          <h2 className="text-lg font-bold">Produtos Participantes</h2>
          <p className="text-sm text-brand-muted-foreground mt-1">
            Selecione os produtos ou variantes que participam deste evento e defina o preço ou disponibilidade.
          </p>
        </div>

        <div className="divide-y divide-brand-border">
          {catalog.map(product => {
            const hasVariants = product.variants && product.variants.length > 0;
            const isProductSelected = !hasVariants && form.products.some(p => p.product_id === product.id && p.variant_id === null);

            return (
              <div key={product.id} className="p-6">
                <div className="flex items-center gap-3">
                  {!hasVariants && (
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                      checked={isProductSelected}
                      onChange={e => handleProductToggle(product.id, null, e.target.checked)}
                    />
                  )}
                  <span className="font-bold">{product.name}</span>
                </div>

                {!hasVariants && isProductSelected && (
                  <ProductConfigRow
                    productId={product.id}
                    variantId={null}
                    form={form}
                    updateProductConfig={updateProductConfig}
                  />
                )}

                {hasVariants && (
                  <div className="mt-4 ml-8 space-y-4">
                    {product.variants.map((v: { id: string; name: string; }) => {
                      const isVariantSelected = form.products.some(p => p.product_id === product.id && p.variant_id === v.id);
                      return (
                        <div key={v.id} className="border-l-2 border-brand-border pl-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                              checked={isVariantSelected}
                              onChange={e => handleProductToggle(product.id, v.id, e.target.checked)}
                            />
                            <span className="text-sm font-medium">{v.name}</span>
                          </div>

                          {isVariantSelected && (
                            <ProductConfigRow
                              productId={product.id}
                              variantId={v.id}
                              form={form}
                              updateProductConfig={updateProductConfig}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-end border-t border-brand-border bg-white p-4 shadow-lg sm:p-6 lg:left-64">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-8 py-3 font-bold text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save size={20} />}
          Salvar Evento
        </button>
      </div>
    </form>
  );
}

function ProductConfigRow({ productId, variantId, form, updateProductConfig }: { productId: string; variantId: string | null; form: FormEvent; updateProductConfig: (productId: string, variantId: string | null, field: "promotional_price" | "availability_mode", value: number | string | null) => void }) {
  const selectedProduct = form.products.find((p: { product_id: string; variant_id: string | null; }) => p.product_id === productId && p.variant_id === variantId);

  if (!selectedProduct) return null;

  return (
    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center p-4 bg-gray-50 rounded-xl border border-brand-border">
      <div className="flex-1">
        <label className="text-xs font-medium block mb-1">Preço Promocional (Opcional)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg border-brand-border bg-white py-2 pl-9 pr-3 text-sm"
            placeholder="Ex: 20.00"
            value={selectedProduct.promotional_price ?? ""}
            onChange={e => {
              const val = e.target.value ? parseFloat(e.target.value) : null;
              updateProductConfig(productId, variantId, "promotional_price", val);
            }}
          />
        </div>
      </div>
      <div className="flex-1">
        <label className="text-xs font-medium block mb-1">Disponibilidade</label>
        <select
          className="w-full rounded-lg border-brand-border bg-white px-3 py-2 text-sm"
          value={selectedProduct.availability_mode}
          onChange={e => updateProductConfig(productId, variantId, "availability_mode", e.target.value as EventAvailabilityMode)}
        >
          <option value="inherit">Herdar do Catálogo</option>
          <option value="available_during_event">Disponível no Evento</option>
          <option value="unavailable_during_event">Indisponível no Evento</option>
        </select>
      </div>
    </div>
  );
}
