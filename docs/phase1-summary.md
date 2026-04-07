# Phase 1: Foundation - Implementation Summary

## Overview
Vue Dependency Analyzer(VDA)의 핵심 분석 엔진, CLI, 서버, Web UI 기반 구조를 구축.

## 구현된 패키지 (4개)

### @vda/core — 분석 엔진
- **그래프 데이터 모델** (`graph/`): 12종 NodeKind, 14종 EdgeKind, adjacency/reverse-adjacency 인덱스, BFS/DFS 쿼리, JSON/DOT 직렬화
- **Vue 파서** (`parsers/vue/`): `@vue/compiler-sfc` + TypeScript Compiler API 기반
  - `<script setup>` 분석: import, useXxxStore(), useXxx(), axios/fetch API호출, native bridge, provide/inject, defineProps/defineEmits
  - `<template>` 분석: 커스텀 컴포넌트, 커스텀 디렉티브, 이벤트 리스너
- **TypeScript 파서** (`parsers/typescript/`): composable/store/barrel 자동 감지, alias 해석
- **Java/Kotlin 파서** (`parsers/java/`): @RestController, @GetMapping 등 annotation에서 endpoint 추출, @Autowired 감지
- **링커** (`linkers/`): 프론트엔드 API URL ↔ Spring endpoint 자동 매칭 (path parameter 정규화), Native bridge 노드 자동 생성
- **분석기** (`analyzers/`): 순환 의존성(Tarjan SCC), 고아 노드, 복잡도 점수(fan-in/out), impact 분석

### @vda/cli — CLI 도구
- `vda analyze <dir>` — 프로젝트 분석 → 콘솔 리포트 또는 JSON 출력
- `vda serve <dir>` — 시각화 서버 시작
- `vda export --format json|dot` — 그래프 내보내기
- `.vdarc.json` 설정 파일 지원

### @vda/server — HTTP API + WebSocket
- Fastify 기반 REST API: `/api/graph`, `/api/graph/node/:id`, `/api/search`, `/api/stats`, `/api/analyze`
- WebSocket 실시간 업데이트
- chokidar 파일 감시 → 증분 재분석

### @vda/web-ui — 시각화 프론트엔드
- **Force-directed Graph** (Cytoscape.js + fcose): NodeKind별 색상, EdgeKind별 스타일, 이웃 하이라이트
- **Tree View** (d3-hierarchy): 선택 노드 기준 dependency/dependent 트리, 방향 전환
- 사이드바: 검색, NodeKind/EdgeKind 필터
- 노드 상세 패널: 메타데이터, 의존성/의존자 목록

## 테스트
- 64 unit tests (vitest) — 6 test suites 전부 통과
- 테스트 픽스처: SampleComponent.vue, useAuth.ts, userStore.ts, UserController.java
