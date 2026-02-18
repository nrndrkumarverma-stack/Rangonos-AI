import { Injectable, signal } from '@angular/core';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  joinedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Signals
  currentUser = signal<User | null>(null);
  
  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const stored = localStorage.getItem('rangonos_current_user');
    if (stored) {
      try {
        this.currentUser.set(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse user session', e);
        this.logout();
      }
    }
  }

  login(email: string, pass: string): { success: boolean; message?: string } {
    const usersStr = localStorage.getItem('rangonos_users');
    const users: any[] = usersStr ? JSON.parse(usersStr) : [];
    
    const user = users.find(u => u.email === email && u.password === pass);
    
    if (user) {
      const safeUser: User = { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        avatarColor: user.avatarColor || 'bg-indigo-500',
        joinedAt: user.joinedAt || new Date().toISOString()
      };
      this.saveSession(safeUser);
      return { success: true };
    }
    
    return { success: false, message: 'Invalid email or password' };
  }

  signup(name: string, email: string, pass: string): { success: boolean; message?: string } {
    const usersStr = localStorage.getItem('rangonos_users');
    const users: any[] = usersStr ? JSON.parse(usersStr) : [];
    
    if (users.some(u => u.email === email)) {
      return { success: false, message: 'Email already registered' };
    }

    const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const joinDate = new Date().toISOString();

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password: pass, 
      avatarColor: randomColor,
      joinedAt: joinDate
    };

    users.push(newUser);
    localStorage.setItem('rangonos_users', JSON.stringify(users));
    
    const safeUser: User = { 
      id: newUser.id, 
      name: newUser.name, 
      email: newUser.email, 
      avatarColor: newUser.avatarColor,
      joinedAt: newUser.joinedAt
    };
    this.saveSession(safeUser);
    
    return { success: true };
  }

  updateProfile(userId: string, data: { name?: string, password?: string }): { success: boolean; message?: string } {
    const usersStr = localStorage.getItem('rangonos_users');
    let users: any[] = usersStr ? JSON.parse(usersStr) : [];
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return { success: false, message: 'User not found' };

    // Update fields
    if (data.name) users[userIndex].name = data.name;
    if (data.password) users[userIndex].password = data.password;

    localStorage.setItem('rangonos_users', JSON.stringify(users));

    // Update current session if needed
    const currentUser = this.currentUser();
    if (currentUser && currentUser.id === userId) {
      if (data.name) {
         const safeUser: User = { 
           ...currentUser, 
           name: data.name 
         };
         this.saveSession(safeUser);
      }
    }
    
    return { success: true };
  }

  logout() {
    localStorage.removeItem('rangonos_current_user');
    this.currentUser.set(null);
  }

  getAllUsers(): User[] {
    const usersStr = localStorage.getItem('rangonos_users');
    if (!usersStr) return [];
    try {
      const users = JSON.parse(usersStr);
      return users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarColor: u.avatarColor || 'bg-zinc-500',
        joinedAt: u.joinedAt || new Date().toISOString()
      }));
    } catch {
      return [];
    }
  }

  private saveSession(user: User) {
    localStorage.setItem('rangonos_current_user', JSON.stringify(user));
    this.currentUser.set(user);
  }
}