import { Injectable, signal } from '@angular/core';

export interface Toast { id: string; type: 'success'|'error'|'info'|'warning'; message: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  private add(type: Toast['type'], message: string) {
    const id = Math.random().toString(36).slice(2);
    this.toasts.update(t => [...t, { id, type, message }]);
    setTimeout(() => this.remove(id), 4000);
  }

  success(m: string) { this.add('success', m); }
  error(m: string)   { this.add('error', m); }
  info(m: string)    { this.add('info', m); }
  warning(m: string) { this.add('warning', m); }
  remove(id: string) { this.toasts.update(t => t.filter(x => x.id !== id)); }
}
