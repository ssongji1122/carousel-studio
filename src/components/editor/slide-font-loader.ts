import { extractFontFamilies } from "@/lib/slide-html";

export function ensureSlideFonts(html: string) {
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
