# Phase 13 Plan — Schema Drift (F11)

> 작성일: 2026-04-19
> 브랜치: `feature/phase13` (Phase 12 머지 후 권장 — 단, 12 와 독립 가능)
> 추정: 3-4w
> 범위: painpoint-analysis §4 의 F11 — 운영 사고 예방을 위한 DB 스키마 drift 감지

---

## 0. 배경

Phase 8 의 BreakingChangeDetector B4 가 db-column 단위 변화를 감지하지만, 그 정보가 정확하려면 두 가지가 필요:
1. MyBatis 동적 SQL 에서 column 이름 추출 (현 파서는 `<resultMap>` `<result>` 만 안다)
2. 외부 DDL 파일 (Flyway/Liquibase) 의 schema diff

본 phase 는 두 트랙을 같이 커버.

---

## 1. 범위

### 1-1. MyBatis 파서 강화

- `<select>` 본문의 `SELECT col1, col2, ... FROM table` 추출 (정규식 + 토큰 단순화)
- `${dynamic_col}` placeholder 인 동적 column 은 "확신도 낮음" 마커
- `<if test="...">` 분기 내부의 column ref 도 수집 (best-effort)

### 1-2. DDL 외부 파일 통합

- Flyway 마이그레이션 (`V1__init.sql`, `V2__add_user_email.sql`) 시퀀셜 파싱
- Liquibase XML 도 옵션 (`databaseChangeLog`)
- 추출 결과: `tableName -> columns[{name, type, nullable, default}]`

### 1-3. SchemaSnapshotStore + drift detector

- DDL 파싱 결과를 별도 sqlite (`.vda-cache/schema.sqlite`) 에 snapshot
- `vda schema-diff <fromLabel>..<toLabel>` → 추가/삭제/타입변경/nullable flip
- 위 4가지를 BreakingChangeDetector B4 의 입력으로 commit

### 1-4. 명시적 제외

- PostgreSQL/Oracle 전용 문법 — 표준 ANSI SQL + MySQL/H2 우선
- DDL 의 트리거 / 인덱스 — Phase 14+

---

## 2. 체크리스트

| # | 항목 | 파일 |
|---|---|---|
| 13-1 | `MyBatisXmlParser.extractSelectColumns(xml)` — `<select>` 의 SELECT 절에서 column 식별자 토큰화 | `core/src/parsers/java/MyBatisXmlParser.ts` |
| 13-2 | `<if>` 분기 안의 추가 column 도 수집 (UNION ALL 처럼 전체 가능 column 합집합) | 위 파일 |
| 13-3 | `${...}` 동적 placeholder 마킹 — `metadata.dynamicColumnCount` | 위 파일 |
| 13-4 | `FlywayMigrationParser` 신규 — `V<n>__<desc>.sql` 시퀀스 적용해 누적 schema 계산 | `core/src/parsers/sql/FlywayMigrationParser.ts` 신규 |
| 13-5 | `SqlDdlParser` 신규 — `CREATE TABLE`, `ALTER TABLE ADD/DROP/MODIFY COLUMN` 만 지원 (CREATE INDEX 등 무시) | `core/src/parsers/sql/SqlDdlParser.ts` 신규 |
| 13-6 | `runAnalysis` 옵션 `ddl: { migrations: 'db/migrations' }` 시 위 파서 적용 → db-table 노드 metadata.columns 에 채움 | `core/src/engine/runAnalysis.ts` |
| 13-7 | `SchemaSnapshotStore` 신규 sqlite (별도 파일) — `tables(label, table_name, columns_json, taken_at)` | `core/src/engine/SchemaSnapshotStore.ts` |
| 13-8 | `vda schema-snapshot --label <name>` + `vda schema-diff <from>..<to>` CLI | `cli/src/commands/schemaSnapshot.ts`, `cli/src/commands/schemaDiff.ts` |
| 13-9 | `BreakingChangeDetector` B4 통합 — schema diff 도 추가 input. 기존 db-column SignatureDiff 와 OR 통합 | `core/src/analyzers/BreakingChangeDetector.ts` |
| 13-10 | UI: NodeDetail (db-table) 에 columns 리스트 + drift 표시 (added/removed/type-changed 마커) | `web-ui/src/components/graph/NodeDetail.vue` |
| 13-11 | E2E: test-project 에 가짜 Flyway dir 추가 (V1__init / V2__add_email / V3__drop_email) → schema-diff CLI 가 column drop 검출 | `test-project/db/migrations/`, `core/src/__tests__/schema-drift.test.ts` |

---

## 3. 성공 지표 (게이트)

- MyBatis 동적 SQL 의 column 검출률: test-project-ecommerce 의 mapper xml 에서 정적 column ≥ 90%, 동적 marker 1건 이상 존재
- Flyway 시퀀스 (V1→V2→V3) 적용 후 누적 columns 정확
- `vda schema-diff` 가 V2..V3 사이에 dropped column 정확히 1건 검출
- BreakingChangeDetector B4 가 schema diff + signature diff 통합 동작 (기존 신호도 유지)
- 회귀 0

---

## 4. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R1 | SQL 파싱 정규식 한계 (CTE, 서브쿼리) | "best-effort" 명시, 동적 marker 와 동일 처리. AST 기반은 Phase 15+ |
| R2 | Flyway / Liquibase 의 환경별 분기 (`-- ::H2_ONLY`) | 무시, 모든 migration 적용 가정. 환경별 분기는 사용자 책임 |
| R3 | DDL parser 의 PostgreSQL `JSONB` / Oracle `NUMBER(p,s)` | 첫 word 만 type 으로 사용, 정규화 X |

---

## 5. 의존

- Phase 8 SignatureStore (필수) — B4 통합 입력
- Phase 12 (선택) — service-shares-db 와 schema drift 를 같이 봤을 때 cross-service impact 더 크게 보임

---

## 6. Cross-phase 계약 freeze

| 계약 | 도입 | 소비 |
|---|---|---|
| `db-table.metadata.columns: Array<{name, type, nullable?}>` | 13-6 | Phase 8 BreakingChangeDetector B4 (이미 활용 중, 메타가 채워지는 시점이 13 이후), Phase 14 C4 export (data layer rendering) |
| SchemaSnapshotStore sqlite 파일 형식 | 13-7 | (없음 — 단일 phase 내 사용) |

---

## 7. Phase 13 종료 조건

- 11 체크리스트 ✅
- E2E gate (Flyway 3 step + drop column 검출) green
- BreakingChangeDetector B4 가 column drop 을 metadata-driven + DDL-driven 모두에서 잡음
- 회귀 0
