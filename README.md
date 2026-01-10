# AMSAL FC Website

A modern football club website built with vanilla JavaScript, HTML, and CSS.

## Features

- Responsive design with glassmorphism effects
- Dark/Light theme toggle
- Staff and player management
- News and announcements
- Interactive ground information
- Real-time updates with Socket.IO

## Local Development

```bash
npm install
npm run dev
```

## Deployment

### Option 1: Netlify (Static Version)

1. Build the static version:
```bash
npm run build
```

2. Deploy the `dist/` folder to Netlify

### Option 2: Full Node.js Deployment

For full functionality with dynamic data, use platforms that support Node.js:

- **Vercel**: Best for Next.js/React apps, but can deploy Express
- **Railway**: Excellent for Node.js apps with database support
- **Render**: Free tier available for Node.js applications
- **Heroku**: Traditional Node.js hosting

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **File Uploads**: Multer
- **Styling**: Custom CSS with glassmorphism effects

## License

MIT License
