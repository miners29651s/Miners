for f in convex/schema.ts convex/referrals.ts convex/mining.ts convex/users.ts app/tabs/profile/ProfileTab.tsx app/tabs/home/HomeTab.tsx app/layout.tsx app/tabs/task/TaskTab.tsx components/TabBar.tsx package.json; do
  if [ -f "$f" ]; then
    echo "===== $f ====="
    cat "$f"
    echo
  fi
done
