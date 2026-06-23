---
title: "E2E 검증 — studio.soluta 샘플 캐로셀"
last_updated: "2026-06-23"
status: "verified"
---

# E2E 검증 결과 — studio.soluta 시드

검증 일자: 2026-06-23  
브랜치: claude/reverent-banzai-7ed6ff  
검증 범위: Task 8 (Plan 1 최종 E2E 스모크)

---

## 브리프 입력

| 항목 | 값 |
|------|-----|
| 업무스코프 | 1인 디자인 스튜디오 |
| 타깃 | 자기 브랜드를 만들려는 소상공인 |
| 주제 | 좋은 브리프 쓰는 법 |
| 채널 | Instagram |
| 비율 | 4:5 |

---

## 사전 검증 (단위 테스트 + 타입체크)

| 항목 | 결과 | 비고 |
|------|------|------|
| Vitest (21개 테스트) | PASS | 8개 파일 전부 통과 |
| tsc --noEmit | PASS | 오류 없음 |

---

## Step 1: 앱 실행 + 캐로셀 생성

| 항목 | 결과 | 비고 |
|------|------|------|
| Next.js dev server 기동 (localhost:3000) | PASS | 254ms 준비 |
| /api/carousels POST — Instagram, 4:5 | PASS | carousel id: e2741858... |
| /api/brand — studio.soluta 시드 반환 | PASS | 모든 토큰 정상 |

브랜드 시드 응답 확인:
- background: `#F5F4F0`, heading: `Cormorant Garamond`, body: `Pretendard Variable`
- 금칙어 12개, 키워드 5개, ending: `합니다체`

---

## Step 2: 구조화 슬라이드 API 검증

### 수동 캐로셀 (carousel id: e2741858-3668-4119-a7ea-4998a1ebed47)

7장 슬라이드를 `/api/carousels/{id}/slides` POST로 직접 추가.

| 기준 | 결과 | 비고 |
|------|------|------|
| 슬라이드 수 (5~8장) | PASS | 7장 |
| 첫 슬라이드 role=hook | PASS | "브리프 하나로 작업이 달라집니다" |
| 마지막 슬라이드 role=cta | PASS | "브리프 템플릿을 받아가세요" |
| 배경 #F5F4F0 | PASS | 전 슬라이드 HTML 인라인 스타일 확인 |
| Cormorant Garamond 헤드라인 | PASS | 전 슬라이드 font-family 확인 |
| Pretendard 본문 (weight>=400) | PASS | font-weight:400 전 슬라이드 |
| violations 0건 | PASS | 모든 슬라이드 `"violations":[]` |
| 헤드라인 50자 이내 | PASS | 최대 20자 (전부 50자 이하) |
| 이모지 없음 | PASS | checkVoice EMOJI 검사 통과 |

보이스 필터 위반 탐지 확인:
- "혁신적인 솔루션으로 패러다임 전환" POST → violations 5건 반환 (혁신적, 혁신, 솔루션, 패러다임, 선도)
- PASS: 탐지 정확도 확인

---

### 라이브 생성 테스트 (carousel id: 5e4f4835-15dc-4206-9ef4-80d71d350240)

`/api/chat` POST로 Claude CLI를 경유한 실제 생성 테스트.

| 기준 | 결과 | 비고 |
|------|------|------|
| Claude CLI 감지 (/api/chat/check) | PASS | `{"available":true}` |
| /api/chat SSE 스트림 응답 | PASS | 30초 내 완료 |
| 슬라이드 수 (5~8장) | PASS | 8장 생성 |
| 첫 슬라이드 role=hook | PASS | "알아서 잘 해주세요" |
| 마지막 슬라이드 role=cta | PASS | "오늘 다섯 줄을 적어보세요" |
| 배경 #F5F4F0 | PASS | 전 슬라이드 확인 |
| Cormorant Garamond 헤드라인 | PASS | 전 슬라이드 확인 |
| violations 0건 | PASS | 모든 슬라이드 |
| 헤드라인 50자 이내 | PASS | 최대 14자 |

---

## Step 3: 슬라이드 편집 + PNG 내보내기

### 헤드라인 편집

| 항목 | 결과 | 비고 |
|------|------|------|
| PUT /slides/{id} — headline 수정 | PASS | "브리프 하나로 작업이 달라집니다"로 변경 |
| 수정 후 HTML 재렌더 확인 | PASS | 응답 HTML에 신규 텍스트 포함 |
| 수정 후 violations 0건 | PASS | `"violations":[]` |

### PNG 내보내기 (수동 캐로셀, 7장)

| 항목 | 결과 | 비고 |
|------|------|------|
| POST /export → ZIP 반환 | PASS | 200 OK, 69,691 bytes |
| slide-1.png ~ slide-7.png 생성 | PASS | 7개 파일 |
| 픽셀 크기 1080x1350 | PASS | 전 파일 확인 (Python struct.unpack) |
| Puppeteer 렌더 성공 | PASS | Headless Chrome, --no-sandbox |
| Sharp sRGB 후처리 | PASS | 파이프라인 정상 |
| Cormorant Garamond 임베드 | PASS | 857KB base64 woff2 캐시 사용 |
| Pretendard 임베드 | 주의 | CDN 링크 방식 (base64 미인라인). 네트워크 있으면 정상 렌더, 오프라인 환경은 시스템 폰트 폴백. export 폰트 인라인 = phase 2 |

PNG 파일 위치: `docs/samples/slide-{1-7}.png`  
라이브 생성 PNG: `docs/samples/livegen/slide-{1-8}.png`

---

## 남은 이슈

| 이슈 | 우선순위 | 비고 |
|------|---------|------|
| Pretendard PNG 인라인 미완 | Phase 2 | CDN URL 방식으로 대체 중. 오프라인 환경에서 시스템 폰트 폴백 발생 가능. 해결책: jsdelivr CDN에서 CSS + woff2 fetch 후 base64 캐시 |
| preview_* 도구 연동 미확인 | 낮음 | 포트 4321 충돌로 preview_start 실패. API 직접 검증으로 대체 완료 |

---

## Plan 1 완료 기준 체크

| 기준 | 결과 |
|------|------|
| studio.soluta 시드로 브리프 입력 → 5~8장 캐로셀 렌더·미리보기 | PASS |
| 슬라이드 글자 직접 수정 | PASS |
| PNG 내보내기 1080x1350 | PASS |
| 모든 Vitest 통과 | PASS |
| tsc --noEmit 클린 | PASS |
| 자유 HTML 생성 → 구조화 content→템플릿 렌더로 교체 | PASS |
