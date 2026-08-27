"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CircleDollarSign,
  Plus,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import type { CatalogAdminActionResult } from "@/app/admin/(dashboard)/produtos/catalog-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  FoodCatalogConfiguration,
  ProductOption,
  ProductOptionGroup,
  ProductVariant,
} from "@/lib/food-catalog/types";

type CatalogAction = (formData: FormData) => Promise<CatalogAdminActionResult>;

type ConfigurableProductDialogProps = {
  productId: string;
  productName: string;
  configuration: FoodCatalogConfiguration;
  setPricingModeAction: CatalogAction;
  saveVariantAction: CatalogAction;
  removeVariantAction: CatalogAction;
  reorderVariantAction: CatalogAction;
  saveGroupAction: CatalogAction;
  removeGroupAction: CatalogAction;
  reorderGroupAction: CatalogAction;
  saveOptionAction: CatalogAction;
  removeOptionAction: CatalogAction;
  reorderOptionAction: CatalogAction;
};

const fieldClass =
  "h-10 rounded-xl border border-brand-border bg-white px-3 text-sm outline-none transition focus:border-brand-primary disabled:opacity-60";
const smallButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-primary transition hover:border-brand-secondary disabled:cursor-not-allowed disabled:opacity-30";

function money(value: number) {
  return value.toFixed(2);
}

function EntityControls({
  productId,
  entityId,
  optionGroupId,
  first,
  last,
  busy,
  label,
  moveAction,
  removeAction,
  runAction,
}: {
  productId: string;
  entityId: string;
  optionGroupId?: string;
  first: boolean;
  last: boolean;
  busy: boolean;
  label: string;
  moveAction: CatalogAction;
  removeAction: CatalogAction;
  runAction: (
    action: CatalogAction,
    formData: FormData,
    confirmation?: string
  ) => Promise<void>;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {(["up", "down"] as const).map((direction) => (
        <form
          key={direction}
          action={(formData) => runAction(moveAction, formData)}
        >
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="entity_id" value={entityId} />
          <input type="hidden" name="direction" value={direction} />
          {optionGroupId && (
            <input
              type="hidden"
              name="option_group_id"
              value={optionGroupId}
            />
          )}
          <button
            type="submit"
            disabled={busy || (direction === "up" ? first : last)}
            title={`${direction === "up" ? "Subir" : "Descer"} ${label}`}
            className={smallButtonClass}
          >
            {direction === "up" ? (
              <ArrowUp size={14} />
            ) : (
              <ArrowDown size={14} />
            )}
          </button>
        </form>
      ))}

      <form
        action={(formData) =>
          runAction(
            removeAction,
            formData,
            `Remover ${label}? Pedidos anteriores manterão o registro original.`
          )
        }
      >
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="entity_id" value={entityId} />
        {optionGroupId && (
          <input
            type="hidden"
            name="option_group_id"
            value={optionGroupId}
          />
        )}
        <button
          type="submit"
          disabled={busy}
          title={`Remover ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
        >
          <Trash2 size={14} />
        </button>
      </form>
    </div>
  );
}

function StatusChecks({
  active,
  available,
  busy,
}: {
  active: boolean;
  available?: boolean;
  busy: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3 text-xs font-semibold text-brand-muted-foreground">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={active}
          disabled={busy}
          className="accent-brand-primary"
        />
        Ativo
      </label>
      {available !== undefined && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="available"
            defaultChecked={available}
            disabled={busy}
            className="accent-brand-primary"
          />
          Disponível
        </label>
      )}
    </div>
  );
}

export default function ConfigurableProductDialog({
  productId,
  productName,
  configuration,
  setPricingModeAction,
  saveVariantAction,
  removeVariantAction,
  reorderVariantAction,
  saveGroupAction,
  removeGroupAction,
  reorderGroupAction,
  saveOptionAction,
  removeOptionAction,
  reorderOptionAction,
}: ConfigurableProductDialogProps) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<CatalogAdminActionResult | null>(
    null
  );

  async function runAction(
    action: CatalogAction,
    formData: FormData,
    confirmation?: string
  ) {
    if (confirmation && !window.confirm(confirmation)) {
      return;
    }

    setBusy(true);
    setFeedback(null);

    try {
      setFeedback(await action(formData));
    } catch {
      setFeedback({
        ok: false,
        message: "Sua sessão não permite esta alteração. Entre novamente.",
      });
    } finally {
      setBusy(false);
    }
  }

  const isConfigured =
    configuration.pricingMode === "variant" ||
    configuration.optionGroups.length > 0;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-primary transition hover:border-brand-secondary"
          />
        }
      >
        <SlidersHorizontal size={15} />
        {isConfigured ? "Configuração" : "Configurar"}
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Configurar {productName}</DialogTitle>
          <DialogDescription>
            Use esta área somente quando o produto tiver tamanhos, versões ou
            escolhas. O cadastro básico continua simples.
          </DialogDescription>
        </DialogHeader>

        {feedback && (
          <div
            role="status"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
              feedback.ok
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <section className="mt-5 rounded-2xl border border-brand-border bg-brand-background p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <CircleDollarSign className="mt-0.5 text-brand-primary" size={20} />
            <div>
              <h3 className="font-bold text-brand-foreground">Tipo de preço</h3>
              <p className="mt-1 text-xs leading-5 text-brand-muted-foreground">
                O preço simples usa o valor do cadastro atual. Preço por variante
                exige ao menos uma variante ativa e disponível.
              </p>
            </div>
          </div>

          <form
            action={(formData) => runAction(setPricingModeAction, formData)}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="product_id" value={productId} />
            <label className="flex-1 text-xs font-bold text-brand-foreground">
              Configuração de preço
              <select
                name="pricing_mode"
                defaultValue={configuration.pricingMode}
                disabled={busy}
                className={`${fieldClass} mt-2 w-full`}
              >
                <option value="simple">Produto simples — preço único</option>
                <option value="variant">Produto com preço por variante</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-xl bg-brand-primary px-4 text-sm font-bold text-brand-primary-foreground disabled:opacity-50"
            >
              Salvar tipo
            </button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-brand-border p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-brand-foreground">Variantes</h3>
              <p className="mt-1 text-xs leading-5 text-brand-muted-foreground">
                Exemplos: P, M, G; 300 ml e 500 ml; individual e família.
              </p>
            </div>
            <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-bold text-brand-primary">
              {configuration.variants.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {configuration.variants.map((variant, index) => (
              <VariantEditor
                key={variant.id}
                productId={productId}
                variant={variant}
                first={index === 0}
                last={index === configuration.variants.length - 1}
                busy={busy}
                saveAction={saveVariantAction}
                removeAction={removeVariantAction}
                reorderAction={reorderVariantAction}
                runAction={runAction}
              />
            ))}

            {configuration.variants.length === 0 && (
              <p className="rounded-xl bg-brand-background px-4 py-3 text-sm text-brand-muted-foreground">
                Nenhuma variante cadastrada. Produtos simples não precisam delas.
              </p>
            )}

            <details className="rounded-xl border border-dashed border-brand-border p-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-brand-primary">
                <Plus size={16} /> Adicionar variante
              </summary>
              <form
                action={(formData) => runAction(saveVariantAction, formData)}
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
              >
                <input type="hidden" name="product_id" value={productId} />
                <label className="text-xs font-bold text-brand-foreground">
                  Nome
                  <input
                    name="name"
                    required
                    maxLength={120}
                    placeholder="Ex.: Grande"
                    disabled={busy}
                    className={`${fieldClass} mt-2 w-full`}
                  />
                </label>
                <label className="text-xs font-bold text-brand-foreground">
                  Preço
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0,00"
                    disabled={busy}
                    className={`${fieldClass} mt-2 w-full`}
                  />
                </label>
                <div className="space-y-3">
                  <StatusChecks active available busy={busy} />
                  <button
                    type="submit"
                    disabled={busy}
                    className="h-10 w-full rounded-xl bg-brand-primary px-4 text-sm font-bold text-brand-primary-foreground disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </details>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-brand-border p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-brand-foreground">
                Grupos de opções
              </h3>
              <p className="mt-1 text-xs leading-5 text-brand-muted-foreground">
                Organize escolhas obrigatórias, adicionais pagos e remoções.
              </p>
            </div>
            <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-bold text-brand-primary">
              {configuration.optionGroups.length}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {configuration.optionGroups.map((group, index) => (
              <OptionGroupEditor
                key={group.id}
                productId={productId}
                group={group}
                first={index === 0}
                last={index === configuration.optionGroups.length - 1}
                busy={busy}
                saveGroupAction={saveGroupAction}
                removeGroupAction={removeGroupAction}
                reorderGroupAction={reorderGroupAction}
                saveOptionAction={saveOptionAction}
                removeOptionAction={removeOptionAction}
                reorderOptionAction={reorderOptionAction}
                runAction={runAction}
              />
            ))}

            {configuration.optionGroups.length === 0 && (
              <p className="rounded-xl bg-brand-background px-4 py-3 text-sm text-brand-muted-foreground">
                Nenhum grupo cadastrado. O produto continua no fluxo simples.
              </p>
            )}

            <details className="rounded-xl border border-dashed border-brand-border p-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-brand-primary">
                <Plus size={16} /> Adicionar grupo
              </summary>
              <p className="mt-3 text-xs text-brand-muted-foreground">
                O grupo começa opcional. Depois de adicionar as opções, ajuste o
                mínimo para torná-lo obrigatório.
              </p>
              <form
                action={(formData) => runAction(saveGroupAction, formData)}
                className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <input type="hidden" name="product_id" value={productId} />
                <input type="hidden" name="min_selections" value="0" />
                <input type="hidden" name="max_selections" value="1" />
                <input type="hidden" name="active" value="on" />
                <label className="text-xs font-bold text-brand-foreground lg:col-span-2">
                  Nome
                  <input
                    name="name"
                    required
                    maxLength={120}
                    placeholder="Ex.: Adicionais"
                    disabled={busy}
                    className={`${fieldClass} mt-2 w-full`}
                  />
                </label>
                <label className="text-xs font-bold text-brand-foreground">
                  Seleção
                  <select
                    name="selection_mode"
                    defaultValue="single"
                    disabled={busy}
                    className={`${fieldClass} mt-2 w-full`}
                  >
                    <option value="single">Uma escolha</option>
                    <option value="multiple">Várias escolhas</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-brand-foreground">
                  Apresentação
                  <select
                    name="presentation_mode"
                    defaultValue="choice"
                    disabled={busy}
                    className={`${fieldClass} mt-2 w-full`}
                  >
                    <option value="choice">Escolha</option>
                    <option value="addition">Adicional (+)</option>
                    <option value="removal">Remoção (-)</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-10 rounded-xl bg-brand-primary px-4 text-sm font-bold text-brand-primary-foreground disabled:opacity-50 sm:col-span-2 lg:col-span-4"
                >
                  Criar grupo
                </button>
              </form>
            </details>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function VariantEditor({
  productId,
  variant,
  first,
  last,
  busy,
  saveAction,
  removeAction,
  reorderAction,
  runAction,
}: {
  productId: string;
  variant: ProductVariant;
  first: boolean;
  last: boolean;
  busy: boolean;
  saveAction: CatalogAction;
  removeAction: CatalogAction;
  reorderAction: CatalogAction;
  runAction: (
    action: CatalogAction,
    formData: FormData,
    confirmation?: string
  ) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-brand-border bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <form
          action={(formData) => runAction(saveAction, formData)}
          className="grid flex-1 gap-3 sm:grid-cols-[1fr_150px_auto] sm:items-end"
        >
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="variant_id" value={variant.id} />
          <label className="text-xs font-bold text-brand-foreground">
            Nome
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={variant.name}
              disabled={busy}
              className={`${fieldClass} mt-2 w-full`}
            />
          </label>
          <label className="text-xs font-bold text-brand-foreground">
            Preço
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={money(variant.price)}
              disabled={busy}
              className={`${fieldClass} mt-2 w-full`}
            />
          </label>
          <div className="space-y-3">
            <StatusChecks
              active={variant.active}
              available={variant.available}
              busy={busy}
            />
            <button
              type="submit"
              disabled={busy}
              className="h-9 w-full rounded-lg border border-brand-primary px-3 text-xs font-bold text-brand-primary disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </form>
        <EntityControls
          productId={productId}
          entityId={variant.id}
          first={first}
          last={last}
          busy={busy}
          label={`a variante ${variant.name}`}
          moveAction={reorderAction}
          removeAction={removeAction}
          runAction={runAction}
        />
      </div>
    </div>
  );
}

function OptionGroupEditor({
  productId,
  group,
  first,
  last,
  busy,
  saveGroupAction,
  removeGroupAction,
  reorderGroupAction,
  saveOptionAction,
  removeOptionAction,
  reorderOptionAction,
  runAction,
}: {
  productId: string;
  group: ProductOptionGroup;
  first: boolean;
  last: boolean;
  busy: boolean;
  saveGroupAction: CatalogAction;
  removeGroupAction: CatalogAction;
  reorderGroupAction: CatalogAction;
  saveOptionAction: CatalogAction;
  removeOptionAction: CatalogAction;
  reorderOptionAction: CatalogAction;
  runAction: (
    action: CatalogAction,
    formData: FormData,
    confirmation?: string
  ) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings2 size={17} className="text-brand-primary" />
          <div>
            <h4 className="font-bold text-brand-foreground">{group.name}</h4>
            <p className="mt-0.5 text-[11px] text-brand-muted-foreground">
              {group.minSelections > 0 ? "Obrigatório" : "Opcional"} ·{" "}
              {group.selectionMode === "single"
                ? "uma escolha"
                : "múltiplas escolhas"}
            </p>
          </div>
        </div>
        <EntityControls
          productId={productId}
          entityId={group.id}
          first={first}
          last={last}
          busy={busy}
          label={`o grupo ${group.name}`}
          moveAction={reorderGroupAction}
          removeAction={removeGroupAction}
          runAction={runAction}
        />
      </div>

      <form
        action={(formData) => runAction(saveGroupAction, formData)}
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="option_group_id" value={group.id} />
        <label className="text-xs font-bold text-brand-foreground sm:col-span-2">
          Nome
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={group.name}
            disabled={busy}
            className={`${fieldClass} mt-2 w-full`}
          />
        </label>
        <label className="text-xs font-bold text-brand-foreground">
          Seleção
          <select
            name="selection_mode"
            defaultValue={group.selectionMode}
            disabled={busy}
            className={`${fieldClass} mt-2 w-full`}
          >
            <option value="single">Uma</option>
            <option value="multiple">Várias</option>
          </select>
        </label>
        <label className="text-xs font-bold text-brand-foreground">
          Mínimo
          <input
            name="min_selections"
            type="number"
            min="0"
            max="50"
            required
            defaultValue={group.minSelections}
            disabled={busy}
            className={`${fieldClass} mt-2 w-full`}
          />
        </label>
        <label className="text-xs font-bold text-brand-foreground">
          Máximo
          <input
            name="max_selections"
            type="number"
            min="1"
            max="50"
            defaultValue={group.maxSelections ?? ""}
            placeholder="Sem limite"
            disabled={busy}
            className={`${fieldClass} mt-2 w-full`}
          />
        </label>
        <label className="text-xs font-bold text-brand-foreground">
          Apresentação
          <select
            name="presentation_mode"
            defaultValue={group.presentationMode}
            disabled={busy}
            className={`${fieldClass} mt-2 w-full`}
          >
            <option value="choice">Escolha</option>
            <option value="addition">Adicional (+)</option>
            <option value="removal">Remoção (-)</option>
          </select>
        </label>
        <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-6">
          <StatusChecks active={group.active} busy={busy} />
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-lg border border-brand-primary px-4 text-xs font-bold text-brand-primary disabled:opacity-50"
          >
            Salvar regras
          </button>
        </div>
      </form>

      <div className="mt-4 border-t border-brand-border pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-muted-foreground">
          Opções
        </p>
        <div className="mt-3 space-y-2">
          {group.options.map((option, index) => (
            <OptionEditor
              key={option.id}
              productId={productId}
              groupId={group.id}
              option={option}
              first={index === 0}
              last={index === group.options.length - 1}
              busy={busy}
              saveAction={saveOptionAction}
              removeAction={removeOptionAction}
              reorderAction={reorderOptionAction}
              runAction={runAction}
            />
          ))}

          <details className="rounded-xl border border-dashed border-brand-border bg-white p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-brand-primary">
              <Plus size={14} /> Adicionar opção
            </summary>
            <form
              action={(formData) => runAction(saveOptionAction, formData)}
              className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_auto] sm:items-end"
            >
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="option_group_id" value={group.id} />
              <label className="text-xs font-bold text-brand-foreground">
                Nome
                <input
                  name="name"
                  required
                  maxLength={120}
                  placeholder="Ex.: Cheddar"
                  disabled={busy}
                  className={`${fieldClass} mt-2 w-full`}
                />
              </label>
              <label className="text-xs font-bold text-brand-foreground">
                Acréscimo
                <input
                  name="price_delta"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue="0.00"
                  disabled={busy}
                  className={`${fieldClass} mt-2 w-full`}
                />
              </label>
              <div className="space-y-3">
                <StatusChecks active available busy={busy} />
                <button
                  type="submit"
                  disabled={busy}
                  className="h-9 w-full rounded-lg bg-brand-primary px-3 text-xs font-bold text-brand-primary-foreground disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}

function OptionEditor({
  productId,
  groupId,
  option,
  first,
  last,
  busy,
  saveAction,
  removeAction,
  reorderAction,
  runAction,
}: {
  productId: string;
  groupId: string;
  option: ProductOption;
  first: boolean;
  last: boolean;
  busy: boolean;
  saveAction: CatalogAction;
  removeAction: CatalogAction;
  reorderAction: CatalogAction;
  runAction: (
    action: CatalogAction,
    formData: FormData,
    confirmation?: string
  ) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-border bg-white p-3 lg:flex-row lg:items-end">
      <form
        action={(formData) => runAction(saveAction, formData)}
        className="grid flex-1 gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end"
      >
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="option_group_id" value={groupId} />
        <input type="hidden" name="option_id" value={option.id} />
        <label className="text-xs font-bold text-brand-foreground">
          Nome
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={option.name}
            disabled={busy}
            className={`${fieldClass} mt-2 w-full`}
          />
        </label>
        <label className="text-xs font-bold text-brand-foreground">
          Acréscimo
          <input
            name="price_delta"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={money(option.priceDelta)}
            disabled={busy}
            className={`${fieldClass} mt-2 w-full`}
          />
        </label>
        <div className="space-y-3">
          <StatusChecks
            active={option.active}
            available={option.available}
            busy={busy}
          />
          <button
            type="submit"
            disabled={busy}
            className="h-9 w-full rounded-lg border border-brand-primary px-3 text-xs font-bold text-brand-primary disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </form>
      <EntityControls
        productId={productId}
        entityId={option.id}
        optionGroupId={groupId}
        first={first}
        last={last}
        busy={busy}
        label={`a opção ${option.name}`}
        moveAction={reorderAction}
        removeAction={removeAction}
        runAction={runAction}
      />
    </div>
  );
}
