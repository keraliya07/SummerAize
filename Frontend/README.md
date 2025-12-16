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

- **React 18**
- **Vite**
- **shadcn/ui**
- **Tailwind CSS**
- **React Router**
- **Axios**
- **Lucide React**
- **Sonner**

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Backend server running on port 5000 (default)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root:
```env
VITE_API_URL=http://localhost:5000
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview # optional local preview
```

The production build is emitted to the `dist` directory.

## Project Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── Signup.jsx
│   ├── ui/
│   ├── Dashboard.jsx
│   └── ProtectedRoute.jsx
├── contexts/
│   ├── AuthContext.jsx
│   └── ThemeContext.jsx
├── services/
│   └── api.jsx
├── lib/
│   └── utils.js
├── App.jsx
└── main.jsx
```

## API Integration

The frontend integrates with the SummerAize backend API:

- **Authentication**: `/signup`, `/login`, `/me`
- **File Upload**: `/upload`, `/upload-before-check`
- **Summaries**: `/me/summaries`, `/summaries/:id`, `/summaries/:id/summarize`
- **File Operations**: `/summaries/:id/download`, `/summaries/:id/view`, `DELETE /summaries/:id`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT