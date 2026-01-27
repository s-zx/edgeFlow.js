/**
 * edgeFlow.js - Tokenizer
 *
 * Full-featured tokenizer supporting HuggingFace tokenizer.json format.
 * Supports BPE, WordPiece, and Unigram tokenization.
 */
import { TokenizerConfig, TokenizedOutput } from '../core/types.js';
export type TokenizerModel = 'BPE' | 'WordPiece' | 'Unigram' | 'basic';
export interface TokenizerOptions {
    addSpecialTokens?: boolean;
    maxLength?: number;
    padding?: 'max_length' | 'longest' | 'do_not_pad';
    truncation?: boolean;
    returnAttentionMask?: boolean;
    returnTokenTypeIds?: boolean;
    textPair?: string;
}
/**
 * HuggingFace tokenizer.json format
 */
interface HFTokenizerJSON {
    version?: string;
    truncation?: {
        max_length: number;
        strategy: string;
    };
    padding?: {
        strategy: string;
        pad_id: number;
        pad_token: string;
    };
    added_tokens?: Array<{
        id: number;
        content: string;
        single_word: boolean;
        lstrip: boolean;
        rstrip: boolean;
        normalized: boolean;
        special: boolean;
    }>;
    normalizer?: {
        type: string;
        lowercase?: boolean;
        strip_accents?: boolean;
        [key: string]: unknown;
    };
    pre_tokenizer?: {
        type: string;
        [key: string]: unknown;
    };
    post_processor?: {
        type: string;
        single?: Array<{
            id: string;
            type_id: number;
        } | {
            SpecialToken: {
                id: string;
                type_id: number;
            };
        } | {
            Sequence: {
                id: string;
                type_id: number;
            };
        }>;
        pair?: Array<{
            id: string;
            type_id: number;
        } | {
            SpecialToken: {
                id: string;
                type_id: number;
            };
        } | {
            Sequence: {
                id: string;
                type_id: number;
            };
        }>;
        special_tokens?: Record<string, {
            id: string;
            ids: number[];
            tokens: string[];
        }>;
        [key: string]: unknown;
    };
    decoder?: {
        type: string;
        [key: string]: unknown;
    };
    model: {
        type: string;
        vocab?: Record<string, number>;
        merges?: string[];
        unk_token?: string;
        continuing_subword_prefix?: string;
        end_of_word_suffix?: string;
        fuse_unk?: boolean;
        byte_fallback?: boolean;
        [key: string]: unknown;
    };
}
/**
 * Tokenizer - Full-featured tokenizer supporting HuggingFace format
 */
export declare class Tokenizer {
    private vocab;
    private reverseVocab;
    private merges;
    private addedTokens;
    private specialTokens;
    private modelType;
    private unkToken;
    private continuingSubwordPrefix;
    private padTokenId;
    private unkTokenId;
    private clsTokenId?;
    private sepTokenId?;
    private maskTokenId?;
    private bosTokenId?;
    private eosTokenId?;
    private maxLength;
    private doLowerCase;
    private stripAccents;
    private postProcessor?;
    private byteEncoder;
    private byteDecoder;
    constructor();
    /**
     * Initialize byte encoder/decoder for BPE
     */
    private initByteEncoder;
    /**
     * Load from HuggingFace tokenizer.json
     */
    static fromJSON(json: HFTokenizerJSON | string): Promise<Tokenizer>;
    /**
     * Load from URL (tokenizer.json)
     */
    static fromUrl(url: string): Promise<Tokenizer>;
    /**
     * Load from HuggingFace Hub
     */
    static fromHuggingFace(modelId: string, options?: {
        revision?: string;
    }): Promise<Tokenizer>;
    /**
     * Normalize text
     */
    private normalize;
    /**
     * Pre-tokenize text (split into words)
     */
    private preTokenize;
    /**
     * Encode text to bytes (for BPE)
     */
    private textToBytes;
    /**
     * Decode bytes to text (for BPE)
     */
    private bytesToText;
    /**
     * Get BPE pairs from word
     */
    private getPairs;
    /**
     * Apply BPE to a word
     */
    private bpe;
    /**
     * WordPiece tokenization
     */
    private wordPiece;
    /**
     * Tokenize a single word
     */
    private tokenizeWord;
    /**
     * Main tokenization
     */
    private tokenize;
    /**
     * Convert tokens to IDs
     */
    private convertTokensToIds;
    /**
     * Convert IDs to tokens
     */
    private convertIdsToTokens;
    /**
     * Apply post-processing (add special tokens)
     */
    private postProcess;
    /**
     * Encode text
     */
    encode(text: string, options?: TokenizerOptions): TokenizedOutput;
    /**
     * Batch encode
     */
    encodeBatch(texts: string[], options?: TokenizerOptions): TokenizedOutput[];
    /**
     * Decode IDs to text
     */
    decode(ids: number[], skipSpecialTokens?: boolean): string;
    /**
     * Decode batch
     */
    decodeBatch(batchIds: number[][], skipSpecialTokens?: boolean): string[];
    /**
     * Get vocabulary size
     */
    get vocabSize(): number;
    /**
     * Get special token IDs
     */
    getSpecialTokenIds(): {
        padTokenId: number;
        unkTokenId: number;
        clsTokenId?: number;
        sepTokenId?: number;
        maskTokenId?: number;
        bosTokenId?: number;
        eosTokenId?: number;
    };
    /**
     * Get config
     */
    getConfig(): TokenizerConfig;
    /**
     * Check if token is special
     */
    isSpecialToken(token: string): boolean;
    /**
     * Get token ID
     */
    getTokenId(token: string): number | undefined;
    /**
     * Get token from ID
     */
    getToken(id: number): string | undefined;
}
/**
 * Create a basic English tokenizer (for testing)
 */
export declare function createBasicTokenizer(): Tokenizer;
/**
 * Load tokenizer from URL
 */
export declare function loadTokenizer(url: string): Promise<Tokenizer>;
/**
 * Load tokenizer from HuggingFace Hub
 */
export declare function loadTokenizerFromHub(modelId: string, options?: {
    revision?: string;
}): Promise<Tokenizer>;
export {};
//# sourceMappingURL=tokenizer.d.ts.map