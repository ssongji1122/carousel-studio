# Ordinal Edition — 샘플 캐로셀

Instagram @ordinal.edition 스타일로 만든 샘플 캐로셀 (멀티브랜드 샘플 작업의 첫 브랜드).

## 산출물

- `png/slide-1..5.png` — 4:5 (1080×1350) 샘플 5장 (표지 / 리스트 / 다크인용 / 리스트 / 마무리)
- `ordinal-sample.zip` — export 원본 ZIP
- `brand-ordinal.md` — 재적용용 브랜드 문서 ("문서에서 가져오기"에 붙여넣기)
- `_sample-meta.json` — carouselId + 적용 brand + 슬라이드 구조 원문
- `_brand-backup-before.json` — 작업 전 라이브 brand.json 백업 (studio.soluta 복원용)

## 브랜드 추출 방법 (다른 브랜드에도 동일 적용 가능)

1. Instagram 공개 프로필 JSON: `i.instagram.com/api/v1/users/web_profile_info/?username=<handle>`
   (curl_cffi safari_ios 임퍼소네이션 + `x-ig-app-id: 936619743392459`)
   → 바이오·외부링크·최근 게시물 캡션·이미지 URL 확보.
2. 대표 피드 이미지 다운로드 후 PIL `quantize`로 도미넌트 컬러 추출 → 팔레트.
3. 캡션·바이오·시리즈명에서 톤·키워드 정리.
4. 폰트는 무드에서 유추 (공식 서체 있으면 교체).

## 콘텐츠 주의

슬라이드 카피는 브랜드 톤을 보여주기 위한 **샘플(예시)**입니다. KEYHOLE / 보태니컬 / 키비주얼은
실제 피드에 등장하는 시리즈명이지만, 각 한 줄 설명은 예시 해석입니다. 실제 발행 전 검수 필요.

## 현재 라이브 앱 상태

- `http://localhost:3000` 의 brand.json 이 **ORDINAL® EDITION 으로 교체**되어 있습니다.
- studio.soluta 로 되돌리려면:
  ```bash
  curl -s -X PUT http://localhost:3000/api/brand -H "Content-Type: application/json" \
    -d @docs/samples/ordinal/_brand-backup-before.json
  ```
