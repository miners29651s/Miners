for f in lib/telegram.ts components/TabBar.tsx app/page.tsx convex/miners.ts convex/players.ts convex/http.ts app/tabs/task/TaskTab.tsx; do
  if [ -f "$f" ]; then
    echo "===== $f ====="
    cat "$f"
    echo
  fi
done
