/**
 * edgeFlow.js - Question Answering Pipeline
 *
 * Extract answers from context given a question.
 */
import { BasePipeline, PipelineResult } from './base.js';
import { EdgeFlowTensor } from '../core/tensor.js';
import { PipelineConfig, PipelineOptions } from '../core/types.js';
import { Tokenizer } from '../utils/tokenizer.js';
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
export declare class QuestionAnsweringPipeline extends BasePipeline<QAInput | QAInput[], QuestionAnsweringResult | QuestionAnsweringResult[]> {
    private tokenizer;
    constructor(config?: PipelineConfig);
    /**
     * Set tokenizer
     */
    setTokenizer(tokenizer: Tokenizer): void;
    /**
     * Run question answering
     */
    run(input: QAInput | QAInput[], options?: QuestionAnsweringOptions): Promise<QuestionAnsweringResult | QuestionAnsweringResult[]>;
    /**
     * Answer a single question
     */
    private answerQuestion;
    /**
     * Find best answer span
     */
    private findBestAnswer;
    /**
     * Preprocess QA input
     */
    protected preprocess(input: QAInput | QAInput[]): Promise<EdgeFlowTensor[]>;
    /**
     * Postprocess model output
     */
    protected postprocess(outputs: EdgeFlowTensor[], _options?: PipelineOptions): Promise<QuestionAnsweringResult | QuestionAnsweringResult[]>;
}
export declare function createQuestionAnsweringPipeline(config?: PipelineConfig): QuestionAnsweringPipeline;
//# sourceMappingURL=question-answering.d.ts.map