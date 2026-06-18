const path = require('path');
const fs = require('fs');

const MOONSHINE_BASE_MODEL = 'onnx-community/moonshine-base-ONNX';
const MOONSHINE_BASE_LOCAL_DIR = path.join(
    __dirname,
    '../resources/models/onnx-community/moonshine-base-ONNX',
);
const MOONSHINE_BASE_REQUIRED_FILES = [
    'config.json',
    'generation_config.json',
    'preprocessor_config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'onnx/encoder_model.onnx',
    'onnx/decoder_model_merged.onnx',
    'onnx/decoder_model_merged_quantized.onnx',
];
const MIXED_ASR_DTYPE = {
    encoder_model: 'fp32',
    decoder_model: 'q8',
    decoder_model_merged: 'q8',
    decoder_with_past_model: 'q8',
};
const SHOULD_DOWNLOAD_STT_RESOURCE_CACHE = process.env.ANSWERFLOW_DOWNLOAD_STT_MODEL === '1';

function missingMoonshineBaseFiles() {
    return MOONSHINE_BASE_REQUIRED_FILES.filter((relativePath) => {
        const filePath = path.join(MOONSHINE_BASE_LOCAL_DIR, relativePath);
        return !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
    });
}

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

        if (SHOULD_DOWNLOAD_STT_RESOURCE_CACHE) {
            // Optional developer cache mode. Normal releases download Moonshine
            // during preflight into app data so installers stay small and
            // updates don't replace the cached speech model.
            console.log(`[download-models] Downloading ${MOONSHINE_BASE_MODEL} (fp32)...`);
            await pipeline('automatic-speech-recognition', MOONSHINE_BASE_MODEL, { dtype: 'fp32' });
            console.log(`[download-models] ${MOONSHINE_BASE_MODEL} fp32 downloaded.`);

            console.log(`[download-models] Downloading ${MOONSHINE_BASE_MODEL} (mixed fp32/q8)...`);
            try {
                await pipeline('automatic-speech-recognition', MOONSHINE_BASE_MODEL, { dtype: MIXED_ASR_DTYPE });
            } catch (mixedError) {
                const missing = missingMoonshineBaseFiles();
                if (missing.length > 0) {
                    throw mixedError;
                }
                console.warn(
                    '[download-models] Mixed Moonshine validation failed after download; ' +
                    'continuing because all required package files are present.',
                    mixedError?.message || mixedError,
                );
            }
            console.log(`[download-models] ${MOONSHINE_BASE_MODEL} mixed fp32/q8 downloaded.`);
        } else {
            console.log('[download-models] Skipping Moonshine Base bundle; it downloads during preflight.');
        }

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
