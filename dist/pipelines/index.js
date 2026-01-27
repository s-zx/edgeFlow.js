/**
 * edgeFlow.js - Pipeline Exports
 */
// Base
export { BasePipeline, registerPipeline, getPipelineFactory, SENTIMENT_LABELS, EMOTION_LABELS, IMAGENET_LABELS, } from './base.js';
// Text Classification
export { TextClassificationPipeline, SentimentAnalysisPipeline, createTextClassificationPipeline, createSentimentAnalysisPipeline, } from './text-classification.js';
// Feature Extraction
export { FeatureExtractionPipeline, createFeatureExtractionPipeline, } from './feature-extraction.js';
// Image Classification
export { ImageClassificationPipeline, createImageClassificationPipeline, } from './image-classification.js';
// Text Generation
export { TextGenerationPipeline, createTextGenerationPipeline, } from './text-generation.js';
// Object Detection
export { ObjectDetectionPipeline, createObjectDetectionPipeline, COCO_LABELS, } from './object-detection.js';
// Automatic Speech Recognition
export { AutomaticSpeechRecognitionPipeline, createASRPipeline, } from './automatic-speech-recognition.js';
// Zero-shot Classification
export { ZeroShotClassificationPipeline, createZeroShotClassificationPipeline, } from './zero-shot-classification.js';
// Question Answering
export { QuestionAnsweringPipeline, createQuestionAnsweringPipeline, } from './question-answering.js';
// Import pipeline classes
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
export async function pipeline(task, options) {
    const config = {
        task: task,
        model: options?.model ?? 'default',
        runtime: options?.runtime,
        cache: options?.cache ?? true,
        quantization: options?.quantization,
    };
    let pipelineInstance;
    switch (task) {
        case 'text-classification':
            pipelineInstance = new TextClassificationPipeline(config, options?.labels);
            break;
        case 'sentiment-analysis':
            pipelineInstance = new SentimentAnalysisPipeline(config);
            break;
        case 'feature-extraction':
            pipelineInstance = new FeatureExtractionPipeline(config);
            break;
        case 'image-classification':
            pipelineInstance = new ImageClassificationPipeline(config, options?.labels);
            break;
        case 'text-generation':
            pipelineInstance = new TextGenerationPipeline(config);
            break;
        case 'object-detection':
            pipelineInstance = new ObjectDetectionPipeline(config, options?.labels);
            break;
        case 'automatic-speech-recognition':
            pipelineInstance = new AutomaticSpeechRecognitionPipeline(config);
            break;
        case 'zero-shot-classification':
            pipelineInstance = new ZeroShotClassificationPipeline(config);
            break;
        case 'question-answering':
            pipelineInstance = new QuestionAnsweringPipeline(config);
            break;
        default:
            throw new Error(`Unknown pipeline task: ${task}`);
    }
    // Initialize the pipeline
    await pipelineInstance.initialize();
    return pipelineInstance;
}
/**
 * Create multiple pipelines at once
 */
export async function createPipelines(tasks, options) {
    const pipelines = await Promise.all(tasks.map(task => pipeline(task, options)));
    const result = {};
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        result[task] = pipelines[i];
    }
    return result;
}
//# sourceMappingURL=index.js.map