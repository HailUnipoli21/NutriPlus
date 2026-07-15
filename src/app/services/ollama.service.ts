import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class OllamaService {
  private readonly urlKey = 'ollama_api_url';
  private readonly modelKey = 'ollama_model';

  private readonly defaultUrl = 'http://localhost:11434';
  private readonly defaultModel = 'qwen2.5';

  constructor(private http: HttpClient) {}

  getBaseUrl(): string {
    const url = localStorage.getItem(this.urlKey);
    return url && url.trim() !== '' ? url.trim() : this.defaultUrl;
  }

  setBaseUrl(url: string): void {
    localStorage.setItem(this.urlKey, url.trim());
  }

  getModel(): string {
    const model = localStorage.getItem(this.modelKey);
    return model && model.trim() !== '' ? model.trim() : this.defaultModel;
  }

  setModel(model: string): void {
    localStorage.setItem(this.modelKey, model.trim());
  }

  /**
   * Envia la conversación a Ollama y retorna la respuesta completa.
   */
  chat(messages: ChatMessage[]): Observable<any> {
    const baseUrl = this.getBaseUrl().replace(/\/+$/, '');
    const model = this.getModel();

    return this.http.post<any>(`${baseUrl}/api/chat`, {
      model: model,
      messages: messages,
      stream: false
    });
  }

  /**
   * Verifica si el servidor de Ollama está activo.
   */
  checkConnection(): Observable<any> {
    const baseUrl = this.getBaseUrl().replace(/\/+$/, '');
    
    return this.http.get(`${baseUrl}/`, { 
      responseType: 'text'
    });
  }
}
