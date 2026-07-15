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
  // Configuración del servidor y modelo de Ollama en el código
  private readonly defaultUrl = 'https://unviciously-incommunicable-edda.ngrok-free.dev';
  private readonly defaultModel = 'qwen2.5';

  constructor(private http: HttpClient) {}

  getBaseUrl(): string {
    return this.defaultUrl;
  }

  getModel(): string {
    return this.defaultModel;
  }

  /**
   * Envia la conversación a Ollama y retorna la respuesta completa (sin stream).
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
   * Envia la conversación a Ollama y procesa la respuesta en tiempo real (streaming).
   */
  async chatStream(messages: ChatMessage[], onChunk: (text: string) => void): Promise<void> {
    const baseUrl = this.getBaseUrl().replace(/\/+$/, '');
    const model = this.getModel();

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No se pudo abrir el lector de flujo (stream reader).');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Mantener la última línea incompleta en el buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const json = JSON.parse(line);
          if (json.message && json.message.content) {
            onChunk(json.message.content);
          }
        } catch (e) {
          console.error('Error parseando línea de streaming:', e);
        }
      }
    }
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
