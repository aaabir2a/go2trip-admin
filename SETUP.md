# Go2Trip Admin — Setup Guide

## Prerequisites
- Node.js 18+

## 1. Install dependencies
```bash
npm install
```

## 2. Start development server
```bash
npm run dev
```

Admin runs at: http://localhost:5173
(Proxies /api → http://localhost:8000)

## 3. Login
Use the superuser credentials created in the backend setup.
Only users with role=admin can access the admin panel.

## 4. Build for production
```bash
npm run build
```
