"use client";

import type { ReactNode } from "react";
import { ImageIcon, Palette, Plus, Type } from "lucide-react";
import {
  DEFAULT_MEDIA_HEIGHT_PCT,
  DEFAULT_MEDIA_OBJECT_POS,
  DEFAULT_MEDIA_SCALE_PCT,
  MAX_BODY_FONT_SIZE,
  MAX_HEADLINE_FONT_SIZE,
  MAX_MEDIA_HEIGHT_PCT,
  MAX_MEDIA_SCALE_PCT,
  MAX_TEXT_OFFSET,
  MIN_BODY_FONT_SIZE,
  MIN_HEADLINE_FONT_SIZE,
  MIN_MEDIA_HEIGHT_PCT,
  MIN_MEDIA_SCALE_PCT,
  MIN_TEXT_OFFSET,
} from "@/lib/slide-style";
import type { MediaLayout, Slide, SlideStyle, SlideTone } from "@/types/carousel";

type SlideStylePatch = {
  [K in keyof SlideStyle]?: SlideStyle[K] | null;
};

export type SelectedSlideSegment =
  | { type: "slide"; label: string }
  | { type: "headline"; label: string }
  | { type: "body"; label: string }
  | { type: "item"; label: string; index: number }
  | { type: "media"; label: string }
  | null;

type SelectedSlideSegmentType = NonNullable<SelectedSlideSegment>["type"] | null;

const TONES: Array<{ value: SlideTone; label: string }> = [
  { value: "paper", label: "종이" },
  { value: "soft", label: "소프트" },
  { value: "dark", label: "다크" },
  { value: "wine", label: "와인" },
];

const MEDIA_LAYOUTS: Array<{ value: MediaLayout; label: string }> = [
  { value: "framed", label: "프레임" },
  { value: "fullBleed", label: "풀블리드" },
];

const FONT_OPTIONS = [
  "Pretendard",
  "Pretendard Variable",
  "Noto Sans KR",
  "Nanum Myeongjo",
  "Cormorant Garamond",
  "DM Sans",
  "DM Mono",
  "Inter",
];

const COLOR_DEFAULTS = {
  backgroundColor: "#F7F5F0",
  headlineColor: "#1A1A18",
  bodyColor: "#5C5A55",
  itemColor: "#1A1A18",
  accentColor: "#697C70",
};

interface SlideEditControlsProps {
  slide: Slide;
  items: string[];
  canAddBody: boolean;
  hasMedia: boolean;
  selectedSegment: SelectedSlideSegment;
  onPatch: (patch: Record<string, unknown>) => void;
  onReplaceImage: () => void;
  onToggleMediaFit: () => void;
}

export function SlideEditControls({
  slide,
  items,
  canAddBody,
  hasMedia,
  selectedSegment,
  onPatch,
  onReplaceImage,
  onToggleMediaFit,
}: SlideEditControlsProps) {
  const style = slide.style ?? {};
  const selectedType = selectedSegment?.type ?? null;
  const isTextSelected = selectedType === "headline" || selectedType === "body" || selectedType === "item";
  const mediaLayout = style.mediaLayout ?? "framed";
  const textControl = getTextControl(selectedType);

  const updateStyle = (patch: SlideStylePatch) => {
    onPatch({ style: patch });
  };

  return (
    <aside className="h-full w-[300px] shrink-0 border-l border-border bg-white">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">편집 영역</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {selectedSegment ? selectedSegment.label : "영역을 선택하세요"}
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!selectedSegment && (
            <p className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4 text-xs leading-5 text-muted-foreground">
              슬라이드 안의 제목, 본문, 이미지 영역을 누르면 해당 영역만 수정할 수 있습니다.
            </p>
          )}

          {selectedType === "slide" && (
            <section className="space-y-3">
              <SectionTitle icon={<Palette className="h-3.5 w-3.5" />} label="슬라이드" />
              <div className="grid grid-cols-2 gap-1.5">
                {TONES.map((tone) => (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => onPatch({ tone: tone.value })}
                    className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                      slide.tone === tone.value
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-white text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                <ColorField
                  label="배경"
                  value={style.backgroundColor ?? COLOR_DEFAULTS.backgroundColor}
                  onChange={(value) => updateStyle({ backgroundColor: value })}
                />
                <ColorField
                  label="강조"
                  value={style.accentColor ?? COLOR_DEFAULTS.accentColor}
                  onChange={(value) => updateStyle({ accentColor: value })}
                />
              </div>
              {items.length > 0 && (
                <button type="button" onClick={() => onPatch({ items: [...items, "새 항목"] })} className={drawerButtonClass}>
                  <Plus className="h-3.5 w-3.5" /> 항목 추가
                </button>
              )}
              {canAddBody && (
                <button type="button" onClick={() => onPatch({ body: "본문을 입력하세요" })} className={drawerButtonClass}>
                  <Type className="h-3.5 w-3.5" /> 본문 추가
                </button>
              )}
            </section>
          )}

          {isTextSelected && (
            <section className="space-y-3">
              <SectionTitle icon={<Type className="h-3.5 w-3.5" />} label="텍스트" />
              {selectedType === "headline" && textControl ? (
                <>
                  <FontSelect
                    label="헤드라인 폰트"
                    value={style.headingFont ?? ""}
                    onChange={(value) => updateStyle({ headingFont: value || null })}
                  />
                  <ColorField
                    label="제목 색상"
                    value={style.headlineColor ?? COLOR_DEFAULTS.headlineColor}
                    onChange={(value) => updateStyle({ headlineColor: value })}
                  />
                  <SliderField
                    label="헤드라인 크기"
                    value={style.headlineFontSize ?? 60}
                    min={MIN_HEADLINE_FONT_SIZE}
                    max={MAX_HEADLINE_FONT_SIZE}
                    step={1}
                    unit="px"
                    onChange={(value) => updateStyle({ headlineFontSize: value })}
                  />
                </>
              ) : textControl ? (
                <>
                  <FontSelect
                    label={selectedType === "item" ? "항목 폰트" : "본문 폰트"}
                    value={style.bodyFont ?? ""}
                    onChange={(value) => updateStyle({ bodyFont: value || null })}
                  />
                  <ColorField
                    label={selectedType === "item" ? "항목 색상" : "본문 색상"}
                    value={
                      selectedType === "item"
                        ? style.itemColor ?? COLOR_DEFAULTS.itemColor
                        : style.bodyColor ?? COLOR_DEFAULTS.bodyColor
                    }
                    onChange={(value) =>
                      updateStyle(selectedType === "item" ? { itemColor: value } : { bodyColor: value })
                    }
                  />
                  <SliderField
                    label={selectedType === "item" ? "항목 크기" : "본문 크기"}
                    value={Number(style[textControl.sizeKey] ?? (selectedType === "item" ? 35 : 33))}
                    min={MIN_BODY_FONT_SIZE}
                    max={MAX_BODY_FONT_SIZE}
                    step={1}
                    unit="px"
                    onChange={(value) => updateStyle({ [textControl.sizeKey]: value })}
                  />
                </>
              ) : null}
              {textControl && (
                <>
                  <SliderField
                    label="텍스트 가로 위치"
                    value={Number(style[textControl.xKey] ?? 0)}
                    min={MIN_TEXT_OFFSET}
                    max={MAX_TEXT_OFFSET}
                    step={4}
                    unit="px"
                    onChange={(value) => updateStyle({ [textControl.xKey]: value })}
                  />
                  <SliderField
                    label="텍스트 세로 위치"
                    value={Number(style[textControl.yKey] ?? 0)}
                    min={MIN_TEXT_OFFSET}
                    max={MAX_TEXT_OFFSET}
                    step={4}
                    unit="px"
                    onChange={(value) => updateStyle({ [textControl.yKey]: value })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateStyle({
                        [textControl.sizeKey]: null,
                        [textControl.xKey]: null,
                        [textControl.yKey]: null,
                      })
                    }
                    className={drawerButtonClass}
                  >
                    텍스트 위치 초기화
                  </button>
                </>
              )}
            </section>
          )}

          {selectedType === "media" && hasMedia && (
            <section className="space-y-3">
              <SectionTitle icon={<ImageIcon className="h-3.5 w-3.5" />} label="이미지" />
              <div className="grid grid-cols-2 gap-1.5">
                {MEDIA_LAYOUTS.map((layout) => (
                  <button
                    key={layout.value}
                    type="button"
                    onClick={() => updateStyle({ mediaLayout: layout.value })}
                    className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                      mediaLayout === layout.value
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-white text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {layout.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={onReplaceImage} className={drawerButtonClass}>
                <ImageIcon className="h-3.5 w-3.5" /> 이미지 교체
              </button>
              <button type="button" onClick={onToggleMediaFit} className={drawerButtonClass}>
                {slide.media?.fit === "contain" ? "맞추기" : "채우기"}
              </button>
              {mediaLayout === "framed" && (
                <label className="grid gap-2 text-xs text-muted-foreground">
                  <span>이미지 영역 높이</span>
                  <input
                    aria-label="이미지 영역 높이"
                    type="range"
                    min={MIN_MEDIA_HEIGHT_PCT}
                    max={MAX_MEDIA_HEIGHT_PCT}
                    step={2}
                    value={style.mediaHeightPct ?? DEFAULT_MEDIA_HEIGHT_PCT}
                    onInput={(event) => updateStyle({ mediaHeightPct: Number(event.currentTarget.value) })}
                    className="w-full accent-[var(--color-accent)]"
                  />
                </label>
              )}
              <SliderField
                label="이미지 크기"
                value={style.mediaScalePct ?? DEFAULT_MEDIA_SCALE_PCT}
                min={MIN_MEDIA_SCALE_PCT}
                max={MAX_MEDIA_SCALE_PCT}
                step={5}
                unit="%"
                onChange={(value) => updateStyle({ mediaScalePct: value })}
              />
              <SliderField
                label="가로 위치"
                value={style.mediaObjectX ?? DEFAULT_MEDIA_OBJECT_POS}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(value) => updateStyle({ mediaObjectX: value })}
              />
              <SliderField
                label="세로 위치"
                value={style.mediaObjectY ?? DEFAULT_MEDIA_OBJECT_POS}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(value) => updateStyle({ mediaObjectY: value })}
              />
              <button
                type="button"
                onClick={() => updateStyle({ mediaScalePct: null, mediaObjectX: null, mediaObjectY: null })}
                className={drawerButtonClass}
              >
                이미지 위치 초기화
              </button>
            </section>
          )}
        </div>
      </div>
    </aside>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-xs text-muted-foreground">
      <span className="flex items-center justify-between gap-2">
        {label}
        <span className="font-medium text-foreground">{value}{unit}</span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </label>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">브랜드 기본값</option>
        {FONT_OPTIONS.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
      {icon}
      {label}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <input
        aria-label={label}
        type="color"
        value={value}
        onInput={(event) => onChange(event.currentTarget.value)}
        className="h-7 w-7 cursor-pointer rounded-full border border-border bg-transparent p-0"
      />
    </label>
  );
}

const drawerButtonClass =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:border-accent";

function getTextControl(type: SelectedSlideSegmentType) {
  if (type === "headline") {
    return { sizeKey: "headlineFontSize", xKey: "headlineOffsetX", yKey: "headlineOffsetY" } as const;
  }
  if (type === "body") {
    return { sizeKey: "bodyFontSize", xKey: "bodyOffsetX", yKey: "bodyOffsetY" } as const;
  }
  if (type === "item") {
    return { sizeKey: "itemFontSize", xKey: "itemOffsetX", yKey: "itemOffsetY" } as const;
  }
  return null;
}
