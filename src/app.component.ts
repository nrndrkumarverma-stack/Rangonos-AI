import { Component, signal, ViewChild, ElementRef, inject, effect, computed } from '@angular/core';
import { CommonModule, NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './services/gemini.service';
import { AuthService, User } from './services/auth.service';
import { ChatBubbleComponent, ChatMessage } from './components/chat-bubble.component';
import { AuthComponent } from './components/auth.component';

interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatBubbleComponent, AuthComponent, NgClass, DatePipe],
  templateUrl: './app.component.html'
})
export class AppComponent {
  private gemini = inject(GeminiService);
  public authService = inject(AuthService);
  
  // State
  viewMode = signal<'chat' | 'profile'>('chat');
  
  // Chat Session State
  sessions = signal<ChatSession[]>([]);
  activeSessionId = signal<string | null>(null);
  messages = signal<ChatMessage[]>([]);
  
  isLoading = signal<boolean>(false);
  isMobileMenuOpen = signal<boolean>(false);

  // Profile Edit State
  profileName = '';
  profilePassword = '';
  profileConfirmPassword = '';
  profileMessage = signal<{text: string, type: 'success' | 'error'} | null>(null);

  // References
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  constructor() {
    // 1. Initialize data when user logs in
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadSessions(user.id);
      } else {
        this.sessions.set([]);
        this.messages.set([]);
        this.activeSessionId.set(null);
      }
    });

    // 2. Load messages when active session changes
    effect(() => {
      const sessionId = this.activeSessionId();
      if (sessionId) {
        this.loadMessagesForSession(sessionId);
        this.viewMode.set('chat');
      }
    });

    // 3. Auto scroll on message change
    effect(() => {
      if (this.messages().length > 0 && this.viewMode() === 'chat') {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    // 4. Initialize Profile form data when entering profile view
    effect(() => {
      if (this.viewMode() === 'profile') {
        this.profileName = this.authService.currentUser()?.name || '';
        this.profilePassword = '';
        this.profileConfirmPassword = '';
        this.profileMessage.set(null);
      }
    });
  }

  // --- Session Management ---

  private loadSessions(userId: string) {
    const key = `rangonos_sessions_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored).sort((a: any, b: any) => b.timestamp - a.timestamp);
        this.sessions.set(parsed);
        if (parsed.length > 0 && !this.activeSessionId()) {
          this.activeSessionId.set(parsed[0].id);
        }
      } catch (e) {
        this.sessions.set([]);
      }
    } else {
      this.createNewChat();
    }
  }

  private loadMessagesForSession(sessionId: string) {
    const key = `rangonos_chat_${sessionId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.forEach((m: any) => m.timestamp = new Date(m.timestamp));
        this.messages.set(parsed);
      } catch {
        this.messages.set([]);
      }
    } else {
      this.messages.set([]);
    }
  }

  createNewChat() {
    const newId = crypto.randomUUID();
    const user = this.authService.currentUser();
    
    if (user) {
      const newSession: ChatSession = {
        id: newId,
        title: 'New Conversation',
        timestamp: Date.now()
      };
      
      const updatedSessions = [newSession, ...this.sessions()];
      this.sessions.set(updatedSessions);
      this.saveSessionsToStorage(user.id, updatedSessions);
      
      this.activeSessionId.set(newId);
      this.messages.set([]);
    }
  }

  switchChat(sessionId: string) {
    this.activeSessionId.set(sessionId);
  }

  private saveSessionsToStorage(userId: string, sessions: ChatSession[]) {
    localStorage.setItem(`rangonos_sessions_${userId}`, JSON.stringify(sessions));
  }

  private saveMessagesToStorage(sessionId: string, msgs: ChatMessage[]) {
    localStorage.setItem(`rangonos_chat_${sessionId}`, JSON.stringify(msgs));
  }

  // --- Chat Logic ---

  async sendMessage(inputEl: HTMLTextAreaElement) {
    const text = inputEl.value.trim();
    const currentSessionId = this.activeSessionId();
    const user = this.authService.currentUser();

    if (!text || this.isLoading() || !currentSessionId || !user) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';

    // 1. Update Title if it's the first message
    if (this.messages().length === 0) {
      const updatedSessions = this.sessions().map(s => {
        if (s.id === currentSessionId) {
          return { ...s, title: text.substring(0, 30) + (text.length > 30 ? '...' : '') };
        }
        return s;
      });
      this.sessions.set(updatedSessions);
      this.saveSessionsToStorage(user.id, updatedSessions);
    }

    // 2. Add User Message
    const userMsg: ChatMessage = {
      role: 'user',
      text: text,
      timestamp: new Date()
    };
    
    const newMessages = [...this.messages(), userMsg];
    this.messages.set(newMessages);
    this.saveMessagesToStorage(currentSessionId, newMessages);
    
    // 3. Set Loading and Add Placeholder
    this.isLoading.set(true);
    
    // Add Placeholder Message
    const placeholderMsg: ChatMessage = {
      role: 'model',
      text: '',
      isStreaming: true,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, placeholderMsg]);

    try {
      await this.handleChatResponse(text, currentSessionId);
    } catch (error) {
       console.error(error);
       // Update the placeholder to show error
       this.messages.update(msgs => {
         return msgs.map(m => {
           if (m.isStreaming) {
             return { 
               ...m, 
               isStreaming: false, 
               text: 'Sorry, I am unable to connect to the server at this moment. Please check your connection and try again.' 
             };
           }
           return m;
         });
       });
    } finally {
      this.isLoading.set(false);
      this.saveMessagesToStorage(currentSessionId, this.messages());
    }
  }

  private async handleChatResponse(prompt: string, sessionId: string) {
    // 1. Extract raw valid messages
    // logic: take all messages except the last two (the newly added user message and the placeholder)
    // to rebuild the conversation history state.
    const allMessages = this.messages();
    const rawHistory = allMessages.slice(0, allMessages.length - 2); 
    
    // 2. Sanitize History
    // Gemini requires alternating roles: user -> model -> user -> model.
    const sanitizedHistory: {role: string, parts: {text: string}[]}[] = [];
    
    for (const msg of rawHistory) {
        if (!msg.text) continue;
        
        const last = sanitizedHistory[sanitizedHistory.length - 1];
        
        if (last && last.role === msg.role) {
            // Merge consecutive messages of same role
            last.parts[0].text += `\n${msg.text}`;
        } else {
            // Add new message
            sanitizedHistory.push({
                role: msg.role,
                parts: [{ text: msg.text }]
            });
        }
    }
    
    // Ensure history doesn't end with 'user' (because we are about to send a 'user' message)
    if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === 'user') {
        sanitizedHistory.pop();
    }

    const stream = await this.gemini.generateTextStream(prompt, sanitizedHistory);

    for await (const chunk of stream) {
      // FIX: Accessing .text as a property, not a function
      const chunkText = chunk.text; 
      
      if (chunkText) {
        this.messages.update(msgs => {
            const copy = [...msgs];
            const last = copy[copy.length - 1];
            if (last.role === 'model' && last.isStreaming) {
            last.text += chunkText;
            }
            return copy;
        });
      }
    }

    // Finalize
    this.messages.update(msgs => {
      const copy = [...msgs];
      const last = copy[copy.length - 1];
      if (last) last.isStreaming = false;
      return copy;
    });
  }

  // --- Profile Logic ---
  
  backToChat() {
    this.viewMode.set('chat');
  }

  updateProfileName() {
    if (!this.profileName.trim()) {
        this.showProfileMessage('Name cannot be empty', 'error');
        return;
    }
    const res = this.authService.updateProfile(this.authService.currentUser()!.id, { name: this.profileName });
    if (res.success) {
        this.showProfileMessage('Name updated successfully', 'success');
    } else {
        this.showProfileMessage(res.message || 'Error updating name', 'error');
    }
  }

  updateProfilePassword() {
     if (!this.profilePassword) return;
     if (this.profilePassword !== this.profileConfirmPassword) {
         this.showProfileMessage('Passwords do not match', 'error');
         return;
     }
     if (this.profilePassword.length < 6) {
         this.showProfileMessage('Password must be at least 6 characters', 'error');
         return;
     }
     const res = this.authService.updateProfile(this.authService.currentUser()!.id, { password: this.profilePassword });
     if (res.success) {
         this.showProfileMessage('Password updated successfully', 'success');
         this.profilePassword = '';
         this.profileConfirmPassword = '';
     } else {
         this.showProfileMessage(res.message || 'Error updating password', 'error');
     }
  }

  showProfileMessage(text: string, type: 'success' | 'error') {
      this.profileMessage.set({ text, type });
      setTimeout(() => this.profileMessage.set(null), 3000);
  }

  // --- UI Helpers ---

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  logout() {
    this.authService.logout();
    this.isMobileMenuOpen.set(false);
  }

  getUserInitials() {
    const name = this.authService.currentUser()?.name || '';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  handleEnterKey(event: KeyboardEvent, input: HTMLTextAreaElement) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage(input);
    }
  }

  scrollToBottom() {
    try {
      this.scrollAnchor.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch(e) {}
  }
  
  formatDate(ts: number): string {
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    return date.toLocaleDateString();
  }
}