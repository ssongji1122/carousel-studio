"use client";

const STARTER_PROMPTS = [
  "1인 디자인 스튜디오, 좋은 브리프 쓰는 법으로 6장",
  "소상공인 대상, 브랜드 컬러 고르는 법",
  "웹사이트 링크를 기준으로 톤을 분석해서 캐러셀 만들기",
];

interface ChatEmptyStateProps {
  disabled: boolean;
  onPick: (prompt: string) => void;
}

export function ChatEmptyState({ disabled, onPick }: ChatEmptyStateProps) {
  return (
    <div className="p-4">
      <div className="rounded-xl border border-border bg-muted/35 p-4">
        <p className="text-sm font-semibold text-foreground">무엇을 만들까요?</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          업종, 대상, 주제만 알려주세요. 레퍼런스 이미지는 위에 추가하면 됩니다.
        </p>
      </div>
      <div className="mt-3 grid gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            disabled={disabled}
            className="rounded-xl border border-border bg-white px-3 py-2 text-left text-xs leading-5 text-foreground shadow-sm transition-colors hover:border-accent hover:bg-muted disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
