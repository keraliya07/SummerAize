# SummerAize Frontend

A modern React frontend for the SummerAize document summarization application, built with Vite, shadcn/ui, and Tailwind CSS.

## Features

- **Authentication**: Secure login and signup with JWT tokens
- **File Upload**: Drag-and-drop file upload for PDF and Word documents
- **AI Summarization**: Automatic document summarization using AI
- **Duplicate Detection**: Smart duplicate detection before upload
- **Document Management**: View, download, and manage your summaries
- **Responsive Design**: Beautiful, modern UI that works on all devices
- **Real-time Feedback**: Toast notifications and loading states

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **shadcn/ui** - Beautiful, accessible UI components
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Lucide React** - Beautiful icons
- **Sonner** - Toast notifications

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Backend server running on port 5000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:5000
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── Login.jsx          # Login form component
│   │   └── Signup.jsx         # Signup form component
│   ├── ui/                    # shadcn/ui components
│   ├── Dashboard.jsx          # Main dashboard component
│   └── ProtectedRoute.jsx    # Route protection component
├── contexts/
│   └── AuthContext.js         # Authentication context
├── services/
│   └── api.js                 # API service layer
├── lib/
│   └── utils.js               # Utility functions
├── App.jsx                    # Main app component
└── main.jsx                   # App entry point
```

## API Integration

The frontend integrates with the SummerAize backend API:

- **Authentication**: `/signup`, `/login`
- **File Upload**: `/upload`, `/upload-before-check`
- **Summaries**: `/me/summaries`, `/summaries/:id`
- **File Operations**: `/summaries/:id/download`, `/summaries/:id/view`

## Features Overview

### Authentication
- Secure JWT-based authentication
- Automatic token refresh
- Protected routes
- User session management

### File Upload
- Support for PDF and Word documents
- File size validation (max 10MB)
- Duplicate detection before upload
- Progress indicators and error handling

### Dashboard
- Clean, modern interface
- File upload area with drag-and-drop
- Summary list with search and filtering
- Document preview and download
- Real-time status updates

### UI/UX
- Responsive design for all screen sizes
- Dark/light theme support
- Accessible components
- Smooth animations and transitions
- Toast notifications for feedback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.