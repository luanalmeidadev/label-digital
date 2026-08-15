"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Pencil } from "lucide-react";

import type { UpdatePreorderProductResult } from "@/app/admin/(dashboard)/encomendas/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ImagePositionEditor from "@/components/admin/ImagePositionEditor";
import { getImageFramingStyle } from "@/lib/image-framing";
import type { PreorderHeroImageSettings } from "@/lib/image-display-settings-store";

export default function EditPreorderHeroDialog({
  settings,
  updateAction,
}: {
  settings: PreorderHeroImageSettings;
  updateAction: (
    formData: FormData
  ) => Promise<UpdatePreorderProductResult>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(
    settings.image
  );
  const [temporaryPreview, setTemporaryPreview] =
    useState<string | null>(null);
  const [positionX, setPositionX] = useState(
    settings.positionX
  );
  const [positionY, setPositionY] = useState(
    settings.positionY
  );
  const [zoom, setZoom] = useState(settings.zoom);
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
    if (temporaryPreview) {
      URL.revokeObjectURL(temporaryPreview);
    }

    setTemporaryPreview(null);
    setPreview(settings.image);
    setPositionX(settings.positionX);
    setPositionY(settings.positionY);
    setZoom(settings.zoom);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const result = await updateAction(
        new FormData(event.currentTarget)
      );

      if (!result.success) {
        setError(
          result.error ??
            "Não foi possível salvar a imagem."
        );
        return;
      }

      setTemporaryPreview(null);
      setOpen(false);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível salvar a imagem."
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

        if (!nextOpen && !saving) {
          resetFields();
        }
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Editar imagem principal das encomendas"
            className="group relative aspect-[5/3] w-full overflow-hidden rounded-2xl border border-[#EEE6DF] bg-[#FFF7F5]"
          />
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings.image}
          alt="Imagem principal das encomendas"
          className="h-full w-full object-cover transition group-hover:brightness-75"
          style={getImageFramingStyle(
            settings.positionX,
            settings.positionY,
            settings.zoom
          )}
        />
        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 text-sm font-bold text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          <Pencil size={18} />
          Editar foto e enquadramento
        </span>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Imagem principal das encomendas
          </DialogTitle>
          <DialogDescription>
            Troque a foto e ajuste posição e distância diretamente na prévia.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-5"
        >
          <ImagePositionEditor
            src={preview}
            alt="Prévia da imagem principal"
            positionX={positionX}
            positionY={positionY}
            zoom={zoom}
            onPositionXChange={setPositionX}
            onPositionYChange={setPositionY}
            onZoomChange={setZoom}
            disabled={saving}
            previewClassName="aspect-[5/4] rounded-3xl"
            resetPositionX={settings.positionX}
            resetPositionY={settings.positionY}
            resetZoom={settings.zoom}
          />

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
            JPG, PNG ou WebP, com até 5 MB. Sem escolher um arquivo, somente o enquadramento será alterado.
          </p>

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
          <input
            type="hidden"
            name="image_zoom"
            value={zoom}
          />

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
              {saving ? "Salvando..." : "Salvar imagem"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
