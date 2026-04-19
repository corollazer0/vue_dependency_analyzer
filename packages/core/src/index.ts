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
export type { DtoFieldChain, DtoFieldChainEntry } from './linkers/DtoFlowLinker.js';
export type { ResultMap, ResultMapping } from './parsers/java/MyBatisXmlParser.js';

// Analyzers
export { findCircularDependencies } from './analyzers/CircularDependencyAnalyzer.js';
export { findOrphanNodes, findUnusedComponents, findUnusedEndpoints } from './analyzers/OrphanDetector.js';
export {
  collectEntrypoints,
  reachableFromEntrypoints,
  type EntrypointSource,
  type EntrypointReason,
} from './analyzers/EntrypointCollector.js';
export { findDeadNodes, type DeadCodeReport } from './analyzers/DeadCodeDetector.js';
export {
  SignatureStore,
  type SignatureKind,
  type SignatureRecord,
  type SignatureSet,
  type SignatureDiff,
  type SignatureStoreOptions,
} from './engine/SignatureStore.js';
export {
  detectBreakingChanges,
  type BreakingChange,
  type BreakingChangesReport,
  type BreakingCode,
} from './analyzers/BreakingChangeDetector.js';
export {
  classifyAntiPatterns,
  type AntiPatternTag,
  type AntiPatternResult,
  type ClassifyOptions,
  type ComplexityThresholds,
} from './analyzers/AntiPatternClassifier.js';
export {
  readOtelTraces,
  reduceSpans,
  type SpanRecord,
  type EndpointTraceStats,
  type OtelReadResult,
} from './telemetry/OtelReader.js';
export {
  WaiverEngine,
  loadWaivers,
  type Waiver,
  type WaiverMatchInput,
} from './analyzers/WaiverEngine.js';
export {
  compileLayerRules,
  mergeWithLayerRules,
  type LayerDefinition,
  type LayerRule,
  type LayerDslConfig,
  type CompiledLayerRules,
  type DroppedRule,
} from './analyzers/LayerDsl.js';
export { calculateComplexity, findHubs } from './analyzers/ComplexityScorer.js';
export type { ComplexityScore } from './analyzers/ComplexityScorer.js';
export { analyzeImpact } from './analyzers/ImpactAnalyzer.js';
export type { ImpactResult } from './analyzers/ImpactAnalyzer.js';
export { checkDtoConsistency } from './analyzers/DtoConsistencyChecker.js';
export type { DtoMismatch, FieldDetail } from './analyzers/DtoConsistencyChecker.js';
export { evaluateRules } from './analyzers/RuleEngine.js';
export { detectCommunities, groupNodesByCommunity } from './analyzers/CommunityDetector.js';
export type { CommunityDetectionOptions, CommunityResult } from './analyzers/CommunityDetector.js';

// Git
export { parseGitDiff, getUncommittedFiles } from './git/GitDiffParser.js';
export { analyzeChangeImpact } from './git/ChangeImpactAnalyzer.js';
export type { ChangeImpact } from './git/ChangeImpactAnalyzer.js';
export { readGitBlame, repoRelative, blameLookupKey } from './git/GitBlameReader.js';
export type { GitBlameRecord, GitBlameMap } from './git/GitBlameReader.js';

// Engine
export { ParallelParser, parseFile } from './engine/ParallelParser.js';
export type { ProgressInfo, ProgressCallback, ParallelParseResult, ParsedFileEntry } from './engine/ParallelParser.js';
export { ParseCache } from './engine/ParseCache.js';
