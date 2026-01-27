/**
 * edgeFlow.js - Question Answering Pipeline
 * 
 * Extract answers from context given a question.
 */

import { BasePipeline, PipelineResult } from './base.js';
import { EdgeFlowTensor, softmax } from '../core/tensor.js';
import { PipelineConfig, PipelineOptions } from '../core/types.js';
import { Tokenizer } from '../utils/tokenizer.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Question answering input
 */
export interface QAInput {
  question: string;
  context: string;
}

/**
 * Question answering options
 */
export interface QuestionAnsweringOptions extends PipelineOptions {
  /** Maximum answer length in tokens */
  maxAnswerLength?: number;
  /** Maximum question length */
  maxQuestionLength?: number;
  /** Top-k answers to return */
  topK?: number;
  /** Minimum confidence threshold */
  threshold?: number;
  /** Handle impossible questions */
  handleImpossible?: boolean;
}

/**
 * Question answering result
 */
export interface QuestionAnsweringResult extends PipelineResult {
  /** Answer text */
  answer: string;
  /** Confidence score */
  score: number;
  /** Start character index in context */
  start: number;
  /** End character index in context */
  end: number;
}

// ============================================================================
// Question Answering Pipeline
// ============================================================================

/**
 * QuestionAnsweringPipeline - Extractive QA
 * 
 * @example
 * ```typescript
 * const qa = await pipeline('question-answering');
 * 
 * const result = await qa.run({
 *   question: 'What is the capital of France?',
 *   context: 'Paris is the capital and largest city of France.'
 * });
 * 
 * console.log(result.answer); // 'Paris'
 * ```
 */
export class QuestionAnsweringPipeline extends BasePipeline<
  QAInput | QAInput[],
  QuestionAnsweringResult | QuestionAnsweringResult[]
> {
  private tokenizer: Tokenizer | null = null;

  constructor(config?: PipelineConfig) {
    super(config ?? {
      task: 'question-answering',
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
   * Run question answering
   */
  override async run(
    input: QAInput | QAInput[],
    options?: QuestionAnsweringOptions
  ): Promise<QuestionAnsweringResult | QuestionAnsweringResult[]> {
    await this.initialize();
    
    const inputs = Array.isArray(input) ? input : [input];
    const results = await Promise.all(
      inputs.map(i => this.answerQuestion(i, options ?? {}))
    );
    
    return Array.isArray(input) ? results : results[0]!;
  }

  /**
   * Answer a single question
   */
  private async answerQuestion(
    input: QAInput,
    options: QuestionAnsweringOptions
  ): Promise<QuestionAnsweringResult> {
    const startTime = performance.now();
    
    if (!this.tokenizer) {
      throw new Error('Tokenizer not set. Call setTokenizer() first.');
    }

    const { question, context } = input;
    const {
      maxAnswerLength = 30,
    } = options;

    // Encode question and context
    const encoded = this.tokenizer.encode(question, {
      textPair: context,
      addSpecialTokens: true,
      maxLength: 512,
      truncation: true,
      returnAttentionMask: true,
      returnTokenTypeIds: true,
    });
    
    // Simplified: find answer in context
    const answer = this.findBestAnswer(
      context,
      question,
      encoded.inputIds,
      maxAnswerLength
    );

    return {
      answer: answer.text,
      score: answer.score,
      start: answer.start,
      end: answer.end,
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Find best answer span
   */
  private findBestAnswer(
    context: string,
    question: string,
    _tokenIds: number[],
    maxLength: number
  ): { text: string; score: number; start: number; end: number } {
    // Simplified answer extraction
    // Real implementation would use model's start/end logits
    
    // Find common words between question and context
    const questionWords = question.toLowerCase().split(/\s+/);
    const contextSentences = context.split(/[.!?]+/).filter(s => s.trim());
    
    let bestSentence = '';
    let bestScore = 0;
    let bestStart = 0;
    
    for (const sentence of contextSentences) {
      const words = sentence.toLowerCase().split(/\s+/);
      let score = 0;
      
      for (const qWord of questionWords) {
        if (words.some(w => w.includes(qWord) || qWord.includes(w))) {
          score += 1;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence.trim();
        bestStart = context.indexOf(sentence.trim());
      }
    }

    // Extract a shorter answer from the sentence
    const words = bestSentence.split(/\s+/);
    if (words.length > maxLength) {
      bestSentence = words.slice(0, maxLength).join(' ');
    }

    const normalizedScore = questionWords.length > 0
      ? bestScore / questionWords.length
      : 0;

    return {
      text: bestSentence || 'No answer found',
      score: Math.min(normalizedScore, 1.0),
      start: bestStart >= 0 ? bestStart : 0,
      end: bestStart >= 0 ? bestStart + bestSentence.length : 0,
    };
  }

  /**
   * Preprocess QA input
   */
  protected async preprocess(input: QAInput | QAInput[]): Promise<EdgeFlowTensor[]> {
    if (!this.tokenizer) {
      return [new EdgeFlowTensor(new Float32Array([0]), [1], 'float32')];
    }

    const qaInput = Array.isArray(input) ? input[0]! : input;
    
    const encoded = this.tokenizer.encode(qaInput.question, {
      textPair: qaInput.context,
      addSpecialTokens: true,
      maxLength: 512,
      truncation: true,
      returnAttentionMask: true,
      returnTokenTypeIds: true,
    });

    return [
      new EdgeFlowTensor(
        BigInt64Array.from(encoded.inputIds.map(id => BigInt(id))),
        [1, encoded.inputIds.length],
        'int64'
      ),
      new EdgeFlowTensor(
        BigInt64Array.from(encoded.attentionMask.map(m => BigInt(m))),
        [1, encoded.attentionMask.length],
        'int64'
      ),
    ];
  }

  /**
   * Postprocess model output
   */
  protected async postprocess(
    outputs: EdgeFlowTensor[],
    _options?: PipelineOptions
  ): Promise<QuestionAnsweringResult | QuestionAnsweringResult[]> {
    // Extract start and end positions from model output
    if (outputs.length < 2) {
      return { answer: '', score: 0, start: 0, end: 0 };
    }

    const startLogits = outputs[0]!.toFloat32Array();
    const endLogits = outputs[1]!.toFloat32Array();
    const seqLen = startLogits.length;

    // Apply softmax
    const startProbs = softmax(new EdgeFlowTensor(startLogits, [seqLen], 'float32')).toFloat32Array();
    const endProbs = softmax(new EdgeFlowTensor(endLogits, [seqLen], 'float32')).toFloat32Array();

    // Find best start/end positions
    let bestStart = 0;
    let bestEnd = 0;
    let bestScore = 0;

    for (let start = 0; start < seqLen; start++) {
      for (let end = start; end < Math.min(start + 30, seqLen); end++) {
        const score = (startProbs[start] ?? 0) * (endProbs[end] ?? 0);
        if (score > bestScore) {
          bestScore = score;
          bestStart = start;
          bestEnd = end;
        }
      }
    }

    return {
      answer: '', // Would need tokenizer to decode
      score: bestScore,
      start: bestStart,
      end: bestEnd,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createQuestionAnsweringPipeline(
  config?: PipelineConfig
): QuestionAnsweringPipeline {
  return new QuestionAnsweringPipeline(config);
}
