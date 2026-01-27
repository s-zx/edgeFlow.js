/**
 * edgeFlow.js - Zero-shot Classification Pipeline
 *
 * Classify text into any set of labels without fine-tuning.
 */
import { BasePipeline } from './base.js';
import { EdgeFlowTensor, softmax } from '../core/tensor.js';
export class ZeroShotClassificationPipeline extends BasePipeline {
    tokenizer = null;
    hypothesisTemplate = 'This text is about {label}.';
    constructor(config) {
        super(config ?? {
            task: 'zero-shot-classification',
            model: 'default',
        });
    }
    /**
     * Set tokenizer
     */
    setTokenizer(tokenizer) {
        this.tokenizer = tokenizer;
    }
    /**
     * Run classification (convenience method with separate arguments)
     */
    async classify(text, candidateLabels, options) {
        return this.run({ text, candidateLabels }, options);
    }
    /**
     * Run classification
     */
    async run(input, options) {
        await this.initialize();
        const { text, candidateLabels } = input;
        const opts = options ?? {};
        const texts = Array.isArray(text) ? text : [text];
        const template = opts.hypothesisTemplate ?? this.hypothesisTemplate;
        const multiLabel = opts.multiLabel ?? false;
        const results = await Promise.all(texts.map(t => this.classifySingle(t, candidateLabels, template, multiLabel)));
        return Array.isArray(text) ? results : results[0];
    }
    /**
     * Classify a single text
     */
    async classifySingle(text, candidateLabels, template, multiLabel) {
        const startTime = performance.now();
        // Create hypothesis for each label
        const hypotheses = candidateLabels.map(label => template.replace('{label}', label));
        // Score each hypothesis
        const scores = [];
        for (const hypothesis of hypotheses) {
            const score = await this.scoreHypothesis(text, hypothesis);
            scores.push(score);
        }
        // Normalize scores
        let normalizedScores;
        if (multiLabel) {
            // Sigmoid for independent probabilities
            normalizedScores = scores.map(s => 1 / (1 + Math.exp(-s)));
        }
        else {
            // Softmax for mutually exclusive labels
            const tensor = new EdgeFlowTensor(new Float32Array(scores), [scores.length], 'float32');
            normalizedScores = Array.from(softmax(tensor).toFloat32Array());
        }
        // Sort by score
        const indexed = candidateLabels.map((label, i) => ({
            label,
            score: normalizedScores[i] ?? 0,
        }));
        indexed.sort((a, b) => b.score - a.score);
        return {
            sequence: text,
            labels: indexed.map(i => i.label),
            scores: indexed.map(i => i.score),
            processingTime: performance.now() - startTime,
        };
    }
    /**
     * Score a single hypothesis using NLI
     */
    async scoreHypothesis(premise, hypothesis) {
        if (!this.tokenizer) {
            throw new Error('Tokenizer not set. Call setTokenizer() first.');
        }
        // Encode premise-hypothesis pair (for future model integration)
        this.tokenizer.encode(premise, {
            textPair: hypothesis,
            addSpecialTokens: true,
            maxLength: 512,
            truncation: true,
            returnAttentionMask: true,
            returnTokenTypeIds: true,
        });
        // For NLI models, output is typically [contradiction, neutral, entailment]
        // Return the entailment score
        // Simplified: return random score for now (real implementation needs model output)
        return Math.random();
    }
    /**
     * Preprocess - not directly used (handled in scoreHypothesis)
     */
    async preprocess(input) {
        const { text, candidateLabels } = input;
        // Encode first text-label pair for shape reference
        const firstText = Array.isArray(text) ? text[0] ?? '' : text;
        const firstLabel = candidateLabels[0] ?? '';
        if (!this.tokenizer) {
            return [new EdgeFlowTensor(new Float32Array([0]), [1], 'float32')];
        }
        const encoded = this.tokenizer.encode(firstText, {
            textPair: this.hypothesisTemplate.replace('{label}', firstLabel),
            addSpecialTokens: true,
            maxLength: 512,
        });
        return [new EdgeFlowTensor(BigInt64Array.from(encoded.inputIds.map(id => BigInt(id))), [1, encoded.inputIds.length], 'int64')];
    }
    /**
     * Postprocess - not directly used
     */
    async postprocess(_outputs, _options) {
        return {
            sequence: '',
            labels: [],
            scores: [],
        };
    }
}
// ============================================================================
// Factory
// ============================================================================
export function createZeroShotClassificationPipeline(config) {
    return new ZeroShotClassificationPipeline(config);
}
//# sourceMappingURL=zero-shot-classification.js.map