"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";
import {
  Crosshair,
  Move,
  RotateCcw,
} from "lucide-react";

import {
  getImageFramingStyle,
  MAX_IMAGE_ZOOM,
  MIN_IMAGE_ZOOM,
  normalizeImageZoom,
} from "@/lib/image-framing";
import { cn } from "@/lib/utils";

type ImagePositionEditorProps = {
  src: string;
  alt: string;
  positionX: number;
  positionY: number;
  zoom: number;
  onPositionXChange: (value: number) => void;
  onPositionYChange: (value: number) => void;
  onZoomChange: (value: number) => void;
  disabled?: boolean;
  previewClassName?: string;
  resetPositionX?: number;
  resetPositionY?: number;
  resetZoom?: number;
};

type DragStart = {
  pointerId: number;
  clientX: number;
  clientY: number;
  positionX: number;
  positionY: number;
};

function clampPosition(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function ImagePositionEditor({
  src,
  alt,
  positionX,
  positionY,
  zoom,
  onPositionXChange,
  onPositionYChange,
  onZoomChange,
  disabled = false,
  previewClassName,
  resetPositionX = 50,
  resetPositionY = 50,
  resetZoom = MIN_IMAGE_ZOOM,
}: ImagePositionEditorProps) {
  const dragStart = useRef<DragStart | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (disabled || event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
    dragStart.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      positionX,
      positionY,
    };
    setIsDragging(true);
  }

  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>
  ) {
    const start = dragStart.current;

    if (
      disabled ||
      !start ||
      start.pointerId !== event.pointerId
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontalChange =
      ((event.clientX - start.clientX) /
        bounds.width) *
      100;
    const verticalChange =
      ((event.clientY - start.clientY) /
        bounds.height) *
      100;

    onPositionXChange(
      clampPosition(
        start.positionX - horizontalChange
      )
    );
    onPositionYChange(
      clampPosition(start.positionY - verticalChange)
    );
  }

  function finishDragging(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (
      dragStart.current?.pointerId !== event.pointerId
    ) {
      return;
    }

    dragStart.current = null;
    setIsDragging(false);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLDivElement>
  ) {
    if (disabled) {
      return;
    }

    const step = event.shiftKey ? 5 : 1;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onPositionXChange(
        clampPosition(positionX + step)
      );
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onPositionXChange(
        clampPosition(positionX - step)
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      onPositionYChange(
        clampPosition(positionY + step)
      );
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onPositionYChange(
        clampPosition(positionY - step)
      );
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="application"
        tabIndex={disabled ? -1 : 0}
        aria-label="Arraste a imagem para ajustar o enquadramento. Use as setas do teclado para ajustes precisos."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragging}
        onPointerCancel={finishDragging}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative touch-none select-none overflow-hidden border border-[#EEE6DF] bg-[#FFF7F5] outline-none transition focus-visible:ring-2 focus-visible:ring-[#8B0000] focus-visible:ring-offset-2",
          disabled
            ? "cursor-not-allowed opacity-60"
            : isDragging
              ? "cursor-grabbing"
              : "cursor-grab",
          previewClassName ?? "aspect-square rounded-2xl"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={getImageFramingStyle(
            positionX,
            positionY,
            zoom
          )}
        />

        <span className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition group-hover:bg-black/75">
          <Move size={14} />
          Arraste para enquadrar
        </span>
      </div>

      <label className="block rounded-2xl border border-[#EEE6DF] bg-[#FFFDF9] p-4">
        <span className="flex items-center justify-between text-xs font-bold text-[#49352C]">
          Zoom / distância
          <span className="font-normal text-[#756A66]">
            {zoom}%
          </span>
        </span>
        <input
          type="range"
          min={MIN_IMAGE_ZOOM}
          max={MAX_IMAGE_ZOOM}
          value={zoom}
          disabled={disabled}
          onChange={(event) =>
            onZoomChange(Number(event.target.value))
          }
          aria-label="Zoom da imagem"
          className="mt-2 w-full accent-[#8B0000]"
        />

        <span className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onPositionXChange(50);
              onPositionYChange(50);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8DDD5] bg-white px-3 py-2 text-xs font-bold text-[#49352C] transition hover:border-[#D2B48C] disabled:opacity-50"
          >
            <Crosshair size={14} />
            Centralizar
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onPositionXChange(resetPositionX);
              onPositionYChange(resetPositionY);
              onZoomChange(
                normalizeImageZoom(resetZoom)
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8DDD5] bg-white px-3 py-2 text-xs font-bold text-[#49352C] transition hover:border-[#D2B48C] disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Restaurar
          </button>
        </span>
      </label>
    </div>
  );
}
