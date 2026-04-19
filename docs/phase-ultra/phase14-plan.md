# Phase 14 Plan — Developer Surface (F13 + F14 + F15)

> 작성일: 2026-04-19
> 브랜치: `feature/phase14a` (F13 IDE) → `feature/phase14b` (F14 C4 export + F15 LLM)
> 추정: 4-5w
> 범위: painpoint-analysis §4 의 F13 (IDE extension), F14 (C4 / Mermaid export), F15 (LLM-assisted explain)

---

## 0. 배경

Phase 14 는 외부 채택 표면을 넓힌다 — 같은 분석 결과를 IDE 안 / 다이어그램 / 자연어로 노출.

분기:
- **14a (2-3w)**: VSCode extension (F13) 단독. IDE 통합 자체가 별도 빌드 환경 + Marketplace 절차 필요.
- **14b (2-3w)**: C4 export + LLM explain. 둘 다 stateless transform.

---

## 1. 범위

### 1-1. F13 — VSCode Extension [14a]

- 파일을 열면 자동으로 vda 백엔드 (이미 떠 있는 `vda serve`) 에 query → 그 파일의 노드 메타 사이드바 표시
- "Find usages across services" — 우클릭 → 백엔드 endpoint 호출 자동 점프
- "Show breaking risks for this DTO" — Phase 8 detector 결과 IDE 인라인

### 1-2. F14 — C4 / Mermaid export [14b]

- `vda export --c4 container --out arch.puml` — Phase 12 의 msa-service 그래프 → C4 container diagram
- `vda export --c4 component --out arch.puml` — service 내부 controller/service/mapper → C4 component diagram
- `vda export --mermaid` — 같은 데이터를 Mermaid `flowchart TB` 로

### 1-3. F15 — LLM explain [14b]

- `vda explain <node-id>` — LLM (Anthropic Claude API) 에 노드 + 1-hop 컨텍스트 보내고 자연어 설명 출력
- 옵션 `--with-history` — Phase 11 lastAuthor / lastTouchedAt 도 컨텍스트에 포함
- **anti-suggestion 가드**: API key 없으면 "set ANTHROPIC_API_KEY" 안내. 사용자 코드는 외부 전송 — 명시적 prompt 시에만 작동

### 1-4. 명시적 제외

- IntelliJ extension — VSCode 만
- Mermaid live-render — 텍스트만 export
- LLM fine-tuning / 자체 모델 — Anthropic Messages API 만

---

## 2. 체크리스트

### 2-1. F13 VSCode Extension [14a]

| # | 항목 | 파일 |
|---|---|---|
| 14-1 | 새 패키지 `@vda/vscode` (workspace) — extension manifest + activate hook | `packages/vscode/package.json`, `packages/vscode/src/extension.ts` |
| 14-2 | `VdaApiClient` 헬퍼 — localhost vda serve 자동 탐지 (3333 default) + fallback 안내 | `packages/vscode/src/api.ts` |
| 14-3 | "VDA: Show node info" 명령 — 현재 파일의 노드 metadata 사이드바 패널 | `packages/vscode/src/panels/NodeInfo.ts` |
| 14-4 | "VDA: Find cross-service usages" — 우클릭 → 백엔드 endpoint, DTO 사용처 점프 | `packages/vscode/src/commands/findUsages.ts` |
| 14-5 | "VDA: Show breaking risks" — Phase 8 detector 결과 IDE Problems 탭에 inline | `packages/vscode/src/diagnostics/breaking.ts` |
| 14-6 | Marketplace publish 스크립트 (`scripts/publish-vscode.sh`) — 권한 미설정시 graceful skip | `scripts/publish-vscode.sh` |

### 2-2. F14 C4 / Mermaid export [14b]

| # | 항목 | 파일 |
|---|---|---|
| 14-7 | `C4Exporter` — msa-service 노드 → PlantUML C4 container 다이어그램 | `core/src/exporters/C4Exporter.ts` |
| 14-8 | C4 component diagram — service 내부 (controller/service/mapper) | 위 파일 |
| 14-9 | `MermaidExporter` — flowchart TB syntax | `core/src/exporters/MermaidExporter.ts` |
| 14-10 | `vda export --c4 container|component|deployment --out file.puml` + `--mermaid` 옵션 | `cli/src/commands/export.ts` |
| 14-11 | snapshot test — test-project-ecommerce 에 대한 C4/Mermaid 출력 fixture | `cli/src/__tests__/__snapshots__/c4-export.snap` |

### 2-3. F15 LLM explain [14b]

| # | 항목 | 파일 |
|---|---|---|
| 14-12 | `vda explain <node-id> [--with-history]` — Anthropic Messages API 호출. `model: 'claude-sonnet-4-6'` (knowledge cutoff Jan 2026 기준 latest stable) | `cli/src/commands/explain.ts` |
| 14-13 | LLM prompt template — system: "VDA 노드 정보. 사용자에게 친절히 설명." / user: 노드 + 1-hop neighbors + (optional) git blame meta | 위 파일 |
| 14-14 | 사용량 안내 — `--dry-run` 으로 prompt 만 출력 (API call 없음). 첫 호출 시 ANTHROPIC_API_KEY 안내 | 위 파일 |

---

## 3. 성공 지표 (게이트)

### 14a F13
- VSCode Insiders 에서 extension 로드 + "Show node info" 명령 정상 동작 (수동 검증 1회)
- 백엔드 미가동 시 graceful "vda serve 먼저 시작" 안내
- Marketplace publish 스크립트 dry-run 성공 (실제 publish 는 사용자 권한)

### 14b F14
- test-project-ecommerce 의 3 service 가 C4 container .puml 로 정확히 export
- snapshot test 일치
- mermaid 출력이 mermaid live editor 에 paste 했을 때 렌더 (수동 1회)

### 14b F15
- `vda explain spring-controller:UserController.java --dry-run` 가 prompt 출력
- ANTHROPIC_API_KEY 설정 후 실제 호출 → 응답 1단락 이상

### 공통
- 회귀 0 + 신규 테스트 ≥ 10

---

## 4. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R1 | VSCode extension Marketplace 거버넌스 (publisher account 등) | publish 는 사용자 책임. extension code + 빌드만 ship |
| R2 | LLM 호출 비용 폭증 (대규모 그래프) | `--with-history` 외에는 1-hop 만 컨텍스트, prompt cache 적용 (Anthropic prompt caching) |
| R3 | C4 export 가 노드 100+ 일 때 가독성 0 | service-level (container) 만 ≤ 50 노드 보장. component diagram 은 service 단위 분할 |
| R4 | LLM 응답이 잘못된 코드 추론 | 응답 끝에 항상 "이 설명은 LLM 생성 — 최종 확인은 코드 직접 확인" disclaimer 추가 |

---

## 5. 의존

- Phase 11 (선택, F15 `--with-history` 가 의존)
- Phase 12 (필수, C4 container diagram 이 msa-service 노드 의존)
- Phase 8 (필수, F13 breaking risks IDE 통합)

---

## 6. Cross-phase 계약 freeze

| 계약 | 도입 | 소비 |
|---|---|---|
| C4 export 출력 형식 (PlantUML C4 prelude `!include <C4/C4_Container>`) | 14-7 | 외부 PlantUML / Structurizr 컨슈머 |
| `vda explain` prompt template 버전 | 14-13 | (외부 — Anthropic prompt caching 키로 사용) |

---

## 7. Phase 14 종료 조건

- 14a: VSCode extension 빌드 성공 + 수동 smoke 1회
- 14b: C4/Mermaid export snapshot ✅, LLM explain dry-run + (옵션) 실제 호출 1회 통과
- 회귀 0
