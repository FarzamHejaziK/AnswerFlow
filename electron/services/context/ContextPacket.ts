import { TrustLevel, ContextBlock } from './TrustLevels';

 export interface ContextPacket {
     blocks: ContextBlock[];
     systemPrompt: string;
     developerPrompt?: string; // For any developer-role instructions
     userMessage: string;
     metadata: {
         modeTemplateType: string;
         activeModeId?: string;
         screenContextAvailable: boolean;
         tokenBudget: number;
         totalTokensUsed: number;
     };
 }