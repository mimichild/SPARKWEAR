#!/bin/bash
# Visual regression tests using agent-browser + static web export
# Exports Expo web build, serves it statically, then runs browser checks.

set -e

PORT=8092
BASE_URL="http://localhost:$PORT"
PASS=0
FAIL=0
ERRORS=()

log_pass() { echo "  ✅ $1"; PASS=$((PASS+1)); }
log_fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); ERRORS+=("$1"); }

# ── Build web export ──────────────────────────────────────────
echo ""
echo "🔨 Building web export..."
if ! npx expo export --platform web > /tmp/expo-export.log 2>&1; then
  echo "❌ Web export failed:"
  tail -20 /tmp/expo-export.log
  exit 1
fi
echo "✓ Web export complete (dist/)"

# ── Start static server ───────────────────────────────────────
echo "🌐 Starting static server on port $PORT..."
npx serve dist --listen $PORT --single > /tmp/serve.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill $SERVER_PID 2>/dev/null || true
  npx agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

# Wait for server
for i in $(seq 1 15); do
  if curl -s "$BASE_URL" > /dev/null 2>&1; then break; fi
  sleep 1
done

if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
  echo "❌ Static server failed to start"
  exit 1
fi
echo "✓ Server ready"
echo ""

# ── Test: Home Screen ─────────────────────────────────────────
echo "📋 Test: Home Screen"
npx agent-browser open "$BASE_URL" 2>/dev/null
# Wait for React to render (network idle = JS execution complete)
npx agent-browser wait --load networkidle 2>/dev/null
npx agent-browser wait 3000 2>/dev/null

TITLE=$(npx agent-browser get title 2>/dev/null)
if echo "$TITLE" | grep -qi "sparkwear"; then
  log_pass "Page title contains SPARKWEAR"
else
  log_fail "Page title missing SPARKWEAR (got: $TITLE)"
fi

SNAPSHOT=$(npx agent-browser snapshot 2>/dev/null)

if echo "$SNAPSHOT" | grep -q "SPARK WEAR"; then
  log_pass "SPARK WEAR 標題存在"
else
  log_fail "SPARK WEAR 標題不存在"
fi

if echo "$SNAPSHOT" | grep -q "v2.0.0"; then
  log_pass "版本號 v2.0.0 存在"
else
  log_fail "版本號 v2.0.0 不存在"
fi

if echo "$SNAPSHOT" | grep -q "我的衣櫃"; then
  log_pass "我的衣櫃 按鈕存在"
else
  log_fail "我的衣櫃 按鈕不存在"
fi

if echo "$SNAPSHOT" | grep -q "穿搭紀錄"; then
  log_pass "穿搭紀錄 按鈕存在"
else
  log_fail "穿搭紀錄 按鈕不存在"
fi

if echo "$SNAPSHOT" | grep -q "設定"; then
  log_pass "設定 按鈕存在"
else
  log_fail "設定 按鈕不存在"
fi

npx agent-browser screenshot /tmp/e2e-home.png 2>/dev/null
log_pass "首頁截圖 → /tmp/e2e-home.png"
echo ""

# ── Test: Closet Navigation ───────────────────────────────────
echo "📋 Test: Closet Navigation"
npx agent-browser find text "我的衣櫃" click 2>/dev/null
npx agent-browser wait --load networkidle 2>/dev/null
npx agent-browser wait 2000 2>/dev/null

SNAPSHOT=$(npx agent-browser snapshot 2>/dev/null)

for tab in "單品" "照片" "分類" "排行"; do
  if echo "$SNAPSHOT" | grep -q "$tab"; then
    log_pass "衣櫃 Tab: $tab 存在"
  else
    log_fail "衣櫃 Tab: $tab 不存在"
  fi
done

npx agent-browser screenshot /tmp/e2e-closet.png 2>/dev/null
log_pass "衣櫃頁截圖 → /tmp/e2e-closet.png"

# Phase 1: FAB button and items screen check
if echo "$SNAPSHOT" | grep -q "Phase 1\|還沒有單品\|載入中\|我的衣櫃"; then
  log_pass "Phase 1: 單品列表頁面渲染正確"
else
  log_fail "Phase 1: 單品列表頁面內容異常"
fi
echo ""

# ── Test: Outfits Navigation ──────────────────────────────────
echo "📋 Test: Outfits Navigation"
npx agent-browser open "$BASE_URL" 2>/dev/null
npx agent-browser wait --load networkidle 2>/dev/null
npx agent-browser find text "穿搭紀錄" click 2>/dev/null
npx agent-browser wait 2000 2>/dev/null

SNAPSHOT=$(npx agent-browser snapshot 2>/dev/null)
if echo "$SNAPSHOT" | grep -q "穿搭紀錄\|還沒有穿搭\|載入中"; then
  log_pass "Phase 2: 穿搭紀錄頁面渲染正確"
else
  log_fail "Phase 2: 穿搭紀錄頁面異常"
fi

if echo "$SNAPSHOT" | grep -q "新→舊\|舊→新\|搜尋\|← 返回"; then
  log_pass "Phase 2: header 按鈕存在"
else
  log_fail "Phase 2: header 按鈕不存在"
fi

npx agent-browser screenshot /tmp/e2e-outfits.png 2>/dev/null
log_pass "穿搭頁截圖 → /tmp/e2e-outfits.png"
echo ""

# ── Summary ───────────────────────────────────────────────────
echo "══════════════════════════════════════"
echo "  視覺回歸測試結果"
echo "  ✅ 通過: $PASS"
echo "  ❌ 失敗: $FAIL"
echo "══════════════════════════════════════"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "失敗項目："
  for err in "${ERRORS[@]}"; do
    echo "  • $err"
  done
fi

[ $FAIL -eq 0 ]
