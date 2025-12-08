
import { AiProvider } from '../types';

export const providerDisplayNames: Record<AiProvider, string> = {
  [AiProvider.GOOGLE]: 'Google',
  [AiProvider.OPENAI]: 'OpenAI',
  [AiProvider.OPENROUTER]: 'OpenRouter',
  [AiProvider.ANTHROPIC]: 'Anthropic',
  [AiProvider.XAI]: 'X.AI Grok',
  [AiProvider.REPLICATE]: 'Replicate',
  [AiProvider.OPENART]: 'OpenArt AI',
};
