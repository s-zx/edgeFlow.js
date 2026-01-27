/**
 * edgeFlow.js - Pipeline Exports
 */
import { RuntimeType, QuantizationType } from '../core/types.js';
export { BasePipeline, registerPipeline, getPipelineFactory, SENTIMENT_LABELS, EMOTION_LABELS, IMAGENET_LABELS, type PipelineResult, type TextClassificationResult, type FeatureExtractionResult, type ImageClassificationResult, type ObjectDetectionResult, } from './base.js';
export { TextClassificationPipeline, SentimentAnalysisPipeline, createTextClassificationPipeline, createSentimentAnalysisPipeline, type TextClassificationOptions, } from './text-classification.js';
export { FeatureExtractionPipeline, createFeatureExtractionPipeline, type FeatureExtractionOptions, } from './feature-extraction.js';
export { ImageClassificationPipeline, createImageClassificationPipeline, type ImageClassificationOptions, type ImageInput, } from './image-classification.js';
export { TextGenerationPipeline, createTextGenerationPipeline, type TextGenerationOptions, type TextGenerationResult, type GenerationStreamEvent, } from './text-generation.js';
export { ObjectDetectionPipeline, createObjectDetectionPipeline, COCO_LABELS, type ObjectDetectionOptions, type Detection, type BoundingBox, } from './object-detection.js';
export { AutomaticSpeechRecognitionPipeline, createASRPipeline, type ASROptions, type ASRResult, type WordTimestamp, type ChunkTimestamp, } from './automatic-speech-recognition.js';
export { ZeroShotClassificationPipeline, createZeroShotClassificationPipeline, type ZeroShotClassificationOptions, type ZeroShotClassificationResult, } from './zero-shot-classification.js';
export { QuestionAnsweringPipeline, createQuestionAnsweringPipeline, type QuestionAnsweringOptions, type QuestionAnsweringResult, type QAInput, } from './question-answering.js';
/**
 * Pipeline options for the factory function
 */
export interface PipelineFactoryOptions {
    /** Model ID or URL */
    model?: string;
    /** Runtime to use */
    runtime?: RuntimeType;
    /** Enable caching */
    cache?: boolean;
    /** Quantization type */
    quantization?: QuantizationType;
    /** Custom labels for classification */
    labels?: string[];
}
/**
 * Supported pipeline task mapping
 */
type PipelineTaskMap = {
    'text-classification': TextClassificationPipeline;
    'sentiment-analysis': SentimentAnalysisPipeline;
    'feature-extraction': FeatureExtractionPipeline;
    'image-classification': ImageClassificationPipeline;
    'text-generation': TextGenerationPipeline;
    'object-detection': ObjectDetectionPipeline;
    'automatic-speech-recognition': AutomaticSpeechRecognitionPipeline;
    'zero-shot-classification': ZeroShotClassificationPipeline;
    'question-answering': QuestionAnsweringPipeline;
};
import { TextClassificationPipeline, SentimentAnalysisPipeline } from './text-classification.js';
import { FeatureExtractionPipeline } from './feature-extraction.js';
import { ImageClassificationPipeline } from './image-classification.js';
import { TextGenerationPipeline } from './text-generation.js';
import { ObjectDetectionPipeline } from './object-detection.js';
import { AutomaticSpeechRecognitionPipeline } from './automatic-speech-recognition.js';
import { ZeroShotClassificationPipeline } from './zero-shot-classification.js';
import { QuestionAnsweringPipeline } from './question-answering.js';
/**
 * Create a pipeline for a specific task
 *
 * @example
 * ```typescript
 * // Create a sentiment analysis pipeline
 * const sentiment = await pipeline('sentiment-analysis');
 * const result = await sentiment.run('I love this product!');
 *
 * // Create an image classifier with custom model
 * const classifier = await pipeline('image-classification', {
 *   model: 'https://example.com/model.bin',
 * });
 * ```
 */
export declare function pipeline<T extends keyof PipelineTaskMap>(task: T, options?: PipelineFactoryOptions): Promise<PipelineTaskMap[T]>;
/**
 * Create multiple pipelines at once
 */
export declare function createPipelines<T extends (keyof PipelineTaskMap)[]>(tasks: T, options?: PipelineFactoryOptions): Promise<{
    [K in T[number]]: PipelineTaskMap[K];
}>;
//# sourceMappingURL=index.d.ts.map