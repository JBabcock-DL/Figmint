export { classifyThreeWay, isSynced } from './classify';
export type {
  ComponentComparable,
  ComponentDiff,
  ComponentDriftDetectInput,
  ComponentDriftDetectResult,
  ComponentDriftPayload,
  DriftDirection,
  VariableComparable,
  VariableDriftDetectInput,
  VariableDriftDetectResult,
} from './types';
export { variableStatesEqual } from './variableEqual';
export { parseVariableDriftId, toVariableDriftId, toVariableKey } from './variableKeys';
export { toComponentDriftId, registryKeyFromSpecName } from './componentKeys';
export {
  buildComponentDiff,
  componentComparableEqual,
  componentHashEqual,
  extractPropsFromDefinitions,
  extractVariantMatrixFromDefinitions,
} from './componentDiff';
export { figmaComponentSetToComparable } from './figmaComponent';
export {
  buildComponentDriftEntry,
  buildRepoSpecMap,
  detectComponentDrift,
  specToComparable,
} from './components';
export { readSnapshotComponentComparables } from './snapshotComponents';
export { readVariableSnapshotTokens } from './snapshotTokens';
export {
  detectVariableDrift,
  flattenFigmaVariableSnapshots,
  flattenRepoTokens,
} from './variables';
export { collectFigmaComponentComparablesFromSnapshot } from './detectOrchestration';
export { buildDriftReport } from './report';
export { buildDriftReportMeta } from './reportMeta';
export { runDetectDrift } from './runDetectDrift';
