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

### Option 2: Render.com Deployment (Recommended)

For full functionality with dynamic data, Render.com provides excellent Node.js support with a free tier:

#### Deploy to Render.com

1. **Environment Setup**:
   - Copy `env-example.txt` to `.env` in your project root
   - Update the admin credentials in `.env`:
     ```bash
     SUPER_ADMIN_USERNAME=your_admin_username
     SUPER_ADMIN_PASSWORD=your_secure_password
     ```

2. **Connect your GitHub repository** to Render:
   - Go to [render.com](https://render.com) and sign up/login
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository

3. **Configure the service**:
   - **Name**: amsal-fc (or your preferred name)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Production

4. **Environment Variables** (set these in Render dashboard):
   - `SUPER_ADMIN_USERNAME`: your_admin_username
   - `SUPER_ADMIN_PASSWORD`: your_secure_password
   - `NODE_ENV`: production (automatically set by Render)

5. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - Your app will be available at `https://your-service-name.onrender.com`

#### Alternative Node.js Platforms

- **Railway**: Excellent for Node.js apps with database support
- **Vercel**: Best for Next.js/React apps, but can deploy Express
- **Heroku**: Traditional Node.js hosting

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **File Uploads**: Multer
- **Styling**: Custom CSS with glassmorphism effects

## License

MIT License
