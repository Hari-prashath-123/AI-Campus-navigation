import { describe, it, expect, beforeEach } from 'vitest';
import { evaluationFramework } from '../eval/evaluation-framework';
import { navStore } from '../api/nav.store';
import { objectStore } from '../api/object.store';
import { campusService } from '../api/campus.service';
import { authService } from '../api/auth.service';
import {
  INITIAL_CAMPUSES,
  INITIAL_BUILDINGS,
  INITIAL_FLOORS,
  INITIAL_MAP_OBJECTS,
  INITIAL_NODES,
  INITIAL_CONNECTIONS,
} from '../api/mock-data';

describe('Rigorous Empirical Evaluation & Benchmarking Framework', () => {
  beforeEach(async () => {
    // Ensure stores are freshly initialized with baseline dataset
    campusService.reset(INITIAL_CAMPUSES, INITIAL_BUILDINGS, INITIAL_FLOORS);
    objectStore.reset(INITIAL_MAP_OBJECTS);
    navStore.reset(INITIAL_NODES, INITIAL_CONNECTIONS);
    await authService.loginAsDemoAdmin('super_admin');
  });

  it('executes the complete evaluation suite across all 10 technical dimensions and returns verified metrics', async () => {
    const summary = await evaluationFramework.runEvaluation();

    expect(summary).toBeDefined();
    expect(summary.timestamp).toBeDefined();
    expect(summary.benchmarkEnvironment.framework).toContain('Vitest');

    // 1. Map Creation Efficiency: Measured Real-World Mapping Simulation
    const { mapCreationEfficiency } = summary.empiricalResults;
    expect(mapCreationEfficiency.manualActionsCount).toBe(14);
    expect(mapCreationEfficiency.templateActionsCount).toBe(1);
    expect(mapCreationEfficiency.actionReductionPercent).toBeGreaterThanOrEqual(80);
    expect(mapCreationEfficiency.manualExecutionTimeMs).toBeGreaterThan(0);
    expect(summary.metrics.mapCreationEfficiency.isEmpiricalMeasurement).toBe(true);

    // 2. Geometry Persistence & Coordinate Stability
    const { geometryPersistence } = summary.empiricalResults;
    expect(geometryPersistence.vertexDriftL2).toBeLessThan(0.001);
    expect(geometryPersistence.areaRetentionPercent).toBe(100);
    expect(geometryPersistence.polygonValid).toBe(true);

    // 3. Graph Integrity & Reachability
    const { graphIntegrityAndReachability } = summary.empiricalResults;
    expect(graphIntegrityAndReachability.reachabilityPercent).toBe(100);
    expect(graphIntegrityAndReachability.danglingEndpointsCount).toBe(0);
    expect(graphIntegrityAndReachability.bidirectionalSymmetric).toBe(true);
    expect(graphIntegrityAndReachability.allDistancesPositive).toBe(true);

    // 4. Multi-Scale Routing Latency (Small, Medium, Large)
    const { routingLatencyByGraphScale } = summary.empiricalResults;
    expect(routingLatencyByGraphScale.smallGraph.latency.meanMs).toBeLessThan(50);
    expect(routingLatencyByGraphScale.smallGraph.latency.p95Ms).toBeLessThan(100);
    expect(routingLatencyByGraphScale.mediumGraph.latency.meanMs).toBeLessThan(100);
    expect(routingLatencyByGraphScale.largeGraph.latency.meanMs).toBeLessThan(250);
    expect(routingLatencyByGraphScale.largeGraph.latency.sampleCount).toBe(50);

    // 5. Routing Scenario Validity & Floor Transitions
    const { routingValidityAndTransitions } = summary.empiricalResults;
    expect(routingValidityAndTransitions.validRoutesPercent).toBe(100);
    expect(routingValidityAndTransitions.floorTransitionAccuracyPercent).toBe(100);
    expect(routingValidityAndTransitions.accessibilityAdherencePercent).toBe(100);

    // 6. Multilingual Object Search Accuracy (N = 30 across EN, TA, HI)
    const { multilingualSearch } = summary.empiricalResults;
    expect(multilingualSearch.sampleSizes.english).toBe(10);
    expect(multilingualSearch.sampleSizes.tamil).toBe(10);
    expect(multilingualSearch.sampleSizes.hindi).toBe(10);
    expect(multilingualSearch.sampleSizes.total).toBe(30);
    expect(multilingualSearch.enAccuracyTop1).toBeGreaterThanOrEqual(90);
    expect(multilingualSearch.taAccuracyTop1).toBeGreaterThanOrEqual(90);
    expect(multilingualSearch.hiAccuracyTop1).toBeGreaterThanOrEqual(90);
    expect(multilingualSearch.overallAccuracyTop1).toBeGreaterThanOrEqual(90);

    // 7. Ambiguity Disambiguation & Confusion Matrix (N = 10)
    const { ambiguityDisambiguation } = summary.empiricalResults;
    expect(ambiguityDisambiguation.sampleSizes.ambiguous).toBe(5);
    expect(ambiguityDisambiguation.sampleSizes.unambiguous).toBe(5);
    expect(ambiguityDisambiguation.confusionMatrix.f1Score).toBeGreaterThanOrEqual(0.85);
    expect(ambiguityDisambiguation.confusionMatrix.precision).toBeGreaterThanOrEqual(0.8);
    expect(ambiguityDisambiguation.confusionMatrix.recall).toBeGreaterThanOrEqual(0.8);
    expect(ambiguityDisambiguation.confusionMatrix.truePositives).toBeGreaterThan(0);
    expect(ambiguityDisambiguation.confusionMatrix.trueNegatives).toBeGreaterThan(0);

    // 8. AI Groundedness, Anti-Hallucination & Missing Data Safety (N = 6)
    const { aiGroundednessAndSafety } = summary.empiricalResults;
    expect(aiGroundednessAndSafety.scenariosEvaluated).toBe(6);
    expect(aiGroundednessAndSafety.groundedClaimRatePercent).toBe(100);
    expect(aiGroundednessAndSafety.unsupportedClaimRatePercent).toBe(0);
    expect(aiGroundednessAndSafety.adversarialRefusalRatePercent).toBe(100);

    // 9. Tool Resilience & Outage Recovery
    const { toolResilienceAndRecovery } = summary.empiricalResults;
    expect(toolResilienceAndRecovery.toolSuccessRatePercent).toBe(100);
    expect(toolResilienceAndRecovery.providerOutageFallbackRecoveryPercent).toBe(100);

    // 10. Extensibility & Spatial Update Consistency
    const { extensibilityAndConsistency } = summary.empiricalResults;
    expect(extensibilityAndConsistency.domainTemplatesAvailable).toBeGreaterThanOrEqual(3);
    expect(extensibilityAndConsistency.customPropertyValidationEnforced).toBe(true);
    expect(extensibilityAndConsistency.importExportRoundTripFidelityPercent).toBe(100);
    expect(extensibilityAndConsistency.transactionRollbackZeroOrphans).toBe(true);

    // 11. Human Usability Testing Integrity Flag
    expect(summary.usabilityProtocolStatus.humanUserStudyConducted).toBe(false);
    expect(summary.usabilityProtocolStatus.statusNote).toContain('NOT fabricated');
    expect(summary.usabilityProtocolStatus.protocol.targetSUSScore).toBe(82.5);
  });
});
