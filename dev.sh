#!/usr/bin/env bash
# ServerKit development launcher and validation tool.
#
# Usage:
#   ./dev.sh              Start backend + frontend (default)
#   ./dev.sh backend      Backend only
#   ./dev.sh frontend     Frontend only
#   ./dev.sh validate     Run all linters/checks

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

header() {
    echo ""
    echo -e "${CYAN}=== $1 ===${NC}"
    echo ""
}

pass() {
    echo -e "  ${GREEN}PASS${NC} $1"
}

fail() {
    echo -e "  ${RED}FAIL${NC} $1"
}

start_backend() {
    header "Starting Backend (http://localhost:5000)"
    cd "$BACKEND_DIR"
    if [ -f venv/bin/activate ]; then
        source venv/bin/activate
    fi
    python run.py
}

start_frontend() {
    header "Starting Frontend (http://localhost:5173)"
    cd "$FRONTEND_DIR"
    npm run dev
}

start_both() {
    echo ""
    echo -e "${CYAN}ServerKit Dev Server${NC}"
    echo "  Backend:  http://localhost:5000"
    echo "  Frontend: http://localhost:5173"
    echo ""

    cd "$BACKEND_DIR"
    if [ -f venv/bin/activate ]; then
        source venv/bin/activate
    fi
    python run.py &
    BACKEND_PID=$!

    sleep 2

    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!

    cleanup() {
        echo ""
        echo -e "${YELLOW}Stopping...${NC}"
        kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        echo "Stopped."
    }
    trap cleanup INT TERM

    echo -e "${DIM}Press Ctrl+C to stop...${NC}"
    wait
}

run_validate() {
    header "ServerKit Validation Suite"
    local failed=0
    local passed=0

    # --- ESLint (warn-only, does not block) ---
    echo -e "${YELLOW}Running ESLint...${NC}"
    if (cd "$FRONTEND_DIR" && npm run lint 2>&1); then
        pass "ESLint"
        ((passed++))
    else
        echo -e "  ${YELLOW}WARN${NC} ESLint (has warnings/errors - run 'cd frontend && npm run lint' for details)"
        ((passed++))  # pre-existing issues should not block
    fi

    # --- Bandit ---
    echo -e "${YELLOW}Running Bandit...${NC}"
    if command -v bandit &>/dev/null; then
        if bandit -r "$BACKEND_DIR/app" --ini "$BACKEND_DIR/.bandit" --severity-level medium 2>&1; then
            pass "Bandit (security scan)"
            ((passed++))
        else
            fail "Bandit (security scan)"
            ((failed++))
        fi
    else
        fail "Bandit (not installed — pip install bandit)"
        ((failed++))
    fi

    # --- Pytest ---
    echo -e "${YELLOW}Running Pytest...${NC}"
    if (cd "$BACKEND_DIR" && {
        [ -f venv/bin/activate ] && source venv/bin/activate
        pytest --tb=short -q 2>&1
    }); then
        pass "Pytest"
        ((passed++))
    else
        fail "Pytest"
        ((failed++))
    fi

    # --- Frontend build ---
    echo -e "${YELLOW}Running Frontend build...${NC}"
    if (cd "$FRONTEND_DIR" && npm run build 2>&1); then
        pass "Frontend build"
        ((passed++))
    else
        fail "Frontend build"
        ((failed++))
    fi

    # --- Summary ---
    header "Results"
    echo -e "  ${GREEN}Passed: $passed${NC}"
    if [ "$failed" -gt 0 ]; then
        echo -e "  ${RED}Failed: $failed${NC}"
        return 1
    else
        echo -e "  ${GREEN}All checks passed!${NC}"
    fi
}

run_validate_watch() {
    run_validate || true

    if command -v inotifywait &>/dev/null; then
        echo -e "${DIM}Watching for changes... (Ctrl+C to stop)${NC}"
        while true; do
            inotifywait -r -q -e modify,create,delete \
                --include '\.(py|js|jsx|ts|tsx)$' \
                "$BACKEND_DIR/app" "$FRONTEND_DIR/src" 2>/dev/null || break
            echo -e "\n${YELLOW}Change detected, re-running...${NC}"
            sleep 1
            run_validate || true
        done
    else
        echo ""
        echo -e "${DIM}Install inotify-tools for file watching (apt install inotify-tools).${NC}"
        echo -e "${DIM}Running one-shot validation only.${NC}"
    fi
}

# --- Main ---
MODE="${1:-start}"

case "$MODE" in
    backend)  start_backend ;;
    frontend) start_frontend ;;
    validate) run_validate_watch ;;
    start|*)  start_both ;;
esac
