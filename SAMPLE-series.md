---
title: "Series (0층) E2E 샘플 검증"
last_updated: "2026-06-23"
status: "verified"
plan_id: "tb7q4txjmqqphcpj"
---

# 시리즈(0층) E2E 샘플 검증

검증 일시: 2026-06-23
브리프: scope="1인 디자인 스튜디오" / target="자기 브랜드를 만들려는 소상공인" / channel=instagram / count=3

---

## 검증 환경

- 실행 서버: `~/.nvm/versions/node/v24.14.0/bin/npm run dev` (localhost:3000)
- Claude CLI: `claude` (generate 서브프로세스 정상 실행)
- 검증 방식: curl + python3

---

## Step 1: 플랜 생성 (POST /api/plans)

**STATUS: PASS**

```
curl -s -X POST localhost:3000/api/plans \
  -H 'Content-Type: application/json' \
  -d '{"scope":"1인 디자인 스튜디오","target":"자기 브랜드를 만들려는 소상공인","channel":"instagram","count":3}'
```

응답:
```json
{
  "id": "tb7q4txjmqqphcpj",
  "brief": {"scope":"1인 디자인 스튜디오","target":"자기 브랜드를 만들려는 소상공인"},
  "channel": "instagram",
  "count": 3,
  "pillars": [],
  "items": [],
  "createdAt": "2026-06-23T13:54:31.447Z"
}
```

---

## Step 2: Claude 주제 생성 (POST /api/plans/[id]/generate)

**STATUS: PASS**

```
curl -s -X POST localhost:3000/api/plans/tb7q4txjmqqphcpj/generate
```

소요 시간: 약 86초 (Claude CLI 서브프로세스 정상 종료)

생성된 아이템 (3개, 정확히 count와 일치):

| id | pillar   | topic                                                                               | status  |
|----|----------|-------------------------------------------------------------------------------------|---------|
| 1  | 실습     | 무료 도구만으로 내 가게 브랜드 컬러 세 가지를 정하는 다섯 단계를 따라합니다.     | planned |
| 2  | 작업 기록 | 동네 베이커리 로고를 손스케치에서 최종 형태까지 풀어낸 작업 과정을 단계별로 보여드립니다. | planned |
| 3  | 관점     | 이름·색·간판이 따로 노는 가게를 하나의 시선으로 연결하는 점검 항목 일곱 가지를 정리합니다. | planned |

검증:
- 아이템 수 = 3 (count와 일치): PASS
- 이모지 없음: PASS
- 금칙어 없음 (혁신/최고/압도/미래를/시너지/융합/솔루션/패러다임/선도): PASS

참고: `pillars` 배열은 비어 있음 — 필러 이름이 각 item.pillar 필드에 인라인으로만 저장되며, plan.pillars 배열에 별도 집계되지 않음. 기능상 문제는 없으나 task-6-brief의 "필러 3~5개 도출" 기준(별도 배열)과 구현 간 차이가 있음 (이슈 목록 참조).

---

## Step 3: 편집 체크포인트 (PATCH /api/plans/[id])

**STATUS: PASS**

아이템 1 토픽 수정 + 아이템 3 삭제:

```
curl -s -X PATCH localhost:3000/api/plans/tb7q4txjmqqphcpj \
  -H 'Content-Type: application/json' \
  -d '{"items":[
    {"id":1,"pillar":"실습","topic":"무료 도구로 브랜드 컬러 정하는 3단계 (수정됨)","status":"planned","carouselId":null},
    {"id":2,"pillar":"작업 기록","topic":"동네 베이커리 로고를 손스케치에서 최종 형태까지 풀어낸 작업 과정을 단계별로 보여드립니다.","status":"planned","carouselId":null}
  ]}'
```

PATCH 후 GET 결과:
- 아이템 수: 2 (아이템 3 삭제 반영)
- 아이템 1 토픽: "무료 도구로 브랜드 컬러 정하는 3단계 (수정됨)" (수정 반영)
- 아이템 2: 변경 없음 유지
- 영속화 확인: GET 재조회에서도 동일 데이터 반환

편집 반영: PASS

---

## Step 4: 팬아웃 (POST /api/plans/[id]/fanout)

**STATUS: PASS**

```
curl -s -X POST localhost:3000/api/plans/tb7q4txjmqqphcpj/fanout
```

결과 (plan.items 업데이트):

| item id | pillar    | status  | carouselId                           |
|---------|-----------|---------|--------------------------------------|
| 1       | 실습      | created | 80cf6828-9c04-4714-9388-d62b38fdcea4 |
| 2       | 작업 기록 | created | 1deb36a1-c873-47af-be12-5880852dba99 |

생성된 캐로셀 검증:

```
GET /api/carousels/80cf6828-9c04-4714-9388-d62b38fdcea4
```
- channel: instagram (PASS)
- tags: ["실습"] (PASS, pillar 반영)
- slides: 0 (빈 셸, 정상)

```
GET /api/carousels/1deb36a1-c873-47af-be12-5880852dba99
```
- channel: instagram (PASS)
- tags: ["작업 기록"] (PASS, pillar 반영)
- slides: 0 (빈 셸, 정상)

팬아웃 후 item.status="created", carouselId 할당: PASS

---

## Step 5: 단일 흐름 연결 (캐로셀 페이지 접근)

**STATUS: PASS**

```
GET http://localhost:3000/carousel/80cf6828-9c04-4714-9388-d62b38fdcea4
HTTP 200
```

생성된 캐로셀은 기존 단일 캐로셀 흐름(`/carousel/[id]`)으로 정상 라우팅됨.
해당 페이지에서 chat 패널을 통해 슬라이드 생성 가능(기존 Plan 1 흐름 유지).

---

## Step 6: 정적 검증

**tsc --noEmit: PASS** (에러 없음)

**Vitest: PASS** (12 files, 31 tests)

---

## 종합 결과

| 검증 항목                          | 결과        |
|------------------------------------|-------------|
| 플랜 생성 (POST /api/plans)        | PASS        |
| Claude 주제 생성 (generate)        | PASS        |
| 아이템 수 = count(3)               | PASS        |
| 이모지 없음                        | PASS        |
| 금칙어 없음                        | PASS        |
| 편집 체크포인트 (PATCH + GET)      | PASS        |
| 팬아웃 (fanout)                    | PASS        |
| 캐로셀 channel=instagram           | PASS        |
| 캐로셀 tags=[pillar]               | PASS        |
| /carousel/[id] 라우팅              | PASS        |
| tsc --noEmit                       | PASS        |
| Vitest (31 tests)                  | PASS        |

---

## 남은 이슈

1. **plan.pillars 배열 미집계**: Claude가 생성한 필러 이름이 각 item.pillar에 인라인으로만 존재하고 plan.pillars 배열에 별도로 기록되지 않음. fanout/UI에서 필러별 그룹핑이 필요한 경우 후속 처리 필요. 기능 블로커는 아님 — 현재 팬아웃과 tags 할당은 item.pillar를 직접 읽어 정상 작동함.

2. **carousel.title 미설정**: fanout으로 생성된 캐로셀의 title이 null. 브리프 topic에서 자동 설정하는 로직이 fanout에 없음. UI에서 "제목 없음"으로 표시될 수 있음.
