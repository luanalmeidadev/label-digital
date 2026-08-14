"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UpdatePreorderProductResult } from "@/app/admin/(dashboard)/encomendas/actions";
import type {
  PreorderPrice,
  PreorderProduct,
} from "@/lib/preorder-menu";

type EditPreorderProductDialogProps = {
  categoryId: string;
  product: PreorderProduct;
  updateAction: (
    formData: FormData
  ) => Promise<UpdatePreorderProductResult>;
};

export default function EditPreorderProductDialog({
  categoryId,
  product,
  updateAction,
}: EditPreorderProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [prices, setPrices] = useState<
    PreorderPrice[]
  >(() => product.prices.map((price) => ({
    ...price,
  })));
  const [flavorsText, setFlavorsText] =
    useState((product.flavors ?? []).join("\n"));
  const [positionX, setPositionX] = useState(
    product.imagePositionX ?? 50
  );
  const [positionY, setPositionY] = useState(
    product.imagePositionY ?? 50
  );
  const [preview, setPreview] = useState(
    product.image
  );
  const [temporaryPreview, setTemporaryPreview] =
    useState<string | null>(null);
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (temporaryPreview) {
        URL.revokeObjectURL(temporaryPreview);
      }
    };
  }, [temporaryPreview]);

  function resetFields() {
    setPrices(
      product.prices.map((price) => ({
        ...price,
      }))
    );
    setFlavorsText(
      (product.flavors ?? []).join("\n")
    );
    if (temporaryPreview) {
      URL.revokeObjectURL(temporaryPreview);
    }
    setTemporaryPreview(null);
    setPreview(product.image);
    setPositionX(product.imagePositionX ?? 50);
    setPositionY(product.imagePositionY ?? 50);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setError("");
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const image = event.target.files?.[0];

    if (!image) {
      return;
    }

    if (temporaryPreview) {
      URL.revokeObjectURL(temporaryPreview);
    }

    const objectUrl = URL.createObjectURL(image);
    setTemporaryPreview(objectUrl);
    setPreview(objectUrl);
  }

  function updatePrice(
    index: number,
    field: keyof PreorderPrice,
    value: string
  ) {
    setPrices((current) =>
      current.map((price, priceIndex) =>
        priceIndex === index
          ? { ...price, [field]: value }
          : price
      )
    );
  }

  function removePrice(index: number) {
    if (prices.length === 1) {
      setError(
        "O produto precisa ter pelo menos uma opção."
      );
      return;
    }

    setPrices((current) =>
      current.filter(
        (_, priceIndex) => priceIndex !== index
      )
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const formData = new FormData(
      event.currentTarget
    );
    const flavors = flavorsText
      .split("\n")
      .map((flavor) => flavor.trim())
      .filter(Boolean);

    formData.set(
      "prices",
      JSON.stringify(prices)
    );
    formData.set(
      "flavors",
      JSON.stringify(flavors)
    );

    try {
      const result = await updateAction(formData);

      if (!result.success) {
        setError(
          result.error ??
            "Não foi possível salvar as alterações."
        );
        return;
      }

      setOpen(false);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível salvar as alterações."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          resetFields();
        }
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#EEE6DF] px-3 py-2 text-xs font-bold text-[#8B0000] transition hover:border-[#D2B48C] hover:bg-[#FFF7F5]"
          />
        }
      >
        <Pencil size={15} />
        Editar opções
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[#EEE6DF] px-5 py-5 pr-14 sm:px-6">
          <DialogTitle className="text-xl font-bold text-[#241B19]">
            {product.name}
          </DialogTitle>
          <DialogDescription>
            Altere a foto, preços, tamanhos, sabores e regras do pedido.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 px-5 pb-6 sm:px-6"
        >
          <input
            type="hidden"
            name="category_id"
            value={categoryId}
          />
          <input
            type="hidden"
            name="product_name"
            value={product.name}
          />

          <fieldset>
            <legend className="text-sm font-bold text-[#241B19]">
              Foto do produto
            </legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-[150px_1fr]">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[#EEE6DF] bg-[#FFF7F5]">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt={`Prévia de ${product.name}`}
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: `${positionX}% ${positionY}%`,
                    }}
                  />
                ) : (
                  <ImagePlus
                    size={34}
                    className="text-[#D2B48C]"
                  />
                )}
              </div>

              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={saving}
                  onChange={handleImageChange}
                  className="block w-full text-sm text-[#756A66] file:mr-3 file:rounded-xl file:border-0 file:bg-[#8B0000]/10 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-[#8B0000]"
                />
                <p className="text-xs leading-5 text-[#756A66]">
                  JPG, PNG ou WebP, com até 5 MB. Se nenhuma foto for escolhida, a atual será mantida.
                </p>

                <label className="block">
                  <span className="flex justify-between text-xs font-bold text-[#49352C]">
                    Horizontal
                    <span className="font-normal text-[#756A66]">
                      {positionX}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={positionX}
                    disabled={saving}
                    onChange={(event) =>
                      setPositionX(
                        Number(event.target.value)
                      )
                    }
                    className="mt-2 w-full accent-[#8B0000]"
                  />
                </label>

                <label className="block">
                  <span className="flex justify-between text-xs font-bold text-[#49352C]">
                    Vertical
                    <span className="font-normal text-[#756A66]">
                      {positionY}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={positionY}
                    disabled={saving}
                    onChange={(event) =>
                      setPositionY(
                        Number(event.target.value)
                      )
                    }
                    className="mt-2 w-full accent-[#8B0000]"
                  />
                </label>
              </div>
            </div>

            <input
              type="hidden"
              name="image_position_x"
              value={positionX}
            />
            <input
              type="hidden"
              name="image_position_y"
              value={positionY}
            />
          </fieldset>

          <fieldset>
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-bold text-[#241B19]">
                Tamanhos e preços
              </legend>
              <button
                type="button"
                onClick={() => {
                  setPrices((current) => [
                    ...current,
                    { label: "", value: "" },
                  ]);
                  setError("");
                }}
                disabled={saving}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#8B0000] disabled:opacity-50"
              >
                <Plus size={15} />
                Adicionar opção
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {prices.map((price, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1fr_auto] gap-2"
                >
                  <input
                    type="text"
                    value={price.label}
                    onChange={(event) =>
                      updatePrice(
                        index,
                        "label",
                        event.target.value
                      )
                    }
                    placeholder="Ex.: Médio"
                    maxLength={80}
                    disabled={saving}
                    className="h-11 min-w-0 rounded-xl border border-[#DDD3CC] px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
                  />
                  <input
                    type="text"
                    value={price.value}
                    onChange={(event) =>
                      updatePrice(
                        index,
                        "value",
                        event.target.value
                      )
                    }
                    placeholder="Ex.: R$ 150,00"
                    maxLength={40}
                    disabled={saving}
                    className="h-11 min-w-0 rounded-xl border border-[#DDD3CC] px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      removePrice(index)
                    }
                    disabled={saving}
                    aria-label={`Remover opção ${
                      price.label || index + 1
                    }`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-bold text-[#241B19]">
              Sabores
            </span>
            <span className="mt-1 block text-xs text-[#756A66]">
              Digite um sabor por linha. Deixe vazio quando o produto não tiver escolha de sabor.
            </span>
            <textarea
              value={flavorsText}
              onChange={(event) =>
                setFlavorsText(event.target.value)
              }
              rows={7}
              disabled={saving}
              className="mt-2 w-full resize-y rounded-xl border border-[#DDD3CC] px-4 py-3 text-sm leading-6 outline-none focus:border-[#8B0000] disabled:opacity-60"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Quantidade mínima
              </span>
              <input
                type="number"
                name="minimum_quantity"
                min="1"
                max="10000"
                step="1"
                required
                defaultValue={
                  product.minimumQuantity ?? 1
                }
                disabled={saving}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Quantidades rápidas
              </span>
              <input
                type="text"
                name="allowed_quantities"
                defaultValue={
                  product.allowedQuantities?.join(", ") ?? ""
                }
                placeholder="Ex.: 25, 50, 75, 100"
                disabled={saving}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
              />
              <span className="mt-1 block text-xs leading-5 text-[#756A66]">
                Opções exibidas na caixa de seleção.
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Incremento acima das opções
              </span>
              <input
                type="number"
                name="quantity_increment"
                min="1"
                max="10000"
                step="1"
                defaultValue={
                  product.quantityIncrement ?? ""
                }
                placeholder="Ex.: 25"
                disabled={saving}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
              />
              <span className="mt-1 block text-xs leading-5 text-[#756A66]">
                Permite continuar acima da maior opção, nesse intervalo.
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                O preço corresponde a
              </span>
              <div className="mt-2 flex h-11 overflow-hidden rounded-xl border border-[#DDD3CC] focus-within:border-[#8B0000]">
                <input
                  type="number"
                  name="price_base_quantity"
                  min="1"
                  max="10000"
                  step="1"
                  required
                  defaultValue={
                    product.priceBaseQuantity ?? 1
                  }
                  disabled={saving}
                  className="min-w-0 flex-1 px-3 text-sm outline-none disabled:opacity-60"
                />
                <span className="flex items-center border-l border-[#EEE6DF] bg-[#FFF9F3] px-3 text-xs text-[#756A66]">
                  itens
                </span>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Unidade da quantidade
              </span>
              <input
                type="text"
                name="quantity_unit"
                required
                maxLength={30}
                defaultValue={
                  product.quantityUnit ?? "item(ns)"
                }
                placeholder="Ex.: bolo(s)"
                disabled={saving}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Antecedência mínima
              </span>
              <div className="mt-2 flex h-11 overflow-hidden rounded-xl border border-[#DDD3CC] focus-within:border-[#8B0000]">
                <input
                  type="number"
                  name="lead_time_days"
                  min="1"
                  max="365"
                  step="1"
                  required
                  defaultValue={
                    product.leadTimeDays ?? 2
                  }
                  disabled={saving}
                  className="min-w-0 flex-1 px-3 text-sm outline-none disabled:opacity-60"
                />
                <span className="flex items-center border-l border-[#EEE6DF] bg-[#FFF9F3] px-3 text-xs text-[#756A66]">
                  dias
                </span>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Máximo de sabores
              </span>
              <input
                type="number"
                name="max_flavors"
                min="1"
                max="40"
                step="1"
                defaultValue={
                  product.maxFlavors ?? ""
                }
                placeholder="Sem limite"
                disabled={saving}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#241B19]">
                Quantidade para liberar 1 sabor
              </span>
              <input
                type="number"
                name="flavor_quantity_step"
                min="1"
                max="10000"
                step="1"
                defaultValue={
                  product.flavorQuantityStep ?? ""
                }
                placeholder="Ex.: 25"
                disabled={saving}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] px-3 text-sm outline-none focus:border-[#8B0000] disabled:opacity-60"
              />
              <span className="mt-1 block text-xs leading-5 text-[#756A66]">
                Ex.: 25 libera 1 sabor, 50 libera 2. Deixe vazio para não usar essa regra.
              </span>
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#EEE6DF] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                resetFields();
                setOpen(false);
              }}
              disabled={saving}
              className="rounded-xl border border-[#EEE6DF] px-5 py-3 text-sm font-bold text-[#756A66] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#700000] disabled:opacity-60"
            >
              {saving
                ? "Salvando..."
                : "Salvar alterações"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
