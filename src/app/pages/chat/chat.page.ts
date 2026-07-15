import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { OllamaService, ChatMessage } from '../../services/ollama.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessageText = '';
  loading = false;
  
  // Perfil del usuario
  userProfile: any = null;
  profileError = false;

  // Variables locales de configuración de Ollama
  ollamaUrl = '';
  ollamaModel = '';

  constructor(
    private authService: AuthService,
    private ollamaService: OllamaService
  ) {}

  ngOnInit() {
    this.loadConfig();
  }

  ionViewWillEnter() {
    this.loadConfig();
    this.cargarPerfilYComenzarChat();
  }

  loadConfig() {
    this.ollamaUrl = this.ollamaService.getBaseUrl();
    this.ollamaModel = this.ollamaService.getModel();
  }

  limpiarConversacion() {
    this.messages = [];
    if (this.userProfile) {
      this.inicializarChat();
    } else {
      this.inicializarChatGenerico();
    }
  }

  cargarPerfilYComenzarChat() {
    this.profileError = false;
    this.authService.getProfile().subscribe({
      next: (res) => {
        this.userProfile = res.user;
        this.inicializarChat();
      },
      error: (err) => {
        console.error('Error al cargar perfil en el chat:', err);
        this.profileError = true;
        // Inicializamos con un mensaje genérico si no se puede cargar el perfil
        this.inicializarChatGenerico();
      }
    });
  }

  inicializarChat() {
    const age = this.userProfile.age ? `${this.userProfile.age} años` : 'No especificado';
    const sex = this.getBiologicalSexLabel(this.userProfile.biological_sex);
    const weight = this.userProfile.weight_kg ? `${this.userProfile.weight_kg} kg` : 'No especificado';
    const height = this.userProfile.height_cm ? `${this.userProfile.height_cm} cm` : 'No especificado';
    const activity = this.getActivityLevelLabel(this.userProfile.activity_level);
    const goal = this.getGoalLabel(this.userProfile.goal);

    const systemPrompt = `Eres Aura, un chatbot asistente experto en nutrición y entrenamiento físico de la aplicación NutriPlus. 
Tu objetivo es recomendar comidas saludables y rutinas de ejercicio adaptadas al usuario según sus datos personales:
- Edad: ${age}
- Género: ${sex}
- Peso: ${weight}
- Estatura: ${height}
- Nivel de actividad física: ${activity}
- Objetivo principal: ${goal}

Instrucciones estrictas para tus respuestas:
1. Responde de forma amable, motivadora, clara y profesional en Español.
2. Da sugerencias de comidas variadas y recetas sencillas enfocadas en su objetivo.
3. A la hora de responder cuando te pidan rutinas de ejercicios, presenta cada ejercicio estrictamente en el siguiente formato:
   Nombre del Ejercicio (Número de series x Número de repeticiones)
   Y en la descripción de cada ejercicio, incluye ÚNICAMENTE sus beneficios, sin añadir explicaciones largas sobre cómo realizarlo.
4. Siempre enfatiza que tus recomendaciones son de carácter informativo y motivacional, y que es ideal consultar con profesionales.
5. Sé directo, conciso y estructurado (usa viñetas o negritas para facilitar la lectura en una pantalla móvil).`;

    const welcomeMsg = `Hola, Mi nombre es Aura, Tu asistente de entrenamiento y alimenticio. ¿En que puedo ayudarte hoy?`;

    // Preservar la conversación previa si existe, pero actualizar el system prompt al inicio
    if (this.messages.length > 0) {
      if (this.messages[0].role === 'system') {
        this.messages[0].content = systemPrompt;
      } else {
        this.messages.unshift({ role: 'system', content: systemPrompt });
      }
    } else {
      this.messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'assistant', 
          content: welcomeMsg
        }
      ];
    }
    this.scrollToBottom();
  }

  inicializarChatGenerico() {
    const systemPrompt = `Eres Aura, un chatbot asistente experto en nutrición y entrenamiento físico de la aplicación NutriPlus.
Tu objetivo es recomendar comidas saludables y rutinas de ejercicio adaptadas. 
Responde de forma amable, motivadora, clara y profesional en Español.
A la hora de responder cuando te pidan rutinas de ejercicios, presenta cada ejercicio estrictamente en el siguiente formato:
Nombre del Ejercicio (Número de series x Número de repeticiones)
Y en la descripción de cada ejercicio, incluye ÚNICAMENTE sus beneficios, sin añadir explicaciones largas sobre cómo realizarlo.`;

    const welcomeMsg = `Hola, Mi nombre es Aura, Tu asistente de entrenamiento y alimenticio. ¿En que puedo ayudarte hoy?`;

    if (this.messages.length === 0) {
      this.messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'assistant', 
          content: welcomeMsg
        }
      ];
    }
    this.scrollToBottom();
  }

  sendMessage() {
    if (!this.newMessageText.trim() || this.loading) {
      return;
    }

    const userText = this.newMessageText.trim();
    this.messages.push({ role: 'user', content: userText });
    this.newMessageText = '';
    this.loading = true;
    this.scrollToBottom();

    // Actualizamos configuración actual por si cambió en el perfil
    this.loadConfig();

    this.ollamaService.chat(this.messages).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.message && res.message.content) {
          this.messages.push({
            role: 'assistant',
            content: res.message.content
          });
        } else {
          this.messages.push({
            role: 'assistant',
            content: 'Lo siento, he recibido una respuesta vacía del servidor de inteligencia artificial.'
          });
        }
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Error al conectar con Ollama:', err);
        this.loading = false;
        
        const errorMsg = `No he podido conectarme a Ollama en **${this.ollamaUrl}** usando el modelo **${this.ollamaModel}**. 

**Por favor, verifica lo siguiente:**
1. Ollama debe estar ejecutándose en tu equipo.
2. Debes tener instalado el modelo ejecutando en tu terminal: \`ollama run ${this.ollamaModel}\`.
3. Para evitar bloqueos del navegador (CORS), debes iniciar Ollama con permisos de origen cruzado:
   - **Windows (PowerShell)**:
     \`\`\`powershell
     $env:OLLAMA_ORIGINS="*"
     ollama serve
     \`\`\`
   - **macOS / Linux**:
     \`\`\`bash
     OLLAMA_ORIGINS="*" ollama serve
     \`\`\`
4. Puedes modificar esta configuración en la sección de tu **Perfil** (botón de "Configurar Chatbot IA").`;

        this.messages.push({
          role: 'assistant',
          content: errorMsg
        });
        this.scrollToBottom();
      }
    });
  }

  getGoalLabel(goal: string): string {
    const goals: Record<string, string> = {
      lose_weight: 'Perder peso / Adelgazar',
      maintain_weight: 'Mantener peso saludable',
      gain_muscle: 'Ganar masa muscular'
    };
    return goals[goal] || goal || 'No especificado';
  }

  getActivityLevelLabel(level: string): string {
    const levels: Record<string, string> = {
      sedentary: 'Sedentario (poco o ningún ejercicio)',
      light: 'Ligero (ejercicio ligero 1-3 días/semana)',
      moderate: 'Moderado (ejercicio moderado 3-5 días/semana)',
      high: 'Activo (ejercicio fuerte 6-7 días/semana)',
      very_high: 'Muy activo (atletas, ejercicio muy duro o doble turno)'
    };
    return levels[level] || level || 'No especificado';
  }

  getBiologicalSexLabel(sex: string): string {
    const sexes: Record<string, string> = {
      male: 'Masculino',
      female: 'Femenino'
    };
    return sexes[sex] || sex || 'No especificado';
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatContainer) {
        const el = this.chatContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 100);
  }

  getVisibleMessages() {
    return this.messages.filter(m => m.role !== 'system');
  }

  formatMarkdown(text: string): string {
    if (!text) return '';
    // Escape HTML first to prevent XSS
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold text
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic text
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Newlines
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
  }
}
