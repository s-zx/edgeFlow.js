/**
 * edgeFlow.js - Zero-shot Classification Pipeline
 *
 * Classify text into any set of labels without fine-tuning.
 */
import { BasePipeline, PipelineResult } from './base.js';
import { EdgeFlowTensor } from '../core/tensor.js';
import { PipelineConfig, PipelineOptions } from '../core/types.js';
import { Tokenizer } from '../utils/tokenizer.js';
/**
 * Zero-shot classification options
 */
export interface ZeroShotClassificationOptions extends PipelineOptions {
    /** Multi-label classification (allow multiple labels) */
    multiLabel?: boolean;
    /** Hypothesis template (use {label} as placeholder) */
    hypothesisTemplate?: string;
}
/**
 * Classification result with scores for each label
 */
export interface ZeroShotClassificationResult extends PipelineResult {
    /** Input text */
    sequence: string;
    /** Candidate labels in order of score */
    labels: string[];
    /** Scores for each label */
    scores: number[];
}
/**
 * ZeroShotClassificationPipeline - Classify text without training
 *
 * Uses Natural Language Inference (NLI) models to classify text
 * into any set of candidate labels.
 *
 * @example
 * ```typescript
 * const classifier = await pipeline('zero-shot-classification');
 *
 * const result = await classifier.run(
 *   'I love playing soccer on weekends',
 *   ['sports', 'politics', 'technology']
 * );
 *
 * console.log(result.labels[0], result.scores[0]); // 'sports', 0.95
 * ```
 */
/**
 * Input type for zero-shot classification
 */
export interface ZeroShotInput {
    text: string | string[];
    candidateLabels: string[];
}
export declare class ZeroShotClassificationPipeline extends BasePipeline<ZeroShotInput, ZeroShotClassificationResult | ZeroShotClassificationResult[]> {
    private tokenizer;
    private hypothesisTemplate;
    constructor(config?: PipelineConfig);
    /**
     * Set tokenizer
     */
    setTokenizer(tokenizer: Tokenizer): void;
    /**
     * Run classification (convenience method with separate arguments)
     */
    classify(text: string | string[], candidateLabels: string[], options?: ZeroShotClassificationOptions): Promise<ZeroShotClassificationResult | ZeroShotClassificationResult[]>;
    /**
     * Run classification
     */
    run(input: ZeroShotInput, options?: PipelineOptions): Promise<ZeroShotClassificationResult | ZeroShotClassificationResult[]>;
    /**
     * Classify a single text
     */
    private classifySingle;
    /**
     * Score a single hypothesis using NLI
     */
    private scoreHypothesis;
    /**
     * Preprocess - not directly used (handled in scoreHypothesis)
     */
    protected preprocess(input: ZeroShotInput): Promise<EdgeFlowTensor[]>;
    /**
     * Postprocess - not directly used
     */
    protected postprocess(_outputs: EdgeFlowTensor[], _options?: PipelineOptions): Promise<ZeroShotClassificationResult | ZeroShotClassificationResult[]>;
}
export declare function createZeroShotClassificationPipeline(config?: PipelineConfig): ZeroShotClassificationPipeline;
//# sourceMappingURL=zero-shot-classification.d.ts.map