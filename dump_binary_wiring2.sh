for f in components/BottomNav.tsx convex/auth.ts app/tabs/miners/MinersTab.tsx app/tabs/tasks/TasksTab.tsx; do
  if [ -f "$f" ]; then
    echo "===== $f ====="
    cat "$f"
    echo
  fi
done
