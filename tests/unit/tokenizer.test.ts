/**
 * Unit tests for Tokenizer
 */
import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/utils/tokenizer';

// Sample tokenizer JSON (simplified HuggingFace format)
const SAMPLE_TOKENIZER_JSON = {
  version: '1.0',
  truncation: null,
  padding: null,
  added_tokens: [
    { id: 0, content: '[PAD]', single_word: false, lstrip: false, rstrip: false, normalized: false, special: true },
    { id: 100, content: '[UNK]', single_word: false, lstrip: false, rstrip: false, normalized: false, special: true },
    { id: 101, content: '[CLS]', single_word: false, lstrip: false, rstrip: false, normalized: false, special: true },
    { id: 102, content: '[SEP]', single_word: false, lstrip: false, rstrip: false, normalized: false, special: true },
    { id: 103, content: '[MASK]', single_word: false, lstrip: false, rstrip: false, normalized: false, special: true },
  ],
  normalizer: { type: 'Lowercase' },
  pre_tokenizer: { type: 'Whitespace' },
  post_processor: {
    type: 'TemplateProcessing',
    single: [
      { SpecialToken: { id: '[CLS]', type_id: 0 } },
      { Sequence: { id: 'A', type_id: 0 } },
      { SpecialToken: { id: '[SEP]', type_id: 0 } },
    ],
    pair: [],
    special_tokens: {
      '[CLS]': { id: '[CLS]', ids: [101], tokens: ['[CLS]'] },
      '[SEP]': { id: '[SEP]', ids: [102], tokens: ['[SEP]'] },
    },
  },
  model: {
    type: 'WordPiece',
    vocab: {
      '[PAD]': 0,
      '[UNK]': 100,
      '[CLS]': 101,
      '[SEP]': 102,
      '[MASK]': 103,
      'hello': 1000,
      'world': 1001,
      'test': 1002,
      'this': 1003,
      'is': 1004,
      'a': 1005,
      '##ing': 1006,
      '##ed': 1007,
    },
    unk_token: '[UNK]',
    continuing_subword_prefix: '##',
  },
};

describe('Tokenizer', () => {
  describe('Creation', () => {
    it('should create tokenizer from JSON object', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      expect(tokenizer).toBeDefined();
    });

    it('should create tokenizer from JSON string', async () => {
      const tokenizer = await Tokenizer.fromJSON(JSON.stringify(SAMPLE_TOKENIZER_JSON));
      expect(tokenizer).toBeDefined();
    });
  });

  describe('Encoding', () => {
    it('should encode simple text', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const encoded = tokenizer.encode('hello world');
      
      expect(encoded.inputIds).toBeDefined();
      expect(encoded.inputIds.length).toBeGreaterThan(0);
    });

    it('should generate attention mask', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const encoded = tokenizer.encode('hello world', {
        returnAttentionMask: true,
      });
      
      expect(encoded.attentionMask).toBeDefined();
      expect(encoded.attentionMask?.length).toBe(encoded.inputIds.length);
    });

    it('should handle padding', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const encoded = tokenizer.encode('hello', {
        maxLength: 10,
        padding: 'max_length',
      });
      
      expect(encoded.inputIds.length).toBe(10);
    });

    it('should handle truncation', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const encoded = tokenizer.encode('hello world test this is a long text', {
        maxLength: 5,
        truncation: true,
      });
      
      expect(encoded.inputIds.length).toBe(5);
    });

    it('should add special tokens', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const encoded = tokenizer.encode('hello', {
        addSpecialTokens: true,
      });
      
      // Should have special tokens in output
      // Note: The exact positions depend on the tokenizer's post_processor config
      expect(encoded.inputIds.length).toBeGreaterThan(1);
      // At minimum, the input should be tokenized
      expect(encoded.inputIds.some(id => id === 1000)).toBe(true); // 'hello'
    });

    it('should generate token type IDs', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const encoded = tokenizer.encode('hello', {
        returnTokenTypeIds: true,
      });
      
      expect(encoded.tokenTypeIds).toBeDefined();
    });
  });

  describe('Batch Encoding', () => {
    it('should encode multiple texts', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const batch = tokenizer.encodeBatch(['hello', 'world', 'test']);
      
      expect(batch.length).toBe(3);
      batch.forEach(encoded => {
        expect(encoded.inputIds).toBeDefined();
      });
    });

    it('should pad to longest in batch', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const batch = tokenizer.encodeBatch(['hello', 'hello world test'], {
        padding: 'longest',
      });
      
      expect(batch[0].inputIds.length).toBe(batch[1].inputIds.length);
    });
  });

  describe('Decoding', () => {
    it('should decode token IDs', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const decoded = tokenizer.decode([1000, 1001]);
      
      expect(decoded.toLowerCase()).toContain('hello');
      expect(decoded.toLowerCase()).toContain('world');
    });

    it('should skip special tokens', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const decoded = tokenizer.decode([101, 1000, 102], true);
      
      expect(decoded).not.toContain('[CLS]');
      expect(decoded).not.toContain('[SEP]');
    });

    it('should decode batch', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const decoded = tokenizer.decodeBatch([
        [1000],
        [1001],
      ]);
      
      expect(decoded.length).toBe(2);
    });
  });

  describe('Token/ID Conversion', () => {
    it('should get token ID', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const id = tokenizer.getTokenId('hello');
      
      expect(id).toBe(1000);
    });

    it('should get token from ID', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const token = tokenizer.getToken(1000);
      
      expect(token).toBe('hello');
    });

    it('should handle unknown tokens', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const id = tokenizer.getTokenId('unknowntoken12345');
      
      // Should return undefined or UNK ID
      expect(id === undefined || id === 100).toBe(true);
    });
  });

  describe('Special Tokens', () => {
    it('should identify special tokens', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      
      expect(tokenizer.isSpecialToken('[PAD]')).toBe(true);
      expect(tokenizer.isSpecialToken('[UNK]')).toBe(true);
      expect(tokenizer.isSpecialToken('[CLS]')).toBe(true);
      expect(tokenizer.isSpecialToken('[SEP]')).toBe(true);
      expect(tokenizer.isSpecialToken('hello')).toBe(false);
    });

    it('should get special token IDs', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const specialIds = tokenizer.getSpecialTokenIds();
      
      // Check the actual property names returned by the implementation
      expect(specialIds).toHaveProperty('padTokenId');
      expect(specialIds).toHaveProperty('unkTokenId');
    });
  });

  describe('Configuration', () => {
    it('should return config', async () => {
      const tokenizer = await Tokenizer.fromJSON(SAMPLE_TOKENIZER_JSON);
      const config = tokenizer.getConfig();
      
      // Check the actual property names returned by the implementation
      expect(config).toHaveProperty('vocabSize');
      expect(config).toHaveProperty('maxLength');
    });
  });
});
