"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp, Maximize, Plus, Type } from "lucide-react";
import { extractFontFamilies } from "@/lib/slide-html";
import { DIMENSIONS } from "@/types/carousel";
import type { Slide, AspectRatio } from "@/types/carousel";

interface EditableSlideViewProps {
  carouselId: string;
  slide: Slide;
  aspectRatio: AspectRatio;
  onSaved: (updated: Slide) => void;
  style?: React.CSSProperties;
}

// Ensure the Google Fonts (+ Pretendard) used by a slide are present in the
// document head, so the in-DOM editable view matches the iframe/export render.
function ensureFonts(html: string) {
  if (typeof document === "undefined") return;
  const families = extractFontFamilies(html);
  const links: string[] = [];
  if (/pretendard/i.test(html)) {
    links.push(
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
    );
  }
  const google = families.filter((f) => !/pretendard/i.test(f));
  if (google.length > 0) {
    const params = google
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`)
      .join("&");
    links.push(`https://fonts.googleapis.com/css2?${params}&display=swap`);
  }
  for (const href of links) {
    if (document.querySelector(`link[data-oc-font="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.ocFont = href;
    document.head.appendChild(link);
  }
}

export function EditableSlideView({
  carouselId,
  slide,
  aspectRatio,
  onSaved,
  style,
}: EditableSlideViewProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [mediaCenter, setMediaCenter] = useState<{ left: number; top: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const { width: slideW, height: slideH } = DIMENSIONS[aspectRatio];

  const items = slide.items ?? [];
  const isList = items.length > 0;
  const hasMedia = !!slide.media;
  // Lists don't render a body; offer "add body" only where it would show.
  const canAddBody = !isList && !slide.body;

  // PUT a structured patch; the API re-renders the slide HTML and returns it.
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

  // Inject slide HTML imperatively (keyed by html), wire inline editing, and
  // inject a per-item delete button into each list row.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    ensureFonts(slide.html);
    stage.innerHTML = slide.html;
    const cleanups: Array<() => void> = [];

    // contentEditable text fields
    stage
      .querySelectorAll<HTMLElement>('[data-edit="headline"],[data-edit="body"],[data-edit="item"]')
      .forEach((el) => {
        el.setAttribute("contenteditable", "true");
        el.style.outline = "none";
        el.style.cursor = "text";
        const original = el.textContent ?? "";
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
        el.addEventListener("blur", onBlur);
        cleanups.push(() => el.removeEventListener("blur", onBlur));
      });

    // per-item delete (×) injected into each row
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

    // locate media region center for the overlay controls
    const mediaEl = stage.querySelector<HTMLElement>('[data-edit="media"]');
    setMediaCenter(
      mediaEl
        ? { left: mediaEl.offsetLeft + mediaEl.offsetWidth / 2, top: mediaEl.offsetTop + mediaEl.offsetHeight / 2 }
        : null
    );

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.html, saveField]);

  // Scale-to-fit measurement (mirrors SlideRenderer).
  useEffect(() => {
    const el = outerRef.current;
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

  const scale = dims ? Math.min(dims.w / slideW, dims.h / slideH) : 0;
  const scaledW = Math.floor(slideW * scale);
  const scaledH = Math.floor(slideH * scale);

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

  const barBtn =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border text-xs font-medium text-foreground hover:border-accent shadow-sm";

  return (
    <div
      ref={outerRef}
      style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", ...style }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />
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
          {/* Image region controls */}
          {mediaCenter && (
            <div
              style={{
                position: "absolute",
                left: mediaCenter.left * scale,
                top: mediaCenter.top * scale,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <button type="button" onClick={() => fileRef.current?.click()} className={barBtn}>
                <ImageUp className="h-3.5 w-3.5" /> 이미지 교체
              </button>
              <button type="button" onClick={toggleFit} className={barBtn}>
                <Maximize className="h-3.5 w-3.5" />
                {slide.media?.fit === "contain" ? "맞추기" : "채우기"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom action bar: structural edits */}
      {(isList || canAddBody) && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {isList && (
            <button type="button" onClick={() => saveField({ items: [...items, "새 항목"] })} className={barBtn}>
              <Plus className="h-3.5 w-3.5" /> 항목 추가
            </button>
          )}
          {canAddBody && (
            <button type="button" onClick={() => saveField({ body: "본문을 입력하세요" })} className={barBtn}>
              <Type className="h-3.5 w-3.5" /> 본문 추가
            </button>
          )}
        </div>
      )}

      {saving && (
        <div className="absolute top-2 right-2 text-[11px] text-muted-foreground bg-white/80 rounded px-2 py-0.5">
          저장 중…
        </div>
      )}
    </div>
  );
}
