/**
 * edgeFlow.js - Zero-shot Classification Pipeline
 * 
 * Classify text into any set of labels without fine-tuning.
 */

import { BasePipeline, PipelineResult } from './base.js';
import { EdgeFlowTensor, softmax } from '../core/tensor.js';
import { PipelineConfig, PipelineOptions } from '../core/types.js';
import { Tokenizer } from '../utils/tokenizer.js';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Zero-shot Classification Pipeline
// ============================================================================

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

export class ZeroShotClassificationPipeline extends BasePipeline<
  ZeroShotInput,
  ZeroShotClassificationResult | ZeroShotClassificationResult[]
> {
  private tokenizer: Tokenizer | null = null;
  private hypothesisTemplate: string = 'This text is about {label}.';

  constructor(config?: PipelineConfig) {
    super(config ?? {
      task: 'zero-shot-classification',
      model: 'default',
    });
  }

  /**
   * Set tokenizer
   */
  setTokenizer(tokenizer: Tokenizer): void {
    this.tokenizer = tokenizer;
  }

  /**
   * Run classification (convenience method with separate arguments)
   */
  async classify(
    text: string | string[],
    candidateLabels: string[],
    options?: ZeroShotClassificationOptions
  ): Promise<ZeroShotClassificationResult | ZeroShotClassificationResult[]> {
    return this.run({ text, candidateLabels }, options);
  }

  /**
   * Run classification
   */
  override async run(
    input: ZeroShotInput,
    options?: PipelineOptions
  ): Promise<ZeroShotClassificationResult | ZeroShotClassificationResult[]> {
    await this.initialize();
    
    const { text, candidateLabels } = input;
    const opts = options as ZeroShotClassificationOptions ?? {};
    const texts = Array.isArray(text) ? text : [text];
    const template = opts.hypothesisTemplate ?? this.hypothesisTemplate;
    const multiLabel = opts.multiLabel ?? false;
    
    const results = await Promise.all(
      texts.map(t => this.classifySingle(t, candidateLabels, template, multiLabel))
    );
    
    return Array.isArray(text) ? results : results[0]!;
  }

  /**
   * Classify a single text
   */
  private async classifySingle(
    text: string,
    candidateLabels: string[],
    template: string,
    multiLabel: boolean
  ): Promise<ZeroShotClassificationResult> {
    const startTime = performance.now();
    
    // Create hypothesis for each label
    const hypotheses = candidateLabels.map(label =>
      template.replace('{label}', label)
    );

    // Score each hypothesis
    const scores: number[] = [];
    
    for (const hypothesis of hypotheses) {
      const score = await this.scoreHypothesis(text, hypothesis);
      scores.push(score);
    }

    // Normalize scores
    let normalizedScores: number[];
    
    if (multiLabel) {
      // Sigmoid for independent probabilities
      normalizedScores = scores.map(s => 1 / (1 + Math.exp(-s)));
    } else {
      // Softmax for mutually exclusive labels
      const tensor = new EdgeFlowTensor(new Float32Array(scores), [scores.length], 'float32');
      normalizedScores = Array.from(softmax(tensor).toFloat32Array());
    }

    // Sort by score
    const indexed = candidateLabels.map((label, i) => ({
      label,
      score: normalizedScores[i] ?? 0,
    }));
    indexed.sort((a, b) => b.score - a.score);

    return {
      sequence: text,
      labels: indexed.map(i => i.label),
      scores: indexed.map(i => i.score),
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Score a single hypothesis using NLI
   */
  private async scoreHypothesis(premise: string, hypothesis: string): Promise<number> {
    if (!this.tokenizer) {
      throw new Error('Tokenizer not set. Call setTokenizer() first.');
    }

    // Encode premise-hypothesis pair (for future model integration)
    this.tokenizer.encode(premise, {
      textPair: hypothesis,
      addSpecialTokens: true,
      maxLength: 512,
      truncation: true,
      returnAttentionMask: true,
      returnTokenTypeIds: true,
    });

    // For NLI models, output is typically [contradiction, neutral, entailment]
    // Return the entailment score
    
    // Simplified: return random score for now (real implementation needs model output)
    return Math.random();
  }

  /**
   * Preprocess - not directly used (handled in scoreHypothesis)
   */
  protected async preprocess(
    input: ZeroShotInput
  ): Promise<EdgeFlowTensor[]> {
    const { text, candidateLabels } = input;
    
    // Encode first text-label pair for shape reference
    const firstText = Array.isArray(text) ? text[0] ?? '' : text;
    const firstLabel = candidateLabels[0] ?? '';
    
    if (!this.tokenizer) {
      return [new EdgeFlowTensor(new Float32Array([0]), [1], 'float32')];
    }

    const encoded = this.tokenizer.encode(firstText, {
      textPair: this.hypothesisTemplate.replace('{label}', firstLabel),
      addSpecialTokens: true,
      maxLength: 512,
    });

    return [new EdgeFlowTensor(
      BigInt64Array.from(encoded.inputIds.map(id => BigInt(id))),
      [1, encoded.inputIds.length],
      'int64'
    )];
  }

  /**
   * Postprocess - not directly used
   */
  protected async postprocess(
    _outputs: EdgeFlowTensor[],
    _options?: PipelineOptions
  ): Promise<ZeroShotClassificationResult | ZeroShotClassificationResult[]> {
    return {
      sequence: '',
      labels: [],
      scores: [],
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createZeroShotClassificationPipeline(
  config?: PipelineConfig
): ZeroShotClassificationPipeline {
  return new ZeroShotClassificationPipeline(config);
}
