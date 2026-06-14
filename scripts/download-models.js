const path = require('path');
const fs = require('fs');

const MOONSHINE_BASE_MODEL = 'onnx-community/moonshine-base-ONNX';
const MIXED_ASR_DTYPE = {
    encoder_model: 'fp32',
    decoder_model: 'q8',
    decoder_model_merged: 'q8',
    decoder_with_past_model: 'q8',
};

async function downloadModels() {
    const { pipeline, env } = await import('@huggingface/transformers');
    const modelsDir = path.join(__dirname, '../resources/models');
    
    // Ensure the directory exists
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
    }

    // Let Transformers.js handle the download but specify the local directory cache
    env.cacheDir = modelsDir;
    env.localModelPath = modelsDir;
    
    try {
        // 1. Embedding model (RAG)
        console.log('[download-models] Downloading Xenova/all-MiniLM-L6-v2...');
        await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('[download-models] all-MiniLM-L6-v2 downloaded.');

        // 2. Zero-shot classification model (Intent Classifier)
        console.log('[download-models] Downloading Xenova/mobilebert-uncased-mnli...');
        await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
        console.log('[download-models] mobilebert-uncased-mnli downloaded.');

        // 3. Packaged local speech transcription model.
        // Download both dtype layouts used by app runtime:
        // - fp32 for Apple Silicon/CoreML
        // - mixed fp32/q8 for Windows/Intel Mac/Linux
        console.log(`[download-models] Downloading ${MOONSHINE_BASE_MODEL} (fp32)...`);
        await pipeline('automatic-speech-recognition', MOONSHINE_BASE_MODEL, { dtype: 'fp32' });
        console.log(`[download-models] ${MOONSHINE_BASE_MODEL} fp32 downloaded.`);

        console.log(`[download-models] Downloading ${MOONSHINE_BASE_MODEL} (mixed fp32/q8)...`);
        await pipeline('automatic-speech-recognition', MOONSHINE_BASE_MODEL, { dtype: MIXED_ASR_DTYPE });
        console.log(`[download-models] ${MOONSHINE_BASE_MODEL} mixed fp32/q8 downloaded.`);

        console.log('[download-models] All models downloaded successfully!');
    } catch (e) {
        console.error('[download-models] Error downloading model:', e);
        process.exit(1);
    }
}

downloadModels().catch((e) => {
    console.error('[download-models] Fatal error:', e);
    process.exit(1);
});
