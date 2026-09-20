for f in convex/schema.ts convex/spin.ts convex/exchange.ts convex/admin.ts lib/ton.ts lib/spinCatalog.ts components/GameDialog.tsx components/Modal.tsx components/Balance.tsx; do
  echo "===== $f ====="
  cat "$f"
  echo
done
