import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Ensure we use the process.env API_KEY as per instructions
    const apiKey = process.env['API_KEY'] || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateTextStream(prompt: string, history: any[] = []) {
    // Retry wrapper
    const retryOperation = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        if (retries > 0) {
          await new Promise(r => setTimeout(r, delay));
          return retryOperation(fn, retries - 1, delay * 2);
        }
        throw error;
      }
    };

    try {
      // Create chat instance with Thinking Config enabled for "Flash 3.0" level intelligence
      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history,
        config: {
          systemInstruction: 'You are Rangonos AI, a helpful, premium, and sophisticated AI assistant managed by Yuvraj Rangera. Your tone is comfortable, polite, and intelligent. Never start your response with "Rangonos AI:" or a header.',
          thinkingConfig: { 
            thinkingBudget: 2048 
          },
          maxOutputTokens: 8192,
        }
      });
      
      // Execute with retry
      return await retryOperation(() => chat.sendMessageStream({ message: prompt }));
    } catch (error) {
      console.error('Text generation error:', error);
      throw error;
    }
  }
}