# Echo Assistant

An Angular library for integrating an AI voice and text assistant into your applications.

## Features

- Interactive AI assistant with voice and text input/output
- WebRTC-based real-time voice communication
- Customizable appearance and behavior
- Works with OpenAI models including gpt-4o-realtime-preview
- Elegant minimalist UI with animation effects

## Installation

```bash
npm install echo-assistant
```

## Basic Usage

1. Import the EchoAssistantModule in your application module:

```typescript
// app.module.ts
import { EchoAssistantModule } from 'echo-assistant';

@NgModule({
  imports: [
    EchoAssistantModule.forRoot({
      backendApiUrl: 'https://your-api-endpoint.com',
      // Other options...
    }),
  ],
})
export class AppModule {}
```

2. For Angular 19+ standalone applications:

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideEchoAssistant } from 'echo-assistant';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideEchoAssistant({
      backendApiUrl: 'https://your-api-endpoint.com',
      // Other options...
    }),
  ],
});
```

3. Add the Echo Assistant component to your template:

```html
<echo-assistant></echo-assistant>
```

## Configuration Options

The Echo Assistant can be configured with the following options:

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| backendApiUrl | string | Base URL for your backend API | (required) |
| model | string | AI model to use | 'gpt-4o-realtime-preview' |
| claudeApiKey | string | API key for Claude integration | undefined |
| openaiApiKey | string | API key for OpenAI integration | undefined |
| githubRepo | string | GitHub repository URL managed by Echo | undefined |
| enableVoice | boolean | Enable voice input/output | true |
| buttonText | string | Custom button text | 'Echo' |
| dialogTitle | string | Custom dialog title | 'Echo AI Assistant' |
| welcomeMessage | string | Custom welcome message | 'Hello! I'm Echo...' |
| primaryColor | string | Primary color for the UI | '#6C5CE7' |
| secondaryColor | string | Secondary color for the UI | '#00CEFF' |
| authToken | string | Authentication token for API requests | undefined |

## Voice Integration

Echo Assistant uses WebRTC for real-time voice communication with the AI. To ensure voice functionality works correctly:

1. Make sure your backend API supports WebRTC connections (echo-demo runs on port 4000 by default)
2. Verify that the microphone permissions are granted by the user
3. Set `enableVoice: true` in your configuration (enabled by default)
4. Set `backendApiUrl` to the URL of your echo-demo server (e.g., 'http://localhost:4000')
5. Set `model` to 'gpt-4o-realtime-preview' for optimal voice performance

## Advanced Usage

### Accessing Services Directly

For more control, you can inject and use the services directly:

```typescript
import { Component } from '@angular/core';
import { AudioChatService, ApiService } from 'echo-assistant';

@Component({
  selector: 'app-custom',
  template: `<button (click)="startVoice()">Start Voice</button>`,
})
export class CustomComponent {
  constructor(
    private audioChatService: AudioChatService,
    private apiService: ApiService
  ) {}

  startVoice(): void {
    this.audioChatService.startListening();
  }
}
```

### Custom Styling

You can customize the appearance by overriding CSS variables:

```css
:root {
  --echo-primary: #3498db;
  --echo-secondary: #2ecc71;
  --echo-gradient: linear-gradient(135deg, #3498db, #2ecc71);
  --echo-glow: 0 0 15px rgba(52, 152, 219, 0.5);
}
```

## Building

To build the library, run:

```bash
ng build echo-assistant
```

## Publishing the Library

Once the project is built, you can publish your library by following these steps:

1. Navigate to the `dist` directory:
   ```bash
   cd dist/echo-assistant
   ```

2. Run the `npm publish` command to publish your library to the npm registry:
   ```bash
   npm publish
   ```

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Troubleshooting

- **Voice not working**: Check browser microphone permissions and console for WebRTC errors
- **Connection errors**: Verify your backend API URL and authentication settings
- **UI issues**: Make sure the library's styles aren't being overridden

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## License

MIT