"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp } from "lucide-react";
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
  const google = families.filter((f) => !/pretendard/i.test(f));
  if (/pretendard/i.test(html)) {
    const href =
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css";
    if (!document.querySelector(`link[data-oc-font="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.ocFont = href;
      document.head.appendChild(link);
    }
  }
  if (google.length > 0) {
    const params = google
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`)
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
    if (!document.querySelector(`link[data-oc-font="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.ocFont = href;
      document.head.appendChild(link);
    }
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
  const [mediaBtn, setMediaBtn] = useState<{ left: number; top: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const { width: slideW, height: slideH } = DIMENSIONS[aspectRatio];

  // PUT a structured patch; the API re-renders the slide HTML and returns it.
  const saveField = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch(
          `/api/carousels/${carouselId}/slides/${slide.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          }
        );
        if (res.ok) {
          const updated = await res.json();
          onSaved(updated);
        }
      } finally {
        setSaving(false);
      }
    },
    [carouselId, slide.id, onSaved]
  );

  // Inject the slide HTML imperatively, keyed by slide id, so live prop updates
  // (from re-render after save) don't wipe the in-place cursor/selection.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    ensureFonts(slide.html);
    stage.innerHTML = slide.html;

    const editables = stage.querySelectorAll<HTMLElement>(
      '[data-edit="headline"],[data-edit="body"],[data-edit="item"]'
    );
    const cleanups: Array<() => void> = [];
    editables.forEach((el) => {
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
          const items = [...(slide.items ?? [])];
          if (idx >= 0 && idx < items.length) {
            items[idx] = next;
            saveField({ items });
          }
        }
      };
      el.addEventListener("blur", onBlur);
      cleanups.push(() => el.removeEventListener("blur", onBlur));
    });

    // Locate the media region (if any) to place a replace button over it.
    const mediaEl = stage.querySelector<HTMLElement>('[data-edit="media"]');
    if (mediaEl) {
      setMediaBtn({
        left: mediaEl.offsetLeft + mediaEl.offsetWidth / 2,
        top: mediaEl.offsetTop + mediaEl.offsetHeight / 2,
      });
    } else {
      setMediaBtn(null);
    }

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.id, slide.html, saveField]);

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
      media: {
        type: "image",
        src: url,
        fit: slide.media?.fit ?? "cover",
        source: "uploaded",
      },
    });
  };

  return (
    <div
      ref={outerRef}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          {/* Image replace button centered over the media region */}
          {mediaBtn && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                position: "absolute",
                left: mediaBtn.left * scale,
                top: mediaBtn.top * scale,
                transform: "translate(-50%, -50%)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "rgba(26,26,24,0.78)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <ImageUp className="h-3.5 w-3.5" />
              이미지 교체
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
