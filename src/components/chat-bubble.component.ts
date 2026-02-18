import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChatMessage {
  role: 'user' | 'model';
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  isStreaming?: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex w-full mb-6 animate-message-entrance" [class.justify-end]="isUser()">
      <div 
        class="max-w-[85%] sm:max-w-[75%] p-4 shadow-lg transition-all duration-300 relative group"
        [class.user-msg]="isUser()"
        [class.ai-msg]="!isUser()"
        [class.bg-indigo-600]="isUser()"
        [class.text-white]="isUser()"
        [class.glass-panel]="!isUser()"
        [class.text-zinc-200]="!isUser()"
        [class.animate-pulse-subtle]="!isUser() && message().isStreaming"
      >
        <!-- Text Content -->
        @if (message().text) {
          <div class="whitespace-pre-wrap leading-relaxed text-sm sm:text-base font-light">
            {{ message().text }}
          </div>
        }

        <!-- Image Content -->
        @if (message().imageUrl) {
          <div class="mt-3 rounded-xl overflow-hidden shadow-md border border-white/10">
            <img [src]="message().imageUrl" alt="Generated Image" class="w-full h-auto object-cover max-h-96">
          </div>
        }

        <!-- Video Content -->
        @if (message().videoUrl) {
          <div class="mt-3 rounded-xl overflow-hidden shadow-md border border-white/10">
            <video controls [src]="message().videoUrl" class="w-full h-auto max-h-96"></video>
          </div>
        }

        <!-- Loading Indicator for Stream -->
        @if (message().isStreaming) {
           <div class="flex gap-1 mt-2 h-4 items-center opacity-70">
             <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
             <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
             <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
           </div>
        }

        <!-- Timestamp & Footer -->
        <div class="mt-2 text-[10px] opacity-40 text-right flex justify-end items-center gap-1">
          @if(isUser()) { <span>You</span> }
          <span>•</span>
          <span>{{ formattedTime() }}</span>
        </div>

      </div>
      
      <!-- User Avatar -->
      @if (isUser()) {
        <div class="ml-3 mt-auto w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold shadow-lg">
          YR
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-message-entrance {
      animation: messageEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      transform-origin: bottom center;
    }
    @keyframes messageEnter {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-pulse-subtle {
      animation: pulseBorder 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulseBorder {
      0%, 100% { border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 0 0 rgba(99, 102, 241, 0); }
      50% { border-color: rgba(129, 140, 248, 0.3); box-shadow: 0 0 15px rgba(99, 102, 241, 0.1); }
    }
  `]
})
export class ChatBubbleComponent {
  message = input.required<ChatMessage>();
  isUser = computed(() => this.message().role === 'user');
  
  formattedTime = computed(() => {
    const d = this.message().timestamp;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
}