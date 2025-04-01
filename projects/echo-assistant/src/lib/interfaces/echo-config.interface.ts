// projects/echo-assistant/src/lib/interfaces/echo-config.interface.ts

export interface EchoConfig {
  /**
   * API key for Claude integration
   */
  claudeApiKey?: string;

  /**
   * API key for OpenAI integration
   */
  openaiApiKey?: string;

  /**
   * GitHub repository URL that will be managed by Echo
   */
  githubRepo?: string;

  /**
   * Base URL for your backend API
   */
  backendApiUrl: string;

  /**
   * AI model to use (default: "gpt-4o-realtime-preview")
   */
  model?: string;

  /**
   * Custom button text (default: "Echo")
   */
  buttonText?: string;

  /**
   * Custom title for the dialog (default: "Echo AI Assistant")
   */
  dialogTitle?: string;

  /**
   * Custom welcome message shown to users
   */
  welcomeMessage?: string;

  /**
   * Primary color used in the Echo UI (default: #6C5CE7)
   */
  primaryColor?: string;

  /**
   * Secondary color used in the Echo UI (default: #00CEFF)
   */
  secondaryColor?: string;

  /**
   * Enable voice input/output functionality (default: true)
   */
  enableVoice?: boolean;

  /**
   * Authentication token for API requests if needed
   */
  authToken?: string;
}
