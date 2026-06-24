"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronLeft, Check, Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "./ColorPicker";
import { FontSelector } from "./FontSelector";
import { LogoUpload } from "./LogoUpload";
import type { BrandConfig } from "@/types/brand";
import { DEFAULT_BRAND } from "@/types/brand";

interface BrandSetupProps {
  open: boolean;
  onComplete: () => void;
  initialBrand?: BrandConfig;
}

const STYLE_OPTIONS = [
  "minimal",
  "bold",
  "playful",
  "corporate",
  "luxury",
  "vintage",
  "modern",
  "elegant",
  "creative",
  "professional",
];

const STEPS = ["Brand Name", "Colors", "Fonts", "Logo", "Style"];

export function BrandSetup({ open, onComplete, initialBrand }: BrandSetupProps) {
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState<BrandConfig>(
    initialBrand || DEFAULT_BRAND
  );
  const [saving, setSaving] = useState(false);
  const [docsText, setDocsText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [igHandle, setIgHandle] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [importingIg, setImportingIg] = useState(false);
  const [extractedPalette, setExtractedPalette] = useState<string[]>([]);
  const [paletteTarget, setPaletteTarget] =
    useState<"accent" | "background" | "primary" | "surface">("accent");
  const [customHex, setCustomHex] = useState("");
  const normalizedHex = customHex.trim().replace(/^#?/, "#");
  const customHexValid = /^#[0-9a-fA-F]{6}$/.test(normalizedHex);

  useEffect(() => {
    if (initialBrand) setBrand(initialBrand);
  }, [initialBrand]);

  const handleImport = useCallback(async () => {
    if (!docsText.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/brand/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docs: docsText }),
      });
      if (!res.ok) {
        setImportError("문서에서 브랜드를 읽지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      const imported = (await res.json()) as BrandConfig;
      setBrand(imported);
    } catch {
      setImportError("네트워크 오류로 가져오지 못했습니다.");
    } finally {
      setImporting(false);
    }
  }, [docsText]);

  const handleImportSource = useCallback(async () => {
    if (!igHandle.trim() && !webUrl.trim()) return;
    setImportingIg(true);
    setImportError(null);
    try {
      const res = await fetch("/api/brand/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagram: igHandle.trim() || undefined,
          website: webUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setImportError(
          data?.error ?? "인스타/웹사이트에서 브랜드를 가져오지 못했습니다. 주소를 확인해 주세요."
        );
        return;
      }
      const imported = (await res.json()) as BrandConfig & { extractedPalette?: string[] };
      setBrand(imported);
      if (imported.extractedPalette?.length) setExtractedPalette(imported.extractedPalette);
    } catch {
      setImportError("네트워크 오류로 가져오지 못했습니다.");
    } finally {
      setImportingIg(false);
    }
  }, [igHandle, webUrl]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brand),
      });
      onComplete();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [brand, onComplete]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onComplete();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onComplete]);

  if (!open) return null;

  return (
    <div
      className="oc-fade fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onComplete(); }}
    >
      <div className="oc-enter-pop bg-surface rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden relative">
        {/* Close button */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Set Up Your Brand</h2>
              <p className="text-xs text-muted-foreground">
                Step {step + 1} of {STEPS.length}: {STEPS[step]}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1 mt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-accent" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 min-h-[240px]">
          {step === 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                <label className="text-sm font-medium">
                  인스타·웹사이트에서 자동 설정
                </label>
                <p className="text-xs text-muted-foreground">
                  공개 인스타 핸들과/또는 웹사이트 주소를 넣으면 바이오·피드 색·실제 폰트·OG 이미지·카피를 읽어 색·폰트·보이스를 채웁니다. 웹사이트를 비워두면 인스타 바이오 링크(litt.ly 등)에서 공식 사이트를 자동으로 찾아 함께 분석합니다.
                </p>
                <Input
                  value={igHandle}
                  onChange={(e) => setIgHandle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleImportSource(); }}
                  placeholder="@roseshaker (인스타 핸들)"
                />
                <div className="flex gap-2">
                  <Input
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleImportSource(); }}
                    placeholder="frice.kr (웹사이트, 선택)"
                  />
                  <Button
                    onClick={handleImportSource}
                    variant="accent"
                    disabled={importingIg || (!igHandle.trim() && !webUrl.trim())}
                    className="whitespace-nowrap"
                  >
                    {importingIg ? "분석 중..." : "가져오기"}
                  </Button>
                </div>
                {importError && importingIg === false && (igHandle.trim() !== "" || webUrl.trim() !== "") && (
                  <p className="text-xs text-destructive">{importError}</p>
                )}
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                <label className="text-sm font-medium">
                  브랜드 문서로 자동 설정
                </label>
                <p className="text-xs text-muted-foreground">
                  brand.md · design.md · tokens.css 내용을 붙여넣으면 색·폰트·보이스를 자동으로 채웁니다.
                </p>
                <textarea
                  value={docsText}
                  onChange={(e) => setDocsText(e.target.value)}
                  placeholder="여기에 브랜드 문서를 붙여넣으세요 (brand.md, design.md, tokens.css ...)"
                  rows={5}
                  className="w-full resize-none bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {importError && (
                  <p className="text-xs text-destructive">{importError}</p>
                )}
                <Button
                  onClick={handleImport}
                  variant="accent"
                  disabled={importing || !docsText.trim()}
                >
                  {importing ? "읽는 중..." : "문서에서 가져오기"}
                </Button>
              </div>
              <div>
                <label className="text-sm font-medium">
                  What&apos;s your brand name?
                </label>
                <Input
                  value={brand.name}
                  onChange={(e) =>
                    setBrand({ ...brand, name: e.target.value })
                  }
                  placeholder="My Brand"
                  className="mt-2 text-lg h-12"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This helps the AI maintain your brand identity across all
                carousels.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {extractedPalette.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium">추출된 색에서 고르기</label>
                    <div className="flex gap-1">
                      {(["accent", "background", "primary", "surface"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setPaletteTarget(t)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                            paletteTarget === t
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    칩을 누르면 선택한 역할(<span className="font-mono">{paletteTarget}</span>)에 그 색이 적용됩니다.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedPalette.map((hex) => (
                      <button
                        key={hex}
                        title={`${hex} → ${paletteTarget}`}
                        onClick={() =>
                          setBrand({
                            ...brand,
                            colors: { ...brand.colors, [paletteTarget]: hex },
                          })
                        }
                        className="h-7 w-7 rounded-md border border-border shadow-sm cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">직접 입력</span>
                    <div
                      className="h-6 w-6 rounded-md border border-border shrink-0"
                      style={{ backgroundColor: customHexValid ? normalizedHex : "transparent" }}
                    />
                    <Input
                      value={customHex}
                      onChange={(e) => setCustomHex(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customHexValid)
                          setBrand({ ...brand, colors: { ...brand.colors, [paletteTarget]: normalizedHex } });
                      }}
                      placeholder="#FFB8D5"
                      className="h-7 text-xs font-mono"
                    />
                    <Button
                      onClick={() =>
                        setBrand({ ...brand, colors: { ...brand.colors, [paletteTarget]: normalizedHex } })
                      }
                      disabled={!customHexValid}
                      variant="accent"
                      className="h-7 whitespace-nowrap"
                    >
                      {paletteTarget}에 적용
                    </Button>
                  </div>
                </div>
              )}
              <ColorPicker
                label="Primary"
                value={brand.colors.primary}
                onChange={(v) =>
                  setBrand({
                    ...brand,
                    colors: { ...brand.colors, primary: v },
                  })
                }
              />
              <ColorPicker
                label="Secondary"
                value={brand.colors.secondary}
                onChange={(v) =>
                  setBrand({
                    ...brand,
                    colors: { ...brand.colors, secondary: v },
                  })
                }
              />
              <ColorPicker
                label="Accent"
                value={brand.colors.accent}
                onChange={(v) =>
                  setBrand({
                    ...brand,
                    colors: { ...brand.colors, accent: v },
                  })
                }
              />
              <ColorPicker
                label="Background"
                value={brand.colors.background}
                onChange={(v) =>
                  setBrand({
                    ...brand,
                    colors: { ...brand.colors, background: v },
                  })
                }
              />
              <ColorPicker
                label="Surface"
                value={brand.colors.surface}
                onChange={(v) =>
                  setBrand({
                    ...brand,
                    colors: { ...brand.colors, surface: v },
                  })
                }
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <FontSelector
                label="Heading Font"
                value={brand.fonts.heading}
                onChange={(v) =>
                  setBrand({
                    ...brand,
                    fonts: { ...brand.fonts, heading: v },
                  })
                }
              />
              <FontSelector
                label="Body Font"
                value={brand.fonts.body}
                onChange={(v) =>
                  setBrand({
                    ...brand,
                    fonts: { ...brand.fonts, body: v },
                  })
                }
              />
            </div>
          )}

          {step === 3 && (
            <LogoUpload
              value={brand.logoPath}
              onChange={(path) => setBrand({ ...brand, logoPath: path })}
            />
          )}

          {step === 4 && (
            <div>
              <label className="text-sm font-medium">
                Choose your brand style
              </label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Select keywords that describe your visual identity
              </p>
              <div className="flex flex-wrap gap-2">
                {STYLE_OPTIONS.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => {
                      const keywords = brand.styleKeywords.includes(keyword)
                        ? brand.styleKeywords.filter((k) => k !== keyword)
                        : [...brand.styleKeywords, keyword];
                      setBrand({ ...brand, styleKeywords: keywords });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      brand.styleKeywords.includes(keyword)
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-transparent text-foreground border-border hover:border-muted-foreground"
                    }`}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !brand.name.trim()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="accent"
              onClick={handleSave}
              disabled={saving || !brand.name.trim()}
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
