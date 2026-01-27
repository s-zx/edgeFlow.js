/**
 * edgeFlow.js - Tokenizer
 *
 * Full-featured tokenizer supporting HuggingFace tokenizer.json format.
 * Supports BPE, WordPiece, and Unigram tokenization.
 */
import { EdgeFlowError, ErrorCodes, } from '../core/types.js';
// ============================================================================
// Tokenizer Implementation
// ============================================================================
/**
 * Tokenizer - Full-featured tokenizer supporting HuggingFace format
 */
export class Tokenizer {
    vocab = new Map();
    reverseVocab = new Map();
    merges = new Map();
    addedTokens = new Map();
    specialTokens = new Set();
    modelType = 'BPE';
    unkToken = '[UNK]';
    continuingSubwordPrefix = '##';
    // Special token IDs
    padTokenId = 0;
    unkTokenId = 0;
    clsTokenId;
    sepTokenId;
    maskTokenId;
    bosTokenId;
    eosTokenId;
    // Config
    maxLength = 512;
    doLowerCase = false;
    stripAccents = false;
    // Post-processor config
    postProcessor;
    // Byte encoder for BPE
    byteEncoder = new Map();
    byteDecoder = new Map();
    constructor() {
        this.initByteEncoder();
    }
    /**
     * Initialize byte encoder/decoder for BPE
     */
    initByteEncoder() {
        const bytes = [];
        // Printable ASCII
        for (let i = 33; i <= 126; i++)
            bytes.push(i);
        for (let i = 161; i <= 172; i++)
            bytes.push(i);
        for (let i = 174; i <= 255; i++)
            bytes.push(i);
        const chars = [...bytes];
        let n = 0;
        for (let i = 0; i < 256; i++) {
            if (!bytes.includes(i)) {
                bytes.push(i);
                chars.push(256 + n);
                n++;
            }
        }
        for (let i = 0; i < bytes.length; i++) {
            const byte = bytes[i];
            const char = String.fromCharCode(chars[i]);
            this.byteEncoder.set(byte, char);
            this.byteDecoder.set(char, byte);
        }
    }
    /**
     * Load from HuggingFace tokenizer.json
     */
    static async fromJSON(json) {
        const tokenizer = new Tokenizer();
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        // Load model config
        if (data.model) {
            tokenizer.modelType = data.model.type;
            // Load vocabulary
            if (data.model.vocab) {
                for (const [token, id] of Object.entries(data.model.vocab)) {
                    tokenizer.vocab.set(token, id);
                    tokenizer.reverseVocab.set(id, token);
                }
            }
            // Load merges for BPE
            if (data.model.merges) {
                for (let i = 0; i < data.model.merges.length; i++) {
                    tokenizer.merges.set(data.model.merges[i], i);
                }
            }
            // Model-specific config
            tokenizer.unkToken = data.model.unk_token ?? '[UNK]';
            tokenizer.continuingSubwordPrefix = data.model.continuing_subword_prefix ?? '##';
        }
        // Load added tokens
        if (data.added_tokens) {
            for (const token of data.added_tokens) {
                tokenizer.addedTokens.set(token.content, token.id);
                tokenizer.reverseVocab.set(token.id, token.content);
                if (token.special) {
                    tokenizer.specialTokens.add(token.content);
                }
                // Detect special token types
                const content = token.content.toLowerCase();
                if (content.includes('pad'))
                    tokenizer.padTokenId = token.id;
                if (content.includes('unk'))
                    tokenizer.unkTokenId = token.id;
                if (content.includes('cls') || content === '[cls]')
                    tokenizer.clsTokenId = token.id;
                if (content.includes('sep') || content === '[sep]')
                    tokenizer.sepTokenId = token.id;
                if (content.includes('mask'))
                    tokenizer.maskTokenId = token.id;
                if (content.includes('bos') || content === '<s>')
                    tokenizer.bosTokenId = token.id;
                if (content.includes('eos') || content === '</s>')
                    tokenizer.eosTokenId = token.id;
            }
        }
        // Load normalizer config
        if (data.normalizer) {
            tokenizer.doLowerCase = data.normalizer.lowercase ?? false;
            tokenizer.stripAccents = data.normalizer.strip_accents ?? false;
        }
        // Load truncation config
        if (data.truncation) {
            tokenizer.maxLength = data.truncation.max_length;
        }
        // Load post-processor
        if (data.post_processor) {
            tokenizer.postProcessor = data.post_processor;
        }
        return tokenizer;
    }
    /**
     * Load from URL (tokenizer.json)
     */
    static async fromUrl(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new EdgeFlowError(`Failed to load tokenizer from ${url}: ${response.status}`, ErrorCodes.MODEL_NOT_FOUND);
        }
        const json = await response.json();
        return Tokenizer.fromJSON(json);
    }
    /**
     * Load from HuggingFace Hub
     */
    static async fromHuggingFace(modelId, options) {
        const revision = options?.revision ?? 'main';
        const url = `https://huggingface.co/${modelId}/resolve/${revision}/tokenizer.json`;
        return Tokenizer.fromUrl(url);
    }
    /**
     * Normalize text
     */
    normalize(text) {
        let result = text;
        if (this.doLowerCase) {
            result = result.toLowerCase();
        }
        if (this.stripAccents) {
            result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
        // Normalize whitespace
        result = result.replace(/\s+/g, ' ').trim();
        return result;
    }
    /**
     * Pre-tokenize text (split into words)
     */
    preTokenize(text) {
        // GPT-2 style: split on whitespace and punctuation, keeping them
        const pattern = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
        const matches = text.match(pattern);
        return matches ?? [text];
    }
    /**
     * Encode text to bytes (for BPE)
     */
    textToBytes(text) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        return Array.from(bytes).map(b => this.byteEncoder.get(b) ?? '').join('');
    }
    /**
     * Decode bytes to text (for BPE)
     */
    bytesToText(text) {
        const bytes = new Uint8Array(text.split('').map(c => this.byteDecoder.get(c) ?? 0));
        const decoder = new TextDecoder('utf-8', { fatal: false });
        return decoder.decode(bytes);
    }
    /**
     * Get BPE pairs from word
     */
    getPairs(word) {
        const pairs = new Set();
        for (let i = 0; i < word.length - 1; i++) {
            pairs.add(`${word[i]} ${word[i + 1]}`);
        }
        return pairs;
    }
    /**
     * Apply BPE to a word
     */
    bpe(token) {
        if (this.vocab.has(token)) {
            return [token];
        }
        let word = token.split('');
        let pairs = this.getPairs(word);
        if (pairs.size === 0) {
            return [token];
        }
        while (true) {
            // Find the pair with lowest merge rank
            let minPair = null;
            let minRank = Infinity;
            for (const pair of pairs) {
                const rank = this.merges.get(pair);
                if (rank !== undefined && rank < minRank) {
                    minRank = rank;
                    minPair = pair;
                }
            }
            if (minPair === null)
                break;
            const parts = minPair.split(' ');
            const first = parts[0];
            const second = parts[1];
            if (!first || !second)
                break;
            const newWord = [];
            let i = 0;
            while (i < word.length) {
                const j = word.indexOf(first, i);
                if (j === -1) {
                    newWord.push(...word.slice(i));
                    break;
                }
                newWord.push(...word.slice(i, j));
                if (word[j] === first && j < word.length - 1 && word[j + 1] === second) {
                    newWord.push(first + second);
                    i = j + 2;
                }
                else {
                    newWord.push(word[j]);
                    i = j + 1;
                }
            }
            word = newWord;
            if (word.length === 1)
                break;
            pairs = this.getPairs(word);
        }
        return word;
    }
    /**
     * WordPiece tokenization
     */
    wordPiece(word) {
        if (this.vocab.has(word)) {
            return [word];
        }
        const tokens = [];
        let start = 0;
        while (start < word.length) {
            let end = word.length;
            let curSubstr = null;
            while (start < end) {
                let substr = word.slice(start, end);
                if (start > 0) {
                    substr = this.continuingSubwordPrefix + substr;
                }
                if (this.vocab.has(substr)) {
                    curSubstr = substr;
                    break;
                }
                end--;
            }
            if (curSubstr === null) {
                tokens.push(this.unkToken);
                start++;
            }
            else {
                tokens.push(curSubstr);
                start = end;
            }
        }
        return tokens;
    }
    /**
     * Tokenize a single word
     */
    tokenizeWord(word) {
        // Check added tokens first
        if (this.addedTokens.has(word)) {
            return [word];
        }
        switch (this.modelType) {
            case 'BPE': {
                // Convert to byte representation
                const byteStr = this.textToBytes(word);
                return this.bpe(byteStr);
            }
            case 'WordPiece':
                return this.wordPiece(word);
            default:
                return this.vocab.has(word) ? [word] : [this.unkToken];
        }
    }
    /**
     * Main tokenization
     */
    tokenize(text) {
        // Normalize
        const normalized = this.normalize(text);
        // Check for added tokens (special tokens)
        const tokens = [];
        let remaining = normalized;
        // Sort added tokens by length (longest first) for greedy matching
        const sortedAddedTokens = Array.from(this.addedTokens.keys())
            .sort((a, b) => b.length - a.length);
        // Split by added tokens
        for (const addedToken of sortedAddedTokens) {
            if (remaining.includes(addedToken)) {
                const parts = remaining.split(addedToken);
                const newRemaining = [];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i]) {
                        newRemaining.push(parts[i]);
                    }
                    if (i < parts.length - 1) {
                        tokens.push(addedToken);
                    }
                }
                remaining = newRemaining.join(' ');
            }
        }
        // Pre-tokenize remaining text
        if (remaining.trim()) {
            const words = this.preTokenize(remaining);
            for (const word of words) {
                if (!word)
                    continue;
                const wordTokens = this.tokenizeWord(word);
                tokens.push(...wordTokens);
            }
        }
        return tokens;
    }
    /**
     * Convert tokens to IDs
     */
    convertTokensToIds(tokens) {
        return tokens.map(token => {
            // Check added tokens first
            const addedId = this.addedTokens.get(token);
            if (addedId !== undefined)
                return addedId;
            // Check vocabulary
            const vocabId = this.vocab.get(token);
            if (vocabId !== undefined)
                return vocabId;
            // Return UNK
            return this.unkTokenId;
        });
    }
    /**
     * Convert IDs to tokens
     */
    convertIdsToTokens(ids) {
        return ids.map(id => this.reverseVocab.get(id) ?? this.unkToken);
    }
    /**
     * Apply post-processing (add special tokens)
     */
    postProcess(ids, pairIds) {
        if (!this.postProcessor) {
            // Default: [CLS] tokens [SEP] or [CLS] tokens [SEP] pair [SEP]
            const result = [];
            const typeIds = [];
            if (this.clsTokenId !== undefined) {
                result.push(this.clsTokenId);
                typeIds.push(0);
            }
            result.push(...ids);
            typeIds.push(...ids.map(() => 0));
            if (this.sepTokenId !== undefined) {
                result.push(this.sepTokenId);
                typeIds.push(0);
            }
            if (pairIds) {
                result.push(...pairIds);
                typeIds.push(...pairIds.map(() => 1));
                if (this.sepTokenId !== undefined) {
                    result.push(this.sepTokenId);
                    typeIds.push(1);
                }
            }
            return { ids: result, typeIds };
        }
        // Use post-processor config
        const template = pairIds ? this.postProcessor.pair : this.postProcessor.single;
        if (!template) {
            return { ids, typeIds: ids.map(() => 0) };
        }
        const result = [];
        const typeIds = [];
        for (const item of template) {
            if ('SpecialToken' in item) {
                const specialToken = this.postProcessor.special_tokens?.[item.SpecialToken.id];
                if (specialToken) {
                    result.push(...specialToken.ids);
                    typeIds.push(...specialToken.ids.map(() => item.SpecialToken.type_id));
                }
            }
            else if ('Sequence' in item) {
                const seqIds = item.Sequence.id === 'A' ? ids : pairIds ?? [];
                result.push(...seqIds);
                typeIds.push(...seqIds.map(() => item.Sequence.type_id));
            }
        }
        return { ids: result, typeIds };
    }
    /**
     * Encode text
     */
    encode(text, options = {}) {
        const { addSpecialTokens = true, maxLength = this.maxLength, padding = 'max_length', truncation = true, returnAttentionMask = true, returnTokenTypeIds = false, textPair, } = options;
        // Tokenize
        const tokens = this.tokenize(text);
        let inputIds = this.convertTokensToIds(tokens);
        // Tokenize pair if provided
        let pairIds;
        if (textPair) {
            const pairTokens = this.tokenize(textPair);
            pairIds = this.convertTokensToIds(pairTokens);
        }
        // Post-process (add special tokens)
        let tokenTypeIds;
        if (addSpecialTokens) {
            const processed = this.postProcess(inputIds, pairIds);
            inputIds = processed.ids;
            if (returnTokenTypeIds) {
                tokenTypeIds = processed.typeIds;
            }
        }
        else if (pairIds) {
            inputIds = [...inputIds, ...pairIds];
            if (returnTokenTypeIds) {
                tokenTypeIds = [...inputIds.map(() => 0), ...pairIds.map(() => 1)];
            }
        }
        // Truncate
        if (truncation && inputIds.length > maxLength) {
            inputIds = inputIds.slice(0, maxLength);
            if (tokenTypeIds) {
                tokenTypeIds = tokenTypeIds.slice(0, maxLength);
            }
        }
        // Create attention mask
        let attentionMask = [];
        if (returnAttentionMask) {
            attentionMask = inputIds.map(() => 1);
        }
        // Padding
        if (padding === 'max_length' && inputIds.length < maxLength) {
            const padLength = maxLength - inputIds.length;
            inputIds = [...inputIds, ...new Array(padLength).fill(this.padTokenId)];
            if (returnAttentionMask) {
                attentionMask = [...attentionMask, ...new Array(padLength).fill(0)];
            }
            if (tokenTypeIds) {
                tokenTypeIds = [...tokenTypeIds, ...new Array(padLength).fill(0)];
            }
        }
        const result = {
            inputIds,
            attentionMask,
        };
        if (returnTokenTypeIds && tokenTypeIds) {
            result.tokenTypeIds = tokenTypeIds;
        }
        return result;
    }
    /**
     * Batch encode
     */
    encodeBatch(texts, options = {}) {
        // For 'longest' padding, first encode all without padding
        if (options.padding === 'longest') {
            const encodings = texts.map(t => this.encode(t, { ...options, padding: 'do_not_pad' }));
            const maxLen = Math.max(...encodings.map(e => e.inputIds.length));
            return texts.map(t => this.encode(t, { ...options, maxLength: maxLen, padding: 'max_length' }));
        }
        return texts.map(t => this.encode(t, options));
    }
    /**
     * Decode IDs to text
     */
    decode(ids, skipSpecialTokens = true) {
        let tokens = this.convertIdsToTokens(ids);
        // Filter special tokens
        if (skipSpecialTokens) {
            tokens = tokens.filter(t => !this.specialTokens.has(t));
        }
        // Join tokens
        let text = tokens.join('');
        // For BPE, decode bytes
        if (this.modelType === 'BPE') {
            text = this.bytesToText(text);
        }
        // For WordPiece, handle ## prefix
        if (this.modelType === 'WordPiece') {
            text = text.replace(new RegExp(this.continuingSubwordPrefix, 'g'), '');
        }
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    }
    /**
     * Decode batch
     */
    decodeBatch(batchIds, skipSpecialTokens = true) {
        return batchIds.map(ids => this.decode(ids, skipSpecialTokens));
    }
    /**
     * Get vocabulary size
     */
    get vocabSize() {
        return this.vocab.size + this.addedTokens.size;
    }
    /**
     * Get special token IDs
     */
    getSpecialTokenIds() {
        return {
            padTokenId: this.padTokenId,
            unkTokenId: this.unkTokenId,
            clsTokenId: this.clsTokenId,
            sepTokenId: this.sepTokenId,
            maskTokenId: this.maskTokenId,
            bosTokenId: this.bosTokenId,
            eosTokenId: this.eosTokenId,
        };
    }
    /**
     * Get config
     */
    getConfig() {
        return {
            vocabSize: this.vocabSize,
            maxLength: this.maxLength,
            padTokenId: this.padTokenId,
            unkTokenId: this.unkTokenId,
            clsTokenId: this.clsTokenId,
            sepTokenId: this.sepTokenId,
            maskTokenId: this.maskTokenId,
            bosTokenId: this.bosTokenId,
            eosTokenId: this.eosTokenId,
        };
    }
    /**
     * Check if token is special
     */
    isSpecialToken(token) {
        return this.specialTokens.has(token);
    }
    /**
     * Get token ID
     */
    getTokenId(token) {
        return this.addedTokens.get(token) ?? this.vocab.get(token);
    }
    /**
     * Get token from ID
     */
    getToken(id) {
        return this.reverseVocab.get(id);
    }
}
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create a basic English tokenizer (for testing)
 */
export function createBasicTokenizer() {
    const tokenizer = new Tokenizer();
    return tokenizer;
}
/**
 * Load tokenizer from URL
 */
export async function loadTokenizer(url) {
    return Tokenizer.fromUrl(url);
}
/**
 * Load tokenizer from HuggingFace Hub
 */
export async function loadTokenizerFromHub(modelId, options) {
    return Tokenizer.fromHuggingFace(modelId, options);
}
//# sourceMappingURL=tokenizer.js.map