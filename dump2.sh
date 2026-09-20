for f in convex/crons.ts convex/lib/telegramApi.ts lib/minerCatalog.ts; do
  echo "===== $f ====="
  cat "$f"
  echo
done
