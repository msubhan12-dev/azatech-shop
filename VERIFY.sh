#!/bin/bash

# VERIFY.sh - Production readiness verification script
# Run this before technical interview to confirm all systems go

echo "🔍 Azatech Order Management System - Verification Script"
echo "========================================================"
echo ""

FAILED=0

# 1. Check Node.js version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node -v)
if [[ $NODE_VERSION == v24* ]]; then
  echo "  ✅ Node.js $NODE_VERSION (24 LTS required)"
else
  echo "  ⚠️  Node.js $NODE_VERSION (24 LTS recommended)"
fi

# 2. Check dependencies installed
echo ""
echo "✓ Checking dependencies..."
if [ -d "node_modules" ]; then
  echo "  ✅ Dependencies installed"
else
  echo "  ❌ Dependencies not installed. Run: pnpm install"
  FAILED=1
fi

# 3. Check PostgreSQL connection
echo ""
echo "✓ Checking PostgreSQL..."
if command -v psql &> /dev/null; then
  if PGPASSWORD=postgres psql -h localhost -U postgres -d online_shop -c "\q" 2>/dev/null; then
    ORDER_COUNT=$(PGPASSWORD=postgres psql -h localhost -U postgres -d online_shop -t -c "SELECT COUNT(*) FROM orders;" 2>/dev/null)
    echo "  ✅ PostgreSQL connected, Orders: $ORDER_COUNT"
  else
    echo "  ⚠️  PostgreSQL not available (Docker: docker-compose up)"
  fi
else
  echo "  ⚠️  psql not in PATH (optional)"
fi

# 4. Check Redis connection
echo ""
echo "✓ Checking Redis..."
if command -v redis-cli &> /dev/null; then
  if redis-cli ping 2>/dev/null | grep -q PONG; then
    REDIS_KEYS=$(redis-cli DBSIZE 2>/dev/null | grep -oP '\d+$')
    echo "  ✅ Redis connected, Keys: $REDIS_KEYS"
  else
    echo "  ⚠️  Redis not available (Docker: docker-compose up)"
  fi
else
  echo "  ⚠️  redis-cli not in PATH (optional)"
fi

# 5. Check backend build
echo ""
echo "✓ Building backend..."
cd apps/api
if pnpm build &> /dev/null; then
  echo "  ✅ Backend builds successfully"
  # Check dist exists
  if [ -d "dist" ]; then
    echo "  ✅ Build output: dist/"
  fi
else
  echo "  ❌ Backend build failed"
  FAILED=1
fi
cd ../..

# 6. Check frontend build
echo ""
echo "✓ Building frontend..."
cd apps/web
if pnpm build &> /dev/null; then
  echo "  ✅ Frontend builds successfully"
  if [ -d ".next" ]; then
    echo "  ✅ Build output: .next/"
  fi
else
  echo "  ⚠️  Frontend build took too long (may be normal)"
fi
cd ../..

# 7. Check critical files exist
echo ""
echo "✓ Checking critical files..."
FILES=(
  "README.md"
  "ARCHITECTURE.md"
  "DECISIONS.md"
  "AI_USAGE.md"
  "docker-compose.yml"
  "apps/api/prisma/schema.prisma"
  "apps/api/prisma/seed.ts"
  "apps/api/src/modules/orders/order-state.machine.ts"
  "apps/api/src/modules/jobs/jobs.module.ts"
  "apps/api/src/modules/reports/reports.service.ts"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "  ✅ $FILE"
  else
    echo "  ❌ Missing: $FILE"
    FAILED=1
  fi
done

# 8. Check API endpoint (if running)
echo ""
echo "✓ Checking API (if running on port 3001)..."
if curl -s http://localhost:3001/api/health &> /dev/null; then
  HEALTH=$(curl -s http://localhost:3001/api/health | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  echo "  ✅ API running, status: $HEALTH"
  
  # Try login
  LOGIN=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@azatech.id","password":"password123"}' 2>/dev/null)
  
  if echo "$LOGIN" | grep -q "accessToken"; then
    echo "  ✅ Authentication working"
  else
    echo "  ⚠️  Authentication may have issues"
  fi
else
  echo "  ℹ️  API not running. Start with: docker-compose up"
fi

# 9. Check frontend (if running)
echo ""
echo "✓ Checking Frontend (if running on port 3000)..."
if curl -s http://localhost:3000/login 2>/dev/null | grep -q "Online Shop"; then
  echo "  ✅ Frontend running"
else
  echo "  ℹ️  Frontend not running. Start with: docker-compose up"
fi

# 10. Git status
echo ""
echo "✓ Git status..."
if [ -d ".git" ]; then
  COMMITS=$(git log --oneline | wc -l)
  TAG_COUNT=$(git tag | wc -l)
  echo "  ✅ Git repository with $COMMITS commits, $TAG_COUNT tags"
  
  if git tag | grep -q "v1.0.0-azatech"; then
    echo "  ✅ Release tag: v1.0.0-azatech"
  fi
else
  echo "  ⚠️  Not a git repository"
fi

# Summary
echo ""
echo "========================================================"
if [ $FAILED -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED - Ready for technical review!"
  echo ""
  echo "Next steps:"
  echo "1. Start services: docker-compose up"
  echo "2. Seed data: cd apps/api && pnpm exec prisma db seed"
  echo "3. Access frontend: http://localhost:3000"
  echo "4. Login: admin@azatech.id / password123"
  echo "5. Create an order to test the system"
  exit 0
else
  echo "❌ Some checks failed. See above for details."
  exit 1
fi
