# 🚀 Deployment Guide for SyncIt

## Quick Deployment Steps

### 1. Prepare for Deployment

```bash
# 1. Build the project locally to check for errors
npm run build

# 2. Test the production build
npm run start
```

### 2. Deploy to Vercel (Frontend)

#### Option A: GitHub Integration (Recommended)
1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub: `ABHI10092004/syncit`
   - Deploy automatically

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: syncit
# - Directory: ./
# - Override settings? N
```

### 3. Deploy Socket.IO Server (Backend)

#### Option A: Railway (Recommended)
1. **Go to [railway.app](https://railway.app)**
2. **Create new project from GitHub**
3. **Select your repository**
4. **Configure**:
   - **Start Command**: `node server.js`
   - **Port**: `3001`
   - **Environment**: `NODE_ENV=production`

#### Option B: Render
1. **Go to [render.com](https://render.com)**
2. **Create Web Service**
3. **Connect GitHub repository**
4. **Configure**:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Port**: `3001`

#### Option C: Heroku
```bash
# Install Heroku CLI
# Create Procfile
echo "web: node server.js" > Procfile

# Deploy
heroku create your-app-name
git push heroku main
```

### 4. Configure Environment Variables

#### In Vercel Dashboard:
```env
NEXT_PUBLIC_SOCKET_SERVER_URL=https://your-railway-app.railway.app
NODE_ENV=production
```

#### In Railway/Render Dashboard:
```env
NODE_ENV=production
PORT=3001
```

### 5. Test Deployment

1. **Frontend**: Visit your Vercel URL
2. **Backend**: Check Railway/Render URL + `/debug/rooms`
3. **Integration**: Create a room and test functionality

## Environment URLs

After deployment, you'll have:
- **Frontend**: `https://syncit-abhi.vercel.app`
- **Backend**: `https://syncit-server.railway.app`

## Troubleshooting Deployment

### Common Issues:

#### Build Errors
```bash
# Check for TypeScript errors
npm run lint

# Fix any issues and rebuild
npm run build
```

#### Socket.IO Connection Issues
- Ensure `NEXT_PUBLIC_SOCKET_SERVER_URL` is set correctly
- Check CORS settings in server.js
- Verify backend deployment is running

#### Environment Variables
- Double-check all environment variables
- Ensure they start with `NEXT_PUBLIC_` for client-side access
- Restart deployments after changing env vars

## Post-Deployment Checklist

- [ ] Frontend deploys successfully
- [ ] Backend deploys successfully  
- [ ] Environment variables are set
- [ ] Room creation works
- [ ] Room joining works
- [ ] Audio streaming works
- [ ] Multi-device testing completed

## Monitoring

### Vercel
- Check deployment logs in Vercel dashboard
- Monitor function execution and errors

### Railway/Render
- Check application logs
- Monitor resource usage
- Set up health checks

## Updates

To update your deployment:

```bash
# Make changes
git add .
git commit -m "Update: description of changes"
git push origin main

# Vercel will auto-deploy
# Railway/Render will auto-deploy if connected to GitHub
```

## Custom Domain (Optional)

### Vercel:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records

### Railway:
1. Go to Settings → Domains
2. Add custom domain
3. Configure DNS records

---

**Your SyncIt app is now live and ready for users! 🎉**
