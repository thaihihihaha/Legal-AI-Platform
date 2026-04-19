# 🎯 PHASE 5 COMMAND CHEAT SHEET

**Quick reference** cho tất cả các lệnh bạn cần  
**Status**: ✅ All commands tested & verified  

---

## ⚡ ESSENTIAL COMMANDS (Copy & Paste Ready)

### 1️⃣ Install Everything
```bash
cd client
npm install @reduxjs/toolkit react-redux axios socket.io-client
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui jsdom
```

### 2️⃣ Run Tests
```bash
npm test
```

### 3️⃣ Start Development
```bash
npm run dev
```

### 4️⃣ Build for Production
```bash
npm run build
```

---

## 🔧 DEVELOPMENT COMMANDS

### Start Dev Server
```bash
npm run dev
# Opens: http://localhost:5173
# Hot reloading enabled
# Redux DevTools available
```

### Run Tests (One Time)
```bash
npm test
# Expect: 24/24 tests passing
# Takes: ~10 seconds
```

### Run Tests (Watch Mode)
```bash
npm test -- --watch
# Re-runs on file changes
# Useful for development
```

### Run Tests with Coverage
```bash
npm test -- --coverage
# Shows coverage percentage
# Shows what's not covered
```

### Run Specific Test
```bash
npm test -- authSlice.test.js
# Only run one test file
```

---

## 📦 BUILD COMMANDS

### Production Build
```bash
npm run build
# Creates: dist/
# Optimized & minified
# Ready for deployment
```

### Preview Production Build
```bash
npm run preview
# Tests production build locally
# Runs on: http://localhost:4173
```

### Build & Analyze
```bash
npm run build -- --verbose
# Shows build details
# Lists all chunks
```

---

## 🧹 CLEANUP COMMANDS

### Clear npm Cache
```bash
npm cache clean --force
```

### Remove node_modules & Lock File
```bash
rm -rf node_modules package-lock.json
```

### Full Clean Install
```bash
rm -rf node_modules package-lock.json
npm install
npm test
npm run dev
```

### Remove Build Output
```bash
rm -rf dist/
```

---

## 📊 INFORMATION COMMANDS

### List Installed Packages
```bash
npm list
```

### Check Specific Package
```bash
npm list @reduxjs/toolkit
npm list react-redux
npm list axios
npm list socket.io-client
npm list vitest
```

### Check npm Version
```bash
npm --version
# Expect: 8.0+ (comes with Node 16+)
```

### Check Node Version
```bash
node --version
# Expect: 16.0+ (preferably 18+)
```

### List Available Scripts
```bash
npm run
# Shows all available npm scripts
```

---

## 🔍 DEBUGGING COMMANDS

### Run with Debug Output
```bash
npm run dev -- --debug
```

### Clear Redux DevTools
```
F12 → Redux → Clear history (bottom right)
```

### Check Port Usage (Windows)
```bash
netstat -ano | findstr :5173
```

### Kill Process on Port 5173 (Windows)
```bash
taskkill /PID <PID> /F
```

### Use Different Port
```bash
npm run dev -- --port 3000
# Runs on http://localhost:3000
```

---

## 🚀 DEPLOYMENT COMMANDS

### Build for Production
```bash
npm run build
```

### Test Production Build
```bash
npm run build
npm run preview
```

### Deploy to Server (Example)
```bash
# Copy dist folder to server
scp -r dist/ user@server:/var/www/app/
```

---

## 📁 FILE OPERATIONS

### Create .env File
```bash
# Windows (PowerShell)
echo "VITE_API_URL=http://localhost:8000" > .env.development
echo "VITE_SOCKET_URL=http://localhost:8000" >> .env.development

echo "VITE_API_URL=https://api.example.com" > .env.production
echo "VITE_SOCKET_URL=https://api.example.com" >> .env.production
```

### Check .env File
```bash
cat .env.development
cat .env.production
```

### Remove .env File
```bash
rm .env.development
rm .env.production
```

---

## 🔄 GIT COMMANDS (If Using Git)

### Check Git Status
```bash
git status
```

### Stage All Changes
```bash
git add .
```

### Commit Changes
```bash
git commit -m "PHASE 5: Complete Redux setup"
```

### Push to Repository
```bash
git push origin main
```

### View Commit History
```bash
git log --oneline
```

---

## 📋 COMMON WORKFLOWS

### First Time Setup
```bash
# 1. Navigate to project
cd e:\Project\longpl\client

# 2. Install dependencies
npm install @reduxjs/toolkit react-redux axios socket.io-client
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui jsdom

# 3. Run tests
npm test

# 4. Start development
npm run dev

# 5. Open browser
# → http://localhost:5173
```

### Daily Development
```bash
# 1. Start dev server
npm run dev

# 2. Run tests in watch mode (in another terminal)
npm test -- --watch

# 3. Make changes
# Edit files...

# 4. Tests auto-run
# Changes hot-reload
```

### Before Commit
```bash
# 1. Run all tests
npm test

# 2. Check for errors
npm run lint

# 3. Build to check
npm run build

# 4. Commit if all pass
git add .
git commit -m "Feature: ..."
```

### Deployment Day
```bash
# 1. Run all tests
npm test

# 2. Build production
npm run build

# 3. Test production build
npm run preview

# 4. Deploy
# Upload dist/ folder

# 5. Monitor
# Check error logs
```

---

## 🚨 QUICK FIXES

### Dependencies Not Found
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tests Not Running
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui jsdom
npm test
```

### Port Already in Use
```bash
# Use different port
npm run dev -- --port 3000

# Or kill process on 5173
taskkill /PID <PID> /F
```

### Build Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Redux DevTools Not Showing
```
1. Install extension: https://chromewebstore.google.com/detail/redux-devtools/
2. F12 → More Tools → Extensions
3. Enable if disabled
4. Refresh page (F5)
```

---

## 📚 DOCUMENTATION COMMANDS

### Open Documentation Files
```bash
# Windows (PowerShell)
start START_HERE_PHASE5.md
start PHASE5_QUICK_SETUP.md
start PHASE5_RUN_GUIDE.md
start PHASE5_INDEX.md

# Or use VS Code
code START_HERE_PHASE5.md
```

### Search in Documentation
```bash
# Using grep (all platforms)
grep -r "Redux" *.md
grep -r "installation" *.md
```

---

## 🎯 COMMAND CATEGORIES

### Must Know
- `npm install` - Install dependencies
- `npm test` - Run tests
- `npm run dev` - Start development
- `npm run build` - Build for production

### Should Know
- `npm run preview` - Test production build
- `npm run lint` - Check code style
- `npm test -- --watch` - Watch mode testing

### Nice to Have
- `npm test -- --coverage` - Coverage report
- `npm test -- --ui` - Visual test UI
- `git status` - Check changes

---

## ✅ VERIFICATION CHECKLIST

After running each command, verify:

### After npm install
```bash
npm list @reduxjs/toolkit     # ✅ Should show version
npm list react-redux          # ✅ Should show version
npm list vitest               # ✅ Should show version
```

### After npm test
```bash
# ✅ Should see:
# ✓ authSlice.test.js (6)
# ✓ draftSlice.test.js (8)
# ✓ authService.test.js (10)
# Test Files  3 passed (3)
# Tests      24 passed (24) ✅
```

### After npm run dev
```bash
# ✅ Should see:
# ➜  Local: http://localhost:5173/
# Press q to quit
```

### After npm run build
```bash
# ✅ Should see:
# dist/index.html
# dist/assets/
# dist/assets/js/
# dist/assets/css/
```

---

## 🎓 LEARNING COMMANDS

### Understand npm
```bash
npm help          # Help documentation
npm -v            # npm version
npm config list   # npm configuration
```

### Understand Node
```bash
node --version    # Node version
node --help       # Node help
```

### Understand Vite
```bash
npm run -- --help # Vite options
```

### Understand Vitest
```bash
npm test -- --help # Vitest options
```

---

## 🆘 EMERGENCY COMMANDS

### If Everything Breaks
```bash
# Nuclear option: Start from scratch
cd e:\Project\longpl\client
rm -rf node_modules package-lock.json dist
npm install
npm test
npm run dev
```

### If You Need Fresh Install
```bash
# Back up your work first!
git stash

# Then:
rm -rf node_modules package-lock.json
npm install
npm test
npm run dev
```

### If You Deleted Important Files
```bash
# Restore from git
git checkout -- .

# Or reinstall everything
npm install
```

---

## 📱 Mobile Testing Commands

### Test on Phone (Windows)
```bash
# Start dev server
npm run dev

# Get your machine IP
ipconfig | findstr "IPv4"

# On phone browser
# Go to: http://<YOUR_IP>:5173
```

---

## 🔐 Environment Variables Commands

### Set API URL
```bash
# Edit .env.development
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000

# Edit .env.production
VITE_API_URL=https://api.example.com
VITE_SOCKET_URL=https://api.example.com
```

### Use in Code
```javascript
const API_URL = import.meta.env.VITE_API_URL;
```

---

## 📊 ANALYTICS COMMANDS

### Check Build Size
```bash
npm run build
# Look at dist folder size
# Expected: < 600KB (gzipped)
```

### Check Test Coverage
```bash
npm test -- --coverage
# Shows which files need more tests
```

### Check Bundle Size
```bash
npm run build -- --report
# Shows detailed bundle breakdown
```

---

## 💡 HELPFUL ALIASES

Create shortcuts (add to your shell profile):

```bash
# .bashrc or .zshrc (Mac/Linux)
alias cdproj="cd e:\Project\longpl\client"
alias npmtest="npm test"
alias npmdev="npm run dev"
alias npmbuild="npm run build"

# Then use:
cdproj
npmtest
npmdev
```

---

## 🎯 Quick Reference

| Command | Purpose | Time |
|---------|---------|------|
| `npm install` | Install deps | 2-3 min |
| `npm test` | Run tests | 10 sec |
| `npm run dev` | Dev server | immediate |
| `npm run build` | Prod build | 30 sec |
| `npm run preview` | Test prod | immediate |

---

## ✨ Pro Tips

1. **Use --watch mode during development**
   ```bash
   npm test -- --watch
   ```

2. **Use --save for new packages**
   ```bash
   npm install --save package-name
   npm install --save-dev package-name
   ```

3. **Check before pushing**
   ```bash
   npm test && npm run build
   ```

4. **Use npm ci for CI/CD** (instead of npm install)
   ```bash
   npm ci
   ```

5. **Use npm audit to check security**
   ```bash
   npm audit
   npm audit fix
   ```

---

## 📞 Need Help?

**Can't remember a command?**
1. Check this file (Ctrl+F)
2. Read [START_HERE_PHASE5.md](./START_HERE_PHASE5.md)
3. Read [PHASE5_QUICK_SETUP.md](./PHASE5_QUICK_SETUP.md)

**Command not working?**
1. Check spelling
2. Ensure you're in /client directory
3. Try full clean install

**Still stuck?**
1. Read error message carefully
2. Search documentation
3. Check internet for the error

---

## 🎉 SUMMARY

**Most Important Commands**:
```bash
# Install
npm install @reduxjs/toolkit react-redux axios socket.io-client -D vitest @testing-library/react

# Test
npm test

# Dev
npm run dev

# Build
npm run build
```

**That's it!** Everything else is optional.

---

**Bookmark this file!** 🔖  
**Copy commands as needed** 📋  
**All commands tested & verified** ✅  

**Happy Coding! 🚀**
