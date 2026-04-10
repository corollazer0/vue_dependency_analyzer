// Graph
export * from './graph/types.js';
export { DependencyGraph } from './graph/DependencyGraph.js';
export * from './graph/query.js';
export * from './graph/serializer.js';

// Parsers
export { VueSfcParser } from './parsers/vue/VueSfcParser.js';
export { TsFileParser } from './parsers/typescript/TsFileParser.js';
export { ImportResolver } from './parsers/typescript/ImportResolver.js';
export { JavaFileParser, extractDtoFields } from './parsers/java/JavaFileParser.js';
export { KotlinFileParser } from './parsers/java/KotlinFileParser.js';
export { MyBatisXmlParser } from './parsers/java/MyBatisXmlParser.js';

// Linkers
export { ApiCallLinker } from './linkers/ApiCallLinker.js';
export { NativeBridgeLinker } from './linkers/NativeBridgeLinker.js';
export { CrossBoundaryResolver } from './linkers/CrossBoundaryResolver.js';
export { MyBatisLinker } from './linkers/MyBatisLinker.js';
export { DtoFlowLinker } from './linkers/DtoFlowLinker.js';

// Analyzers
export { findCircularDependencies } from './analyzers/CircularDependencyAnalyzer.js';
export { findOrphanNodes, findUnusedComponents, findUnusedEndpoints } from './analyzers/OrphanDetector.js';
export { calculateComplexity, findHubs } from './analyzers/ComplexityScorer.js';
export type { ComplexityScore } from './analyzers/ComplexityScorer.js';
export { analyzeImpact } from './analyzers/ImpactAnalyzer.js';
export type { ImpactResult } from './analyzers/ImpactAnalyzer.js';
export { checkDtoConsistency } from './analyzers/DtoConsistencyChecker.js';
export type { DtoMismatch, FieldDetail } from './analyzers/DtoConsistencyChecker.js';

// Engine
export { ParallelParser, parseFile } from './engine/ParallelParser.js';
export type { ProgressInfo, ProgressCallback, ParallelParseResult } from './engine/ParallelParser.js';
export { ParseCache } from './engine/ParseCache.js';
