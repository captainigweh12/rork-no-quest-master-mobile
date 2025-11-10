# Remote Environment Setup (Linux/Rork)

This guide helps you set up the Rork environment to match your Windows development setup.

## Quick Setup (Automated)

Run this single command on the remote Linux machine:

```bash
curl -fsSL https://raw.githubusercontent.com/captainigweh12/rork-no-quest-master-mobile/main/scripts/setup-remote.sh | bash
```

Or download and run locally:

```bash
curl -fsSL https://raw.githubusercontent.com/captainigweh12/rork-no-quest-master-mobile/main/scripts/setup-remote.sh -o setup.sh
chmod +x setup.sh
./setup.sh
```

## What the script does

1. **Backs up** existing `.env` file (if present)
2. **Removes** stale `/home/user/rork-app` directory
3. **Clones** fresh repo from GitHub
4. **Checks out** the correct branch (default: `main`)
5. **Restores** your `.env` from backup
6. **Validates** `babel.config.js` has UTF-8 encoding and module-resolver plugin
7. **Installs** dependencies via Bun (or npm fallback)
8. **Clears** all caches
9. **Validates** the setup

## Manual Setup (Step-by-step)

If you prefer manual control:

### 1. Clone the repository

```bash
# Backup .env if it exists
mkdir -p ~/backup
cp -f /home/user/rork-app/.env ~/backup/.env.$(date +%s) 2>/dev/null || true

# Remove stale folder
rm -rf /home/user/rork-app

# Clone fresh
git clone https://github.com/captainigweh12/rork-no-quest-master-mobile.git /home/user/rork-app
cd /home/user/rork-app

# Checkout your branch
git checkout main
git reset --hard origin/main
```

### 2. Restore environment variables

```bash
# Restore .env from backup
cp ~/backup/.env.* ./.env

# Or create new .env with your keys
nano .env
```

### 3. Validate Babel configuration

```bash
# Check if module-resolver is present
node -e "const m=require('./babel.config.js');const fn=m.default||m;const out=(typeof fn==='function'?fn({cache:()=>{}}):fn)||{};const mr=(out.plugins||[]).find(p=>Array.isArray(p)&&p[0]==='module-resolver');console.log('HAS_MODULE_RESOLVER:',!!mr,'ALIASES:', mr?Object.keys(mr[1].alias):null)"
```

Expected output:
```
HAS_MODULE_RESOLVER: true ALIASES: [ '@', '@rork-ai/toolkit-sdk', '@rork-ai/toolkit-dev-sdk' ]
```

### 4. Install dependencies

```bash
bun install
bun add -d babel-plugin-module-resolver
```

### 5. Clear caches and validate

```bash
rm -rf .expo .cache node_modules/.cache
bun run diagnose
```

## Starting the app

After setup, use any of these commands:

```bash
# Auto-fix and start (recommended)
bun run start:auto

# Auto-fix with web
bun run start:auto -- --web

# Auto-fix with tunnel
bun run start:auto -- --tunnel

# Force start even if diagnostics fail
bun run start:auto -- --force

# Traditional workflow (fix → diagnose → start)
bun run doctor

# Manual diagnostics only
bun run diagnose
```

## Sync check

Verify you're running the same code as Windows:

```bash
pwd
git remote -v
git branch --show-current
git rev-parse --short HEAD
```

Compare branch and commit SHA with your Windows VS Code Git panel.

## Troubleshooting

### UTF-16 encoding error
If you see UTF-16 errors, the Babel config wasn't synced correctly:
```bash
bun run sync:diagnose
```

### Missing scripts
If `bun run start:auto` says "Script not found", pull latest:
```bash
git pull origin main
bun install
```

### Permission denied on scripts
```bash
chmod +x scripts/*.sh scripts/*.mjs
```

## Environment variables required

Ensure your `.env` includes (at minimum):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- Any other service keys your app needs

## Auto-fix behavior

`start:auto` automatically:
- Detects and aborts on UTF-16 encoding (with instructions)
- Injects module-resolver plugin if missing
- Creates stub files if missing
- Rewrites legacy `@rork/toolkit-sdk` imports to `@rork-ai/toolkit-sdk`
- Runs diagnostics and attempts force fix if needed
- Launches Expo
