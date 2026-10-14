"use client";

import { useState } from "react";
import { Download, Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CarouselQualityReport } from "@/types/carousel";

interface ExportButtonProps {
  carouselId: string;
  carouselName: string;
  slideCount: number;
  quality?: CarouselQualityReport;
}

export function ExportButton({ carouselId, carouselName, slideCount, quality }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const blockingIssue = quality?.issues.find((issue) => issue.severity === "error");
  const downloadName = buildDownloadName(carouselName, carouselId);

  const handleExport = async () => {
    if (exporting || slideCount === 0 || blockingIssue) return;
    setExporting(true);
    setDone(false);
    setError("");
    setProgress({ current: 0, total: slideCount });

    try {
      const response = await fetch(`/api/carousels/${carouselId}/export`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Export failed");
      }

      // Check if it's SSE (progress) or direct blob (ZIP)
      const contentType = response.headers.get("Content-Type");
      if (contentType?.includes("text/event-stream")) {
        // SSE progress mode
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.current && data.total) {
                  setProgress({ current: data.current, total: data.total });
                }
                if (data.downloadUrl) {
                  // Trigger download
                  const a = document.createElement("a");
                  a.href = data.downloadUrl;
                  a.download = downloadName;
                  a.click();
                  setDone(true);
                }
              } catch {
                // skip
              }
            }
          }
        }
      } else {
        // Direct ZIP download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        a.click();
        URL.revokeObjectURL(url);
        setDone(true);
      }
    } catch (error) {
      console.error("Export error:", error);
      setError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
      setTimeout(() => setDone(false), 3000);
    }
  };

  const disabled = exporting || slideCount === 0 || Boolean(blockingIssue);
  const title = blockingIssue?.message ?? (error || "Export PNG");

  return (
    <Button
      onClick={handleExport}
      disabled={disabled}
      variant="accent"
      size="sm"
      title={title}
    >
      <span
        key={exporting ? "exporting" : done ? "done" : "idle"}
        className="oc-enter-pop inline-flex items-center gap-2"
      >
        {blockingIssue ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span>검수 필요</span>
          </>
        ) : exporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {progress.current}/{progress.total}
            </span>
          </>
        ) : done ? (
          <>
            <Check className="h-4 w-4" />
            <span>Downloaded!</span>
          </>
        ) : error ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span>Export failed</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Export PNG</span>
          </>
        )}
      </span>
    </Button>
  );
}

function buildDownloadName(name: string, id: string): string {
  const safeName = name.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return `carousel-${safeName || id}.zip`;
}
