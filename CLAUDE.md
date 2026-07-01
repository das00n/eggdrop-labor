# 에그드랍 생태계 — 프로젝트 공통 지침

이 레포는 **에그드랍 운영 생태계**의 일부입니다. 작업 시작 전 아래를 확인하세요.
(이 파일은 여러 레포에 공통 배포됩니다. 관제탑 = `das00n/eggdrop-control-tower`가 정본.)

## 🛫 관제탑 (조율 단일 지점)
- 정본: `das00n/eggdrop-control-tower` 레포의 `CONTROL-TOWER.md`.
- **접근 가능하면 작업 전 먼저 읽기**: §1 Supabase 3규칙 · §2 진행 중 세션(충돌 조율) · §5 저장소 인벤토리 · §6 원격제어.
- 로컬 세션 경로: `C:\Users\wooji\projects\control-tower\CONTROL-TOWER.md`.
- 클라우드 세션이 관제탑 레포에 접근이 없으면, 아래 인라인 규칙만이라도 반드시 지킬 것.

## ★ 공유 Supabase 3규칙 (한국 공유 정본 `gylhxpvltnxhwjagrkts`을 건드릴 때 필수)
1. **스키마/뷰 변경은 한 번에 한 세션만.** 다른 세션은 그 사이 읽기만.
2. **Additive-only (Expand-Contract).** 컬럼·뷰는 지우지 말고 추가 → 모든 소비자 이전 후에만 옛 구조 제거.
3. **테이블별 writer 1명.** `sales`=NCP cron · `orders`=동원 수집 · `labor_costs`/`attendance`=인건비 봇 · `stores`=수집기. 한 테이블 두 writer 금지.

> 일본(`eggdrop-japan`)·본사 물품(`eggdrop-goods`)은 **별도 Supabase(완전 격리)** — 위 규칙 무관.

## 멀티세션 충돌 주의
- 여러 세션이 같은 공유 Supabase·여러 레포를 동시에 작업합니다. 겹치면 순서 조율(관제탑 §2 레지스트리).
- Supabase에 영향 주는 변경은 `ops_changelog` 테이블에 기록.

## 시크릿
- `.dev.vars`·`.env`·`*.key`·`*.token`·자격증명은 **절대 커밋 금지**. 각 레포 `.gitignore` 확인 후 작업.
