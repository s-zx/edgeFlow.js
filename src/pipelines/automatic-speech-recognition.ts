/**
 * edgeFlow.js - Automatic Speech Recognition Pipeline
 * 
 * Transcribe audio to text using Whisper and other ASR models.
 */

import { BasePipeline, PipelineResult } from './base.js';
import { EdgeFlowTensor } from '../core/tensor.js';
import { PipelineConfig, PipelineOptions } from '../core/types.js';
import { AudioPreprocessor, type AudioInput } from '../utils/preprocessor.js';
import { Tokenizer } from '../utils/tokenizer.js';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// ASR Pipeline
// ============================================================================

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
export class AutomaticSpeechRecognitionPipeline extends BasePipeline<AudioInput | AudioInput[], ASRResult | ASRResult[]> {
  private audioPreprocessor: AudioPreprocessor;
  private tokenizer: Tokenizer | null = null;

  constructor(config?: PipelineConfig) {
    super(config ?? {
      task: 'automatic-speech-recognition',
      model: 'default',
    });
    
    // Whisper-style preprocessing
    this.audioPreprocessor = new AudioPreprocessor({
      sampleRate: 16000,
      nMels: 80,
      nFft: 400,
      hopLength: 160,
      maxDuration: 30,
    });
  }

  /**
   * Set tokenizer for decoding
   */
  setTokenizer(tokenizer: Tokenizer): void {
    this.tokenizer = tokenizer;
  }

  /**
   * Preprocess audio input
   */
  protected async preprocess(input: AudioInput | AudioInput[]): Promise<EdgeFlowTensor[]> {
    const inputs = Array.isArray(input) ? input : [input];
    
    const tensors = await Promise.all(
      inputs.map(audio => this.audioPreprocessor.process(audio))
    );

    // Stack into batch
    if (tensors.length === 1) {
      const t = tensors[0]!;
      return [new EdgeFlowTensor(
        t.toFloat32Array(),
        [1, ...t.shape],
        'float32'
      )];
    }

    // TODO: Proper batching with padding
    return tensors;
  }

  /**
   * Postprocess model output
   */
  protected async postprocess(
    outputs: EdgeFlowTensor[],
    options?: PipelineOptions
  ): Promise<ASRResult | ASRResult[]> {
    const opts = options as ASROptions ?? {};
    const returnTimestamps = opts.returnTimestamps ?? false;

    if (!outputs[0]) {
      return { text: '' };
    }

    const outputData = outputs[0].toFloat32Array();
    const shape = outputs[0].shape;

    // Decode tokens to text
    const text = this.decodeOutput(outputData, shape);

    const result: ASRResult = { text };

    // Add timestamps if requested
    if (returnTimestamps) {
      result.chunks = this.extractTimestamps(outputData, shape, text);
    }

    return result;
  }

  /**
   * Decode model output to text
   */
  private decodeOutput(data: Float32Array, shape: readonly number[]): string {
    // Get token IDs from output
    const seqLen = shape[1] ?? data.length;
    const vocabSize = shape[2] ?? 1;
    
    const tokenIds: number[] = [];
    
    if (vocabSize > 1) {
      // Output is logits: [batch, seq_len, vocab_size]
      for (let i = 0; i < seqLen; i++) {
        const offset = i * vocabSize;
        let maxIdx = 0;
        let maxVal = data[offset] ?? -Infinity;
        
        for (let j = 1; j < vocabSize; j++) {
          if ((data[offset + j] ?? -Infinity) > maxVal) {
            maxVal = data[offset + j] ?? -Infinity;
            maxIdx = j;
          }
        }
        tokenIds.push(maxIdx);
      }
    } else {
      // Output is token IDs directly
      for (let i = 0; i < data.length; i++) {
        tokenIds.push(Math.round(data[i] ?? 0));
      }
    }

    // Decode using tokenizer
    if (this.tokenizer) {
      return this.tokenizer.decode(tokenIds, true);
    }

    // Fallback: return raw token IDs
    return tokenIds.join(' ');
  }

  /**
   * Extract timestamps from output
   */
  private extractTimestamps(
    _data: Float32Array,
    _shape: readonly number[],
    text: string
  ): ChunkTimestamp[] {
    // Simplified: split text into chunks
    // Real implementation would use model-specific timestamp tokens
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const chunks: ChunkTimestamp[] = [];
    
    const wordsPerSecond = 2.5; // Rough estimate
    let chunkText = '';
    let chunkStart = 0;
    
    for (let i = 0; i < words.length; i++) {
      chunkText += (chunkText ? ' ' : '') + words[i];
      
      // Create chunk every ~5 words
      if ((i + 1) % 5 === 0 || i === words.length - 1) {
        const duration = chunkText.split(/\s+/).length / wordsPerSecond;
        chunks.push({
          text: chunkText,
          start: chunkStart,
          end: chunkStart + duration,
        });
        chunkStart = chunkStart + duration;
        chunkText = '';
      }
    }

    return chunks;
  }

  /**
   * Process long audio in chunks
   */
  async processLongAudio(
    audio: AudioInput,
    options: ASROptions = {}
  ): Promise<ASRResult> {
    const chunkDuration = options.chunkDuration ?? 30;
    const chunkOverlap = options.chunkOverlap ?? 5;
    
    // Get raw audio data
    const rawTensor = await this.audioPreprocessor.processRaw(audio);
    const audioData = rawTensor.toFloat32Array();
    const sampleRate = 16000;
    
    const chunkSamples = chunkDuration * sampleRate;
    const overlapSamples = chunkOverlap * sampleRate;
    const stepSamples = chunkSamples - overlapSamples;
    
    const chunks: ASRResult[] = [];
    
    for (let start = 0; start < audioData.length; start += stepSamples) {
      const end = Math.min(start + chunkSamples, audioData.length);
      const chunkAudio = audioData.slice(start, end);
      
      const chunkResult = await this.run(
        new Float32Array(chunkAudio),
        options
      ) as ASRResult;
      
      // Add time offset to chunks
      if (chunkResult.chunks) {
        const timeOffset = start / sampleRate;
        chunkResult.chunks = chunkResult.chunks.map(c => ({
          ...c,
          start: c.start + timeOffset,
          end: c.end + timeOffset,
        }));
      }
      
      chunks.push(chunkResult);
    }

    // Merge results
    const mergedText = chunks.map(c => c.text).join(' ');
    const mergedChunks = chunks.flatMap(c => c.chunks ?? []);

    return {
      text: mergedText,
      chunks: mergedChunks,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createASRPipeline(config?: PipelineConfig): AutomaticSpeechRecognitionPipeline {
  return new AutomaticSpeechRecognitionPipeline(config);
}
