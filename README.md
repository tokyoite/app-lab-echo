I'll update the instructions to include information about packaging, installing locally, and publishing to npm.

# Echo Assistant Library

An Angular library that provides an AI assistant with voice and text capabilities for your applications.

## Features

- Interactive AI assistant with voice and text chat
- WebRTC-based real-time voice communication
- Works with OpenAI GPT-4o realtime preview for voice features
- Easy integration with your Angular applications
- Customizable UI and behavior

## Installation

```bash
npm install echo-assistant
```

## Setup Instructions

1. Install the package in your Angular project:

```bash
npm install echo-assistant
```

2. Import the EchoAssistantModule in your app.module.ts:

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { EchoAssistantModule } from 'echo-assistant';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    // Import the EchoAssistantModule with your configuration
    EchoAssistantModule.forRoot({
      backendApiUrl: 'http://localhost:4000', // Your backend API URL (the echo-demo server)
      model: 'gpt-4o-realtime-preview', // The OpenAI model to use for voice features
      enableVoice: true, // Enable voice features
      // Optional API keys (if needed)
      openaiApiKey: 'your-openai-api-key', // Only required if your backend doesn't handle API keys
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

3. For Angular 19+ standalone applications, update your app.config.ts:

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideEchoAssistant } from 'echo-assistant';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(),
    // Configure Echo Assistant
    ...provideEchoAssistant({
      backendApiUrl: 'http://localhost:4000', // The echo-demo server URL
      model: 'gpt-4o-realtime-preview',       
      enableVoice: true,
      // Additional UI configuration
      dialogTitle: 'Echo AI Assistant',
      primaryColor: '#6C5CE7',
      secondaryColor: '#00CEFF',
    }),
  ],
};
```

4. Add the component to your Angular templates:

```html
<echo-assistant></echo-assistant>
```

## Using with the Echo Demo Backend

This library is designed to work with the echo-demo backend server which should run on port 4000:

1. Make sure the echo-demo server is running
2. Configure the `backendApiUrl` to point to the echo-demo server (http://localhost:4000)
3. Ensure your OpenAI API key is configured in the echo-demo server
4. Start your Angular application

## Local Development and Installation

### Building the Library

To build the library:

```bash
cd echo-assistant-lib
ng build echo-assistant
```

### Testing Locally

There are two methods to test your library locally:

#### Method 1: Using npm pack

1. Build the library:
```bash
cd echo-assistant-lib
ng build echo-assistant
```

2. Create a tarball package:
```bash
cd dist/echo-assistant
npm pack
```
This generates a file like `echo-assistant-0.0.1.tgz`

3. Install the tarball in your test project:
```bash
cd path/to/your/test-project
npm install /path/to/echo-assistant-lib/dist/echo-assistant/echo-assistant-0.0.1.tgz
```

#### Method 2: Using npm link

1. Create a link to your library:
```bash
cd echo-assistant-lib/dist/echo-assistant
npm link
```

2. Link to the library in your test project:
```bash
cd path/to/your/test-project
npm link echo-assistant
```

3. When you make changes to the library, rebuild it:
```bash
cd echo-assistant-lib
ng build echo-assistant
```
The changes will be reflected in your test project.

## Publishing to npm

When you're ready to publish your library to npm:

1. Prepare your package:
   - Update the version in `projects/echo-assistant/package.json`
   - Ensure the README and LICENSE files are up to date
   - Make sure you have an npm account (create one at npmjs.com if needed)

2. Build the library for production:
```bash
ng build echo-assistant --configuration=production
```

3. Publish to npm:
```bash
cd dist/echo-assistant
npm login
npm publish
```

4. For subsequent updates:
   - Update the version in `projects/echo-assistant/package.json`
   - Rebuild and publish again

### Private npm Registry

For organizations with a private npm registry:

```bash
cd dist/echo-assistant
npm login --registry=https://your-private-registry-url
npm publish --registry=https://your-private-registry-url
```

## API Reference

### EchoConfig Interface

Configuration options for the Echo Assistant:

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| backendApiUrl | string | Base URL for your backend API (required) | - |
| model | string | AI model to use | 'gpt-4o-realtime-preview' |
| enableVoice | boolean | Enable voice input/output | true |
| openaiApiKey | string | API key for OpenAI | undefined |
| claudeApiKey | string | API key for Claude | undefined |
| authToken | string | Auth token for API requests | undefined |
| githubRepo | string | GitHub repo URL | undefined |
| dialogTitle | string | Custom dialog title | 'Echo AI Assistant' |
| buttonText | string | Custom button text | 'Echo' |
| welcomeMessage | string | Custom welcome message | "Hello! I'm Echo..." |
| primaryColor | string | Primary UI color | '#6C5CE7' |
| secondaryColor | string | Secondary UI color | '#00CEFF' |

## Running Tests

```bash
ng test echo-assistant
```

## License

MIT
