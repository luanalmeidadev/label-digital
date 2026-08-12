"use client";

import { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Pencil,
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

type Category = {
  id: string;
  name: string;
};

type EditProductDialogProps = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string | null;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
  active: boolean;
  categories: Category[];
  updateAction: (formData: FormData) => Promise<void>;
};

export default function EditProductDialog({
  id,
  name,
  description,
  price,
  categoryId,
  imageUrl,
  available,
  featured,
  active,
  categories,
  updateAction,
}: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [preview, setPreview] = useState<string | null>(
    imageUrl
  );

  const [temporaryPreview, setTemporaryPreview] =
    useState<string | null>(null);

  const [removeImage, setRemoveImage] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (temporaryPreview) {
        URL.revokeObjectURL(temporaryPreview);
      }
    };
  }, [temporaryPreview]);

  function resetImageState() {
    if (temporaryPreview) {
      URL.revokeObjectURL(temporaryPreview);
    }

    setTemporaryPreview(null);
    setPreview(imageUrl);
    setRemoveImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (temporaryPreview) {
      URL.revokeObjectURL(temporaryPreview);
    }

    const objectUrl = URL.createObjectURL(file);

    setTemporaryPreview(objectUrl);
    setPreview(objectUrl);
    setRemoveImage(false);
  }

  function handleRemoveImage() {
    if (temporaryPreview) {
      URL.revokeObjectURL(temporaryPreview);
    }

    setTemporaryPreview(null);
    setPreview(null);
    setRemoveImage(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(formData: FormData) {
    try {
      setSaving(true);

      formData.set(
        "remove_image",
        removeImage ? "true" : "false"
      );

      await updateAction(formData);

      setTemporaryPreview(null);
      setRemoveImage(false);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
  if (nextOpen) {
    if (temporaryPreview) {
      URL.revokeObjectURL(temporaryPreview);
    }

    setTemporaryPreview(null);
    setPreview(imageUrl);
    setRemoveImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  if (!nextOpen && !saving) {
    resetImageState();
  }

  setOpen(nextOpen);
}

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-[#EEE6DF] px-3 py-2 text-xs font-bold text-[#8B0000] transition hover:border-[#D2B48C]"
          />
        }
      >
        <Pencil size={15} />
        Editar
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>

          <DialogDescription>
            Atualize as informações e a foto do produto.
          </DialogDescription>
        </DialogHeader>

        <form
          action={handleSubmit}
          className="mt-4 space-y-5"
        >
          <input
            type="hidden"
            name="id"
            value={id}
          />

          {/* FOTO */}
          <div>
            <label className="text-sm font-bold text-[#241B19]">
              Foto do produto
            </label>

            <div className="mt-2 grid gap-4 sm:grid-cols-[140px_1fr]">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[#EEE6DF] bg-[#FFF7F5]">
                {preview ? (
                  <img
                    src={preview}
                    alt={`Foto de ${name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus
                    size={32}
                    className="text-[#D2B48C]"
                  />
                )}
              </div>

              <div className="flex flex-col justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={saving}
                  onChange={handleImageChange}
                  className="block w-full text-sm text-[#756A66] file:mr-4 file:rounded-xl file:border-0 file:bg-[#8B0000]/10 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-[#8B0000]"
                />

                <p className="text-xs text-[#756A66]">
                  JPG, PNG ou WebP. Máximo de 5 MB.
                </p>

                {preview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={saving}
                    className="flex w-fit items-center gap-2 text-xs font-bold text-red-600 transition hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Remover foto
                  </button>
                )}

                {removeImage && (
                  <p className="text-xs font-semibold text-red-600">
                    A foto será removida quando você
                    salvar as alterações.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* NOME */}
          <div>
            <label
              htmlFor={`product-name-${id}`}
              className="text-sm font-bold text-[#241B19]"
            >
              Nome do produto
            </label>

            <input
              id={`product-name-${id}`}
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              defaultValue={name}
              disabled={saving}
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </div>

          {/* CATEGORIA */}
          <div>
            <label
              htmlFor={`product-category-${id}`}
              className="text-sm font-bold text-[#241B19]"
            >
              Categoria
            </label>

            <select
              id={`product-category-${id}`}
              name="category_id"
              required
              defaultValue={categoryId ?? ""}
              disabled={saving}
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            >
              <option
                value=""
                disabled
              >
                Selecione uma categoria
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* DESCRIÇÃO */}
          <div>
            <label
              htmlFor={`product-description-${id}`}
              className="text-sm font-bold text-[#241B19]"
            >
              Descrição
            </label>

            <textarea
              id={`product-description-${id}`}
              name="description"
              rows={4}
              maxLength={500}
              defaultValue={description ?? ""}
              disabled={saving}
              className="mt-2 w-full resize-none rounded-xl border border-[#DDD3CB] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </div>

          {/* PREÇO */}
          <div>
            <label
              htmlFor={`product-price-${id}`}
              className="text-sm font-bold text-[#241B19]"
            >
              Preço
            </label>

            <input
              id={`product-price-${id}`}
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={price}
              disabled={saving}
              className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] bg-white px-4 text-sm outline-none transition focus:border-[#8B0000] disabled:opacity-60"
            />
          </div>

          {/* STATUS */}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EEE6DF] p-4">
              <input
                type="checkbox"
                name="available"
                defaultChecked={available}
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
                defaultChecked={featured}
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
                defaultChecked={active}
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
                resetImageState();
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