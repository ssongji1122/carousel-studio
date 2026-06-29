"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureSlideFonts } from "./slide-font-loader";
import { SlideEditControls } from "./SlideEditControls";
import { DIMENSIONS } from "@/types/carousel";
import type { Slide, AspectRatio } from "@/types/carousel";
import type { SelectedSlideSegment } from "./SlideEditControls";

interface EditableSlideViewProps {
  carouselId: string;
  slide: Slide;
  aspectRatio: AspectRatio;
  onSaved: (updated: Slide) => void;
  style?: React.CSSProperties;
}

export function EditableSlideView({
  carouselId,
  slide,
  aspectRatio,
  onSaved,
  style,
}: EditableSlideViewProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    rect: DOMRect;
    moved: boolean;
  } | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SelectedSlideSegment>(null);
  const [saving, setSaving] = useState(false);
  const { width: slideW, height: slideH } = DIMENSIONS[aspectRatio];

  const items = useMemo(() => slide.items ?? [], [slide.items]);
  const isList = items.length > 0;
  const hasMedia = !!slide.media;
  const canAddBody = !isList && !slide.body;
  const scale = dims ? Math.min(dims.w / slideW, dims.h / slideH) : 0;
  const scaledW = Math.floor(slideW * scale);
  const scaledH = Math.floor(slideH * scale);

  const saveField = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/carousels/${carouselId}/slides/${slide.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (res.ok) onSaved(await res.json());
      } finally {
        setSaving(false);
      }
    },
    [carouselId, slide.id, onSaved]
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || scale <= 0) return;
    ensureSlideFonts(slide.html);
    stage.innerHTML = slide.html;
    const cleanups: Array<() => void> = [];

    stage
      .querySelectorAll<HTMLElement>('[data-edit="headline"],[data-edit="body"],[data-edit="item"]')
      .forEach((el) => {
        el.setAttribute("contenteditable", "true");
        el.setAttribute("spellcheck", "false");
        el.setAttribute("autocorrect", "off");
        el.spellcheck = false;
        el.style.outline = "none";
        el.style.cursor = "text";
        const original = el.textContent ?? "";
        const onSelect = (ev: Event) => {
          ev.stopPropagation();
          const kind = el.dataset.edit;
          if (kind === "headline") setSelectedSegment({ type: "headline", label: "헤드라인" });
          else if (kind === "body") setSelectedSegment({ type: "body", label: "본문" });
          else if (kind === "item") {
            const idx = Number(el.dataset.editIndex ?? "-1");
            setSelectedSegment({ type: "item", label: `항목 ${idx + 1}`, index: idx });
          }
        };
        const onBlur = () => {
          const next = (el.textContent ?? "").trim();
          if (next === original.trim()) return;
          const kind = el.dataset.edit;
          if (kind === "headline") saveField({ headline: next });
          else if (kind === "body") saveField({ body: next });
          else if (kind === "item") {
            const idx = Number(el.dataset.editIndex ?? "-1");
            const next_items = [...items];
            if (idx >= 0 && idx < next_items.length) {
              next_items[idx] = next;
              saveField({ items: next_items });
            }
          }
        };
        el.addEventListener("click", onSelect);
        el.addEventListener("focus", onSelect);
        el.addEventListener("blur", onBlur);
        cleanups.push(() => el.removeEventListener("click", onSelect));
        cleanups.push(() => el.removeEventListener("focus", onSelect));
        cleanups.push(() => el.removeEventListener("blur", onBlur));
      });

    stage.querySelectorAll<HTMLElement>('[data-edit="item"]').forEach((el) => {
      const row = el.parentElement;
      if (!row) return;
      row.style.position = "relative";
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "×";
      del.setAttribute("contenteditable", "false");
      del.style.cssText =
        "position:absolute;right:-6px;top:50%;transform:translateY(-50%);width:44px;height:44px;border:none;border-radius:999px;background:rgba(26,26,24,0.7);color:#fff;font-size:30px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;";
      const idx = Number(el.dataset.editIndex ?? "-1");
      const onClick = (ev: MouseEvent) => {
        ev.preventDefault();
        const next_items = items.filter((_, i) => i !== idx);
        saveField({ items: next_items });
      };
      del.addEventListener("click", onClick);
      cleanups.push(() => del.removeEventListener("click", onClick));
      row.appendChild(del);
    });

    const mediaEl =
      stage.querySelector<HTMLElement>('[data-edit="media"]') ||
      stage.querySelector<HTMLImageElement>("img")?.parentElement ||
      null;
    if (mediaEl) {
      mediaEl.dataset.editSegment = "media";
      mediaEl.style.cursor = "pointer";
      const onMediaSelect = (ev: MouseEvent) => {
        ev.stopPropagation();
        setSelectedSegment({ type: "media", label: "이미지" });
      };
      const onPointerMove = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        drag.moved = true;
        drag.currentX = clamp(drag.startX + ((ev.clientX - drag.startClientX) / drag.rect.width) * 100, 0, 100);
        drag.currentY = clamp(drag.startY + ((ev.clientY - drag.startClientY) / drag.rect.height) * 100, 0, 100);
        const img = mediaEl.querySelector<HTMLImageElement>("img");
        if (img) {
          const position = `${Math.round(drag.currentX)}% ${Math.round(drag.currentY)}%`;
          img.style.objectPosition = position;
          img.style.transformOrigin = position;
        }
      };
      const onPointerUp = () => {
        const drag = dragRef.current;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        dragRef.current = null;
        if (!drag?.moved) return;
        saveField({
          style: {
            mediaObjectX: Math.round(drag.currentX),
            mediaObjectY: Math.round(drag.currentY),
          },
        });
      };
      const onPointerDown = (ev: PointerEvent) => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        ev.stopPropagation();
        setSelectedSegment({ type: "media", label: "이미지" });
        const currentStyle = slide.style ?? {};
        dragRef.current = {
          startClientX: ev.clientX,
          startClientY: ev.clientY,
          startX: currentStyle.mediaObjectX ?? 50,
          startY: currentStyle.mediaObjectY ?? 50,
          currentX: currentStyle.mediaObjectX ?? 50,
          currentY: currentStyle.mediaObjectY ?? 50,
          rect: mediaEl.getBoundingClientRect(),
          moved: false,
        };
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      };
      mediaEl.addEventListener("click", onMediaSelect);
      mediaEl.addEventListener("pointerdown", onPointerDown);
      cleanups.push(() => mediaEl.removeEventListener("click", onMediaSelect));
      cleanups.push(() => mediaEl.removeEventListener("pointerdown", onPointerDown));
      cleanups.push(() => window.removeEventListener("pointermove", onPointerMove));
      cleanups.push(() => window.removeEventListener("pointerup", onPointerUp));
    }

    const onStageSelect = () => setSelectedSegment({ type: "slide", label: "슬라이드" });
    stage.addEventListener("click", onStageSelect);
    cleanups.push(() => stage.removeEventListener("click", onStageSelect));

    return () => cleanups.forEach((fn) => fn());
  }, [items, saveField, scale, slide.html, slide.style]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.querySelectorAll<HTMLElement>('[data-edit],[data-edit-segment="media"]').forEach((el) => {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.boxShadow = "";
    });
    if (!selectedSegment) return;
    const selector = selectedSegment.type === "media"
      ? '[data-edit-segment="media"],[data-edit="media"]'
      : selectedSegment.type === "item"
        ? `[data-edit="item"][data-edit-index="${selectedSegment.index}"]`
        : `[data-edit="${selectedSegment.type}"]`;
    stage.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.style.outline = "3px solid rgba(105,124,112,0.85)";
      el.style.outlineOffset = "8px";
      el.style.boxShadow = "0 0 0 9999px rgba(255,255,255,0.02)";
    });
  }, [selectedSegment, slide.html]);

  useEffect(() => {
    setSelectedSegment(null);
  }, [slide.id]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setDims({ w: rect.width, h: rect.height });
    };
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    measure();
    return () => obs.disconnect();
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) return;
    const { url } = await res.json();
    await saveField({
      media: { type: "image", src: url, fit: slide.media?.fit ?? "cover", source: "uploaded" },
    });
  };

  const toggleFit = () =>
    slide.media &&
    saveField({
      media: { ...slide.media, fit: slide.media.fit === "cover" ? "contain" : "cover" },
    });

  return (
    <div
      ref={outerRef}
      style={{
        position: "relative",
        display: "flex",
        boxSizing: "border-box",
        minWidth: 0,
        ...style,
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      <div
        ref={canvasRef}
        style={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {scale > 0 && (
          <div
            style={{
              width: scaledW,
              height: scaledH,
              overflow: "hidden",
              borderRadius: 8,
              position: "relative",
              boxShadow: "0 0 0 2px var(--color-accent, #9E6B45), 0 4px 24px rgba(0,0,0,0.12)",
            }}
          >
            <div
              ref={stageRef}
              style={{
                width: slideW,
                height: slideH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            />
          </div>
        )}
      </div>

      <SlideEditControls
        slide={slide}
        items={items}
        canAddBody={canAddBody}
        hasMedia={hasMedia}
        selectedSegment={selectedSegment}
        onPatch={saveField}
        onReplaceImage={() => fileRef.current?.click()}
        onToggleMediaFit={toggleFit}
      />

      {saving && (
        <div className="absolute left-2 top-2 rounded bg-white/80 px-2 py-0.5 text-[11px] text-muted-foreground">
          저장 중…
        </div>
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
