import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-200 relative overflow-hidden p-4">
      
      <!-- Decorative Background -->
      <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div class="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-up">
        
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="text-red-500 font-bold text-xs uppercase mb-2">3.0 CORE</div>
          <div class="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <span class="material-symbols-rounded text-3xl text-white">smart_toy</span>
          </div>
          <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-2">
            Rangonos AI
          </h1>
          <p class="text-sm text-zinc-500">
            {{ isLogin() ? 'Welcome back, traveler.' : 'Begin your journey with us.' }}
          </p>
        </div>

        <!-- Form -->
        <form (ngSubmit)="submit()" class="space-y-4">
          
          @if (!isLogin()) {
            <div class="space-y-1">
              <label class="text-xs font-medium text-zinc-400 ml-1">Full Name</label>
              <input 
                type="text" 
                [(ngModel)]="name" 
                name="name" 
                required
                class="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-zinc-700"
                placeholder="Yuvraj Rangera"
              >
            </div>
          }

          <div class="space-y-1">
            <label class="text-xs font-medium text-zinc-400 ml-1">Email Address</label>
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email" 
              required
              class="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-zinc-700"
              placeholder="name@example.com"
            >
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-zinc-400 ml-1">Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              required
              class="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-zinc-700"
              placeholder="••••••••"
            >
          </div>

          @if (error()) {
            <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
              {{ error() }}
            </div>
          }

          <button 
            type="submit"
            [disabled]="loading()"
            class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-6"
          >
            @if (loading()) {
              <span class="material-symbols-rounded animate-spin text-lg">progress_activity</span>
            } @else {
              <span>{{ isLogin() ? 'Sign In' : 'Create Account' }}</span>
              <span class="material-symbols-rounded text-lg">arrow_forward</span>
            }
          </button>
        </form>

        <!-- Footer -->
        <div class="mt-6 text-center">
          <button 
            type="button"
            (click)="toggleMode()"
            class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {{ isLogin() ? "Don't have an account? Sign up" : "Already have an account? Sign in" }}
          </button>
        </div>

        <div class="mt-8 pt-6 border-t border-white/5 text-center">
          <p class="text-[10px] text-zinc-600">Managed by <span class="font-bold">Yuvraj Rangera</span></p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .animate-fade-up {
      animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AuthComponent {
  authService = inject(AuthService);
  
  isLogin = signal(true);
  loading = signal(false);
  error = signal<string | null>(null);

  // Form Models
  name = '';
  email = '';
  password = '';

  toggleMode() {
    this.isLogin.update(v => !v);
    this.error.set(null);
    this.name = '';
    this.email = '';
    this.password = '';
  }

  async submit() {
    if (!this.email || !this.password || (!this.isLogin() && !this.name)) {
      this.error.set('Please fill in all fields');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Simulate network delay for premium feel
    await new Promise(r => setTimeout(r, 800));

    let result;
    if (this.isLogin()) {
      result = this.authService.login(this.email, this.password);
    } else {
      result = this.authService.signup(this.name, this.email, this.password);
    }

    if (!result.success) {
      this.error.set(result.message || 'An error occurred');
    }
    
    this.loading.set(false);
  }
}