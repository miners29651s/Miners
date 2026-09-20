"use client";

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import { ConvexError } from "convex/values";

export type DialogType = "error" | "warning" | "success" | "info" | "max";

export type DialogOptions = {
  type?: DialogType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string; // when set, a dark cancel button is shown and show() resolves false on cancel
};

const DEFAULT_ERROR = "Something went wrong. Please try again in a moment.";

// Never exposes raw/technical error text — only intentional messages or the fallback.
export function friendlyError(err: unknown, fallback: string = DEFAULT_ERROR): string {
  if (err instanceof ConvexError) {
    const d = (err as any).data;
    if (typeof d === "string" && d) return d;
  }
  return fallback;
}

type DialogApi = {
  show: (opts: DialogOptions) => Promise<boolean>;
  error: (err: unknown, title?: string, fallback?: string) => Promise<boolean>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function useGameDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useGameDialog must be used inside DialogProvider");
  return ctx;
}

const THEME: Record<DialogType, { accent: string; light: string; dark: string; glow: string }> = {
  error: { accent: "#e05a5a", light: "#ff9b8f", dark: "#7a1f1f", glow: "rgba(224,90,90,0.30)" },
  warning: { accent: "#f0a030", light: "#ffd27a", dark: "#8a5410", glow: "rgba(240,160,48,0.30)" },
  success: { accent: "#5ac97a", light: "#a6f0b9", dark: "#1f6b3a", glow: "rgba(90,201,122,0.30)" },
  info: { accent: "#0098ea", light: "#7fd0ff", dark: "#04507e", glow: "rgba(0,152,234,0.30)" },
  max: { accent: "#f6d576", light: "#fff0b8", dark: "#8a6510", glow: "rgba(246,213,118,0.32)" },
};

function Icon({ type }: { type: DialogType }) {
  const common = {
    width: 36,
    height: 36,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#ffffff",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.55))" },
  };
  if (type === "error")
    return (
      <svg {...common}>
        <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
      </svg>
    );
  if (type === "warning")
    return (
      <svg {...common}>
        <path d="M12 5v9" />
        <path d="M12 19.5v.01" />
      </svg>
    );
  if (type === "success")
    return (
      <svg {...common}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  if (type === "info")
    return (
      <svg {...common}>
        <path d="M12 11v6.5" />
        <path d="M12 6.5v.01" />
      </svg>
    );
  return (
    <svg {...common} fill="#ffffff" strokeWidth={1.5}>
      <polygon points="12,2.5 14.9,8.7 21.5,9.5 16.6,14 18,20.7 12,17.4 6,20.7 7.4,14 2.5,9.5 9.1,8.7" />
    </svg>
  );
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<DialogOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const show = useCallback((o: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setOpts(o);
    });
  }, []);

  const error = useCallback(
    (err: unknown, title: string = "Oops!", fallback?: string) =>
      show({ type: "error", title, message: friendlyError(err, fallback) }),
    [show]
  );

  const close = (value: boolean) => {
    const r = resolver.current;
    resolver.current = null;
    setOpts(null);
    r?.(value);
  };

  const type: DialogType = opts?.type ?? "info";
  const t = THEME[type];

  return (
    <DialogContext.Provider value={{ show, error }}>
      {children}

      {opts && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => close(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "radial-gradient(circle at 50% 40%, rgba(20,12,4,0.72), rgba(0,0,0,0.88))",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            animation: "gdFade 0.18s ease-out",
          }}
        >
          <style>{`
            @keyframes gdFade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes gdPop {
              0% { opacity: 0; transform: translateY(26px) scale(0.7); }
              65% { opacity: 1; transform: translateY(-4px) scale(1.03); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes gdFloat {
              0%, 100% { transform: translateX(-50%) translateY(0); }
              50% { transform: translateX(-50%) translateY(-4px); }
            }
            @keyframes gdShine {
              0% { transform: translateX(-140%) skewX(-20deg); }
              60%, 100% { transform: translateX(260%) skewX(-20deg); }
            }
            .gd-btn {
              flex: 1;
              padding: 13px 10px;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 0.3px;
              cursor: pointer;
              transition: transform 0.06s, box-shadow 0.06s;
            }
            .gd-gold {
              color: #2a1c0c;
              border: 1px solid #8a5a28;
              background: linear-gradient(180deg, #ffe38f 0%, #f6d576 35%, #cd9c2e 100%);
              box-shadow: 0 4px 0 #7a4a18, 0 8px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.7);
            }
            .gd-gold:active { transform: translateY(3px); box-shadow: 0 1px 0 #7a4a18, 0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5); }
            .gd-dark {
              color: #b9ab94;
              border: 1px solid #3a2a18;
              background: linear-gradient(180deg, #2a2016 0%, #16110a 100%);
              box-shadow: 0 4px 0 #0a0704, 0 8px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
            }
            .gd-dark:active { transform: translateY(3px); box-shadow: 0 1px 0 #0a0704, 0 3px 6px rgba(0,0,0,0.5); }
          `}</style>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "min(88vw, 340px)",
              marginTop: 38,
              padding: "48px 20px 20px",
              borderRadius: 22,
              textAlign: "center",
              background: "linear-gradient(160deg, #2a1e10 0%, #16100a 55%, #0c0803 100%)",
              border: "1px solid #8a5a28",
              boxShadow: `0 0 0 1px #000, 0 22px 50px rgba(0,0,0,0.8), 0 0 46px ${t.glow}, inset 0 1px 0 rgba(246,213,118,0.35), inset 0 -3px 0 rgba(0,0,0,0.6)`,
              animation: "gdPop 0.34s cubic-bezier(0.2, 0.9, 0.3, 1.2)",
            }}
          >
            {/* light sweep */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 22,
                overflow: "hidden",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "35%",
                  background: "linear-gradient(90deg, transparent, rgba(255,240,190,0.10), transparent)",
                  animation: "gdShine 3.2s ease-in-out infinite",
                }}
              />
            </div>

            {/* 3D medallion */}
            <div
              style={{
                position: "absolute",
                top: -40,
                left: "50%",
                width: 80,
                height: 80,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `radial-gradient(circle at 32% 25%, ${t.light} 0%, ${t.accent} 45%, ${t.dark} 100%)`,
                border: "3px solid #f6d576",
                boxShadow: `0 6px 0 #6b4514, 0 12px 22px rgba(0,0,0,0.65), 0 0 26px ${t.glow}, inset 0 3px 5px rgba(255,255,255,0.55), inset 0 -6px 8px rgba(0,0,0,0.4)`,
                animation: "gdFloat 2.6s ease-in-out infinite",
              }}
            >
              <Icon type={type} />
            </div>

            <div
              style={{
                fontSize: 21,
                fontWeight: 800,
                color: "#f6d576",
                textShadow: "0 2px 0 #5a3a10, 0 0 14px rgba(246,213,118,0.35)",
                marginBottom: 8,
              }}
            >
              {opts.title}
            </div>

            {opts.message && (
              <div style={{ fontSize: 14, lineHeight: 1.5, color: "#b9ab94", marginBottom: 20, padding: "0 4px" }}>
                {opts.message}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: opts.message ? 0 : 16 }}>
              {opts.cancelText && (
                <button className="gd-btn gd-dark" onClick={() => close(false)}>
                  {opts.cancelText}
                </button>
              )}
              <button className="gd-btn gd-gold" autoFocus onClick={() => close(true)}>
                {opts.confirmText ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
