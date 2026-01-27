/**
 * edgeFlow.js - Object Detection Pipeline
 *
 * Detect objects in images with bounding boxes and class labels.
 */
import { BasePipeline, ObjectDetectionResult } from './base.js';
import { EdgeFlowTensor } from '../core/tensor.js';
import { PipelineConfig, PipelineOptions } from '../core/types.js';
import { type ImageInput } from '../utils/preprocessor.js';
/**
 * Object detection options
 */
export interface ObjectDetectionOptions extends PipelineOptions {
    /** Confidence threshold (0-1, default: 0.5) */
    threshold?: number;
    /** Maximum number of detections to return */
    topK?: number;
    /** Perform non-max suppression */
    nms?: boolean;
    /** IoU threshold for NMS (default: 0.5) */
    iouThreshold?: number;
}
/**
 * Bounding box format
 */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Detection result with confidence
 */
export interface Detection extends ObjectDetectionResult {
    /** Class index */
    classId: number;
    /** Normalized bounding box (0-1 coordinates) */
    boxNormalized: BoundingBox;
}
export declare const COCO_LABELS: string[];
/**
 * ObjectDetectionPipeline - Detect objects in images
 *
 * @example
 * ```typescript
 * const detector = await pipeline('object-detection');
 * const detections = await detector.run('image.jpg', { threshold: 0.7 });
 *
 * for (const det of detections) {
 *   console.log(`${det.label}: ${det.score.toFixed(2)} at`, det.box);
 * }
 * ```
 */
export declare class ObjectDetectionPipeline extends BasePipeline<ImageInput | ImageInput[], Detection[]> {
    private preprocessor;
    private labels;
    constructor(config?: PipelineConfig, labels?: string[]);
    /**
     * Set custom labels
     */
    setLabels(labels: string[]): void;
    /**
     * Preprocess image for detection
     */
    protected preprocess(input: ImageInput | ImageInput[]): Promise<EdgeFlowTensor[]>;
    /**
     * Postprocess detection outputs
     */
    protected postprocess(outputs: EdgeFlowTensor[], options?: PipelineOptions): Promise<Detection[]>;
    /**
     * Parse raw model output into detections
     */
    private parseDetections;
    /**
     * Non-maximum suppression
     */
    private nonMaxSuppression;
    /**
     * Compute Intersection over Union
     */
    private computeIoU;
}
export declare function createObjectDetectionPipeline(config?: PipelineConfig, labels?: string[]): ObjectDetectionPipeline;
//# sourceMappingURL=object-detection.d.ts.map