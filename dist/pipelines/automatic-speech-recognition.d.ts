/**
 * edgeFlow.js - Automatic Speech Recognition Pipeline
 *
 * Transcribe audio to text using Whisper and other ASR models.
 */
import { BasePipeline, PipelineResult } from './base.js';
import { EdgeFlowTensor } from '../core/tensor.js';
import { PipelineConfig, PipelineOptions } from '../core/types.js';
import { type AudioInput } from '../utils/preprocessor.js';
import { Tokenizer } from '../utils/tokenizer.js';
/**
 * ASR options
 */
export interface ASROptions extends PipelineOptions {
    /** Target language (for multilingual models) */
    language?: string;
    /** Task: transcribe or translate */
    task?: 'transcribe' | 'translate';
    /** Return timestamps */
    returnTimestamps?: boolean | 'word' | 'chunk';
    /** Maximum duration to process (in seconds) */
    maxDuration?: number;
    /** Chunk duration for long audio (in seconds) */
    chunkDuration?: number;
    /** Overlap between chunks (in seconds) */
    chunkOverlap?: number;
}
/**
 * Word-level timestamp
 */
export interface WordTimestamp {
    word: string;
    start: number;
    end: number;
    confidence?: number;
}
/**
 * Chunk-level timestamp
 */
export interface ChunkTimestamp {
    text: string;
    start: number;
    end: number;
}
/**
 * ASR result
 */
export interface ASRResult extends PipelineResult {
    /** Transcribed text */
    text: string;
    /** Detected language */
    language?: string;
    /** Word-level timestamps */
    words?: WordTimestamp[];
    /** Chunk-level timestamps */
    chunks?: ChunkTimestamp[];
}
/**
 * AutomaticSpeechRecognitionPipeline - Transcribe audio to text
 *
 * @example
 * ```typescript
 * const asr = await pipeline('automatic-speech-recognition');
 *
 * // Simple transcription
 * const result = await asr.run('audio.mp3');
 * console.log(result.text);
 *
 * // With timestamps
 * const result = await asr.run('audio.mp3', { returnTimestamps: true });
 * for (const chunk of result.chunks) {
 *   console.log(`[${chunk.start.toFixed(2)}s] ${chunk.text}`);
 * }
 * ```
 */
export declare class AutomaticSpeechRecognitionPipeline extends BasePipeline<AudioInput | AudioInput[], ASRResult | ASRResult[]> {
    private audioPreprocessor;
    private tokenizer;
    constructor(config?: PipelineConfig);
    /**
     * Set tokenizer for decoding
     */
    setTokenizer(tokenizer: Tokenizer): void;
    /**
     * Preprocess audio input
     */
    protected preprocess(input: AudioInput | AudioInput[]): Promise<EdgeFlowTensor[]>;
    /**
     * Postprocess model output
     */
    protected postprocess(outputs: EdgeFlowTensor[], options?: PipelineOptions): Promise<ASRResult | ASRResult[]>;
    /**
     * Decode model output to text
     */
    private decodeOutput;
    /**
     * Extract timestamps from output
     */
    private extractTimestamps;
    /**
     * Process long audio in chunks
     */
    processLongAudio(audio: AudioInput, options?: ASROptions): Promise<ASRResult>;
}
export declare function createASRPipeline(config?: PipelineConfig): AutomaticSpeechRecognitionPipeline;
//# sourceMappingURL=automatic-speech-recognition.d.ts.map