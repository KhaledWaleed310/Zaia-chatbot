# ZAIA RAG Chatbot Platform - Frontend

Modern React frontend portal for the ZAIA RAG Chatbot Platform, built with TypeScript, Vite, and TailwindCSS.

## Features

- **Dashboard**: Overview with statistics and quick actions
- **Knowledge Base Management**: Upload and manage document collections
- **Chatbot Configuration**: Create and configure AI chatbots
- **Analytics**: Usage metrics and performance tracking
- **Chat Preview**: Test chatbots directly in the portal
- **Embed Code**: Easy integration with copy-paste embed codes
- **Dark Mode**: Beautiful dark/light theme support
- **Responsive Design**: Works seamlessly on all devices

## Tech Stack

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **TanStack Query**: Data fetching and caching
- **Axios**: HTTP client with interceptors
- **Zustand**: Lightweight state management
- **Recharts**: Beautiful charts and graphs
- **Headless UI**: Accessible UI components
- **React Dropzone**: File upload with drag-and-drop

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

### Type Checking

Run TypeScript type checking:
```bash
npm run type-check
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t zaia-frontend .

# Run container
docker run -p 80:80 zaia-frontend
```

Or use Docker Compose from the project root:

```bash
docker-compose up frontend
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client and endpoints
│   │   └── client.ts     # Axios configuration with interceptors
│   ├── components/       # Reusable components
│   │   ├── Layout.tsx    # Main layout with sidebar
│   │   ├── FileUploader.tsx
│   │   ├── ChatPreview.tsx
│   │   └── EmbedCodeModal.tsx
│   ├── pages/           # Page components
│   │   ├── Dashboard.tsx
│   │   ├── KnowledgeBase/
│   │   │   ├── List.tsx
│   │   │   └── Upload.tsx
│   │   ├── Chatbots/
│   │   │   ├── List.tsx
│   │   │   └── Configure.tsx
│   │   └── Analytics.tsx
│   ├── store/           # State management
│   │   ├── auth.ts      # Authentication state
│   │   └── theme.ts     # Theme state
│   ├── types/           # TypeScript interfaces
│   │   └── index.ts
│   ├── App.tsx          # Root component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── Dockerfile           # Docker configuration
├── nginx.conf           # Nginx configuration
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## Features Overview

### Authentication
- Token-based authentication with JWT
- Auto-redirect on unauthorized access
- Persistent login state

### Knowledge Base Management
- Create and manage knowledge bases
- Upload multiple documents via drag-and-drop
- Real-time upload progress tracking
- Document processing status monitoring
- Support for PDF, TXT, MD, DOC, DOCX files

### Chatbot Configuration
- Link chatbots to knowledge bases
- Configure LLM models (GPT-4, GPT-3.5, Claude)
- Adjust temperature, max tokens, and retrieval settings
- Custom system prompts
- Enable/disable chatbots with toggle

### Analytics
- View conversation and message statistics
- Filter by chatbot and date range
- Interactive charts with Recharts
- Usage insights and trends

### Chat Preview
- Test chatbots directly in the portal
- Real-time message simulation
- Preview widget appearance

### Embed Integration
- Multiple embedding options (Script, React, iframe, API)
- Copy-to-clipboard functionality
- Ready-to-use code snippets

## API Integration

The frontend communicates with the backend API using Axios with automatic:
- JWT token injection
- Error handling
- Request/response interceptors
- Automatic logout on 401 errors

## State Management

- **Zustand**: Lightweight global state
  - Auth state (user, token)
  - Theme preferences (dark/light/system)
- **TanStack Query**: Server state management
  - Automatic caching
  - Background refetching
  - Optimistic updates

## Styling

- **TailwindCSS**: Utility-first styling
- **Dark Mode**: Class-based dark mode support
- **Custom Components**: Pre-built button, input, card styles
- **Responsive**: Mobile-first design
- **Animations**: Smooth transitions and loading states

## Performance

- Code splitting with Vite
- Lazy loading of routes
- Optimized bundle size
- Asset caching with Nginx
- Gzip compression enabled

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

Part of the ZAIA RAG Chatbot Platform
