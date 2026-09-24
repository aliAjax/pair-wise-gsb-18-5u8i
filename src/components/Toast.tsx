import { useEffect, useState } from "react";

// 轻量提示：通过 window 自定义事件触发，避免逐层传递回调
type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

export function notify(message: string, kind: ToastKind = "info"): void {
  window.dispatchEvent(
    new CustomEvent("rct-toast", { detail: { message, kind } }),
  );
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail as {
        message: string;
        kind: ToastKind;
      };
      const id = ++seq;
      setItems((prev) => [...prev, { id, message, kind }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    };
    window.addEventListener("rct-toast", onToast);
    return () => window.removeEventListener("rct-toast", onToast);
  }, []);

  return (
    <div className="toast-host">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
