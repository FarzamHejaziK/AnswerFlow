import { IEmbeddingProvider } from './providers/IEmbeddingProvider';
import { OpenAIEmbeddingProvider } from './providers/OpenAIEmbeddingProvider';
import { GeminiEmbeddingProvider } from './providers/GeminiEmbeddingProvider';
import { OllamaEmbeddingProvider } from './providers/OllamaEmbeddingProvider';
import { LocalEmbeddingProvider } from './providers/LocalEmbeddingProvider';
import { assertProviderDataScopes, type ProviderDataScopePolicy } from '../llm/ProviderRouter';

export interface AppAPIConfig {
  openaiKey?: string;
  geminiKey?: string;
  ollamaUrl?: string; // e.g. 'http://localhost:11434'
  providerDataScopes?: ProviderDataScopePolicy;
}

export class EmbeddingProviderResolver {
  /**
   * Returns the best available provider.
   * Runs isAvailable() checks in priority order.
   * Local model is the unconditional fallback — always last.
   */
  static async resolve(config: AppAPIConfig): Promise<IEmbeddingProvider> {
    const candidates: IEmbeddingProvider[] = [];

    if (config.openaiKey) {
      try {
        assertProviderDataScopes('openai_embeddings', ['embeddings'], config.providerDataScopes);
        candidates.push(new OpenAIEmbeddingProvider(config.openaiKey));
      } catch {
        console.log('[EmbeddingProviderResolver] OpenAI embeddings disabled by provider data scope policy');
      }
    }
    if (config.geminiKey) {
      try {
        assertProviderDataScopes('gemini_embeddings', ['embeddings'], config.providerDataScopes);
        candidates.push(new GeminiEmbeddingProvider(config.geminiKey));
      } catch {
        console.log('[EmbeddingProviderResolver] Gemini embeddings disabled by provider data scope policy');
      }
    }
    
    candidates.push(new OllamaEmbeddingProvider(config.ollamaUrl || 'http://localhost:11434'));
    candidates.push(new LocalEmbeddingProvider()); // always last, always works

    for (const provider of candidates) {
      const available = await provider.isAvailable();
      if (available) {
        console.log(`[EmbeddingProviderResolver] Selected provider: ${provider.name} (${provider.dimensions}d)`);
        return provider;
      }
      console.log(`[EmbeddingProviderResolver] Provider ${provider.name} unavailable, trying next...`);
    }

    // This should never happen since LocalEmbeddingProvider.isAvailable() 
    // only returns false if the bundled model is corrupted — a fatal install error
    throw new Error('No embedding provider available. The bundled model may be corrupted. Please reinstall.');
  }
}
