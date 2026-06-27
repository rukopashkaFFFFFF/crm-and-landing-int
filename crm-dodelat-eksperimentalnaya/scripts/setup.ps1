param(
  [string]$DbUser = "crm_user",
  [string]$DbPassword = "crm_password",
  [string]$DbName = "crm_db",
  [string]$DbPort = "5432"
)

Write-Host "=== CRM Setup Script ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow
$hasNode = Get-Command node -ErrorAction SilentlyContinue
$hasNpm = Get-Command npm -ErrorAction SilentlyContinue

if (-not $hasNode) { Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red; exit 1 }
if (-not $hasNpm) { Write-Host "ERROR: npm not found." -ForegroundColor Red; exit 1 }

Write-Host "  Node: $(node --version)" -ForegroundColor Green
Write-Host "  npm: $(npm --version)" -ForegroundColor Green

# 2. Create .env.local
Write-Host "[2/6] Creating .env.local..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
  @"
DATABASE_URL="postgresql://${DbUser}:${DbPassword}@localhost:${DbPort}/${DbName}"
NEXTAUTH_SECRET="$( -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }) )"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_placeholder"
UPLOADTHING_SECRET="sk_placeholder"
UPLOADTHING_APP_ID="app_placeholder"
CRON_SECRET="$( -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }) )"
"@ | Set-Content -Path ".env.local"
  Write-Host "  .env.local created" -ForegroundColor Green
} else {
  Write-Host "  .env.local already exists, skipping" -ForegroundColor Green
}

# 3. Install dependencies
Write-Host "[3/6] Installing npm dependencies..." -ForegroundColor Yellow
npm install
Write-Host "  Dependencies installed" -ForegroundColor Green

# 4. Generate Prisma client
Write-Host "[4/6] Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "  Prisma client generated" -ForegroundColor Green

# 5. Run migrations
Write-Host "[5/6] Running database migrations..." -ForegroundColor Yellow
$canConnect = $true
try {
  npx prisma db push --accept-data-loss 2>&1 | Out-Null
  Write-Host "  Database schema applied" -ForegroundColor Green
} catch {
  $canConnect = $false
  Write-Host "  WARNING: Could not connect to PostgreSQL at localhost:${DbPort}" -ForegroundColor Yellow
  Write-Host "  Make sure PostgreSQL is running. You can use Docker:" -ForegroundColor Yellow
  Write-Host "  docker run -d --name crm-db -e POSTGRES_USER=${DbUser} -e POSTGRES_PASSWORD=${DbPassword} -e POSTGRES_DB=${DbName} -p ${DbPort}:5432 postgres:16-alpine" -ForegroundColor Cyan
}

# 6. Seed database
if ($canConnect) {
  Write-Host "[6/6] Seeding database..." -ForegroundColor Yellow
  npx prisma db seed
  Write-Host "  Database seeded with sample data" -ForegroundColor Green
  Write-Host ""
  Write-Host "=== Setup Complete! ===" -ForegroundColor Cyan
  Write-Host "Run 'npm run dev' to start the development server." -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Login credentials:" -ForegroundColor White
  Write-Host "  Owner:     alex@agency.com / password123" -ForegroundColor White
  Write-Host "  PM:        sarah@agency.com / password123" -ForegroundColor White
  Write-Host "  Developer: marcus@agency.com / password123" -ForegroundColor White
} else {
  Write-Host ""
  Write-Host "=== Setup Incomplete ===" -ForegroundColor Yellow
  Write-Host "Start PostgreSQL, then run:" -ForegroundColor Yellow
  Write-Host "  npx prisma db push && npx prisma db seed" -ForegroundColor Cyan
  Write-Host "  npm run dev" -ForegroundColor Cyan
}
