"use client";

import { useState } from "react";
import { ImagePlus, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Category = {
  id: string;
  name: string;
};

type NewProductDialogProps = {
  categories: Category[];
  createAction: (formData: FormData) => Promise<void>;
};

export default function NewProductDialog({
  categories,
  createAction,
}: NewProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imagePositionX, setImagePositionX] =
  useState(50);

const [imagePositionY, setImagePositionY] =
  useState(50);

  async function handleSubmit(formData: FormData) {
    try {
      setSaving(true);

      await createAction(formData);

      setPreview(null);
      setImagePositionX(50);
      setImagePositionY(50);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#700000]"
          />
        }
      >
        <Plus size={18} />
        Novo produto
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>

          <DialogDescription>
            Cadastre um novo item para o cardápio da La&apos;bel.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="mt-4 space-y-5">
          <div>
            <label className="text-sm font-bold text-[#241B19]">
              Foto do produto
            </label>

            <div className="mt-2 grid gap-3 sm:grid-cols-[120px_1fr]">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[#EEE6DF] bg-[#FFF7F5]">
                {preview ? (
                  <img
                    src={preview}
                    alt="Prévia do produto"
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: `${imagePositionX}% ${imagePositionY}%`,
                    }}
                  />
                ) : (
                  <ImagePlus
                    size={28}
                    className="text-[#D2B48C]"
                  />
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={saving}
                  onChange={handleImageChange}
                  className="block w-full text-sm text-[#756A66] file:mr-4 file:rounded-xl file:border-0 file:bg-[#8B0000]/10 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-[#8B0000]"
                />
              </div>
            </div>

            <p className="mt-2 text-xs text-[#756A66]">
              JPG, PNG ou WebP. Máximo de 5 MB.
            </p>

            {preview && (
              <div className="mt-4 rounded-2xl border border-[#EEE6DF] bg-[#FFFDF9] p-4">
                <p className="text-sm font-bold text-[#241B19]">
                  Ajustar enquadramento
                </p>

                <p className="mt-1 text-xs leading-5 text-[#756A66]">
                  Ajuste a posição da imagem até o produto ficar bem enquadrado.
                </p>

                <div className="mt-4 space-y-4">
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#49352C]">
                        Horizontal
                      </span>

                      <span className="text-xs text-[#756A66]">
                        {imagePositionX}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={imagePositionX}
                      onChange={(event) =>
                        setImagePositionX(
                          Number(event.target.value)
                        )
                      }
                      disabled={saving}
                      className="mt-2 w-full accent-[#8B0000]"
                    />
                  </label>

                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#49352C]">
                        Vertical
                      </span>

                      <span className="text-xs text-[#756A66]">
                        {imagePositionY}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={imagePositionY}
                      onChange={(event) =>
                        setImagePositionY(
                          Number(event.target.value)
                        )
                      }
                      disabled={saving}
                      className="mt-2 w-full accent-[#8B0000]"
                    />
                  </label>
                </div>

                <input
                  type="hidden"
                  name="image_position_x"
                  value={imagePositionX}
                />

                <input
                  type="hidden"
                  name="image_position_y"
                  value={imagePositionY}
                />
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="product-name"
              className="text-sm font-bold text-[#241B19]"
            >
              Nome do produto
            </label>

            <input
              id="product-name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              disabled={saving}
              placeholder="Ex: Banoffee"
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="product-category"
              className="text-sm font-bold text-[#241B19]"
            >
              Categoria
            </label>

            <select
              id="product-category"
              name="category_id"
              required
              disabled={saving}
              defaultValue=""
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            >
              <option value="" disabled>
                Selecione uma categoria
              </option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="product-description"
              className="text-sm font-bold text-[#241B19]"
            >
              Descrição
            </label>

            <textarea
              id="product-description"
              name="description"
              rows={4}
              maxLength={500}
              disabled={saving}
              placeholder="Descreva o produto..."
              className="mt-2 w-full resize-none rounded-xl border border-[#DDD3CB] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="product-price"
              className="text-sm font-bold text-[#241B19]"
            >
              Preço
            </label>

            <input
              id="product-price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              disabled={saving}
              placeholder="0,00"
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EEE6DF] p-4">
              <input
                type="checkbox"
                name="available"
                defaultChecked
                disabled={saving}
                className="h-4 w-4 accent-[#8B0000]"
              />

              <div>
                <p className="text-sm font-bold text-[#241B19]">
                  Disponível
                </p>

                <p className="text-xs text-[#756A66]">
                  Pode ser pedido hoje
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EEE6DF] p-4">
              <input
                type="checkbox"
                name="featured"
                disabled={saving}
                className="h-4 w-4 accent-[#8B0000]"
              />

              <div>
                <p className="text-sm font-bold text-[#241B19]">
                  Destaque
                </p>

                <p className="text-xs text-[#756A66]">
                  Aparece em evidência
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EEE6DF] p-4">
              <input
                type="checkbox"
                name="active"
                defaultChecked
                disabled={saving}
                className="h-4 w-4 accent-[#8B0000]"
              />

              <div>
                <p className="text-sm font-bold text-[#241B19]">
                  Ativo
                </p>

                <p className="text-xs text-[#756A66]">
                  Exibido no sistema
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setImagePositionX(50);
                setImagePositionY(50);
                setOpen(false);
              }}
              disabled={saving}
              className="rounded-xl border border-[#EEE6DF] px-4 py-2.5 text-sm font-bold text-[#756A66] disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#700000] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Cadastrar produto"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}