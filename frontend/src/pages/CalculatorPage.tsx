import { useState } from "react";
import { Delete, X } from "lucide-react";
import { AppShell, Button, Card, Alert, useToast } from "../ui";
import { calculate } from "../api/calculator";
import { ApiError } from "../api/client";

type KeyDef = {
  label: string;
  insert?: string;
  action?: "clear" | "backspace" | "equals";
  tone?: "primary" | "outline" | "ghost" | "danger";
};

const FUNCTION_KEYS: KeyDef[] = [
  { label: "sin", insert: "sin(" },
  { label: "cos", insert: "cos(" },
  { label: "tan", insert: "tan(" },
  { label: "log", insert: "log(" },
  { label: "ln", insert: "ln(" },
  { label: "sqrt", insert: "sqrt(" },
  { label: "^", insert: "^" },
  { label: "(", insert: "(" },
  { label: ")", insert: ")" },
  { label: "π", insert: "pi" },
  { label: "e", insert: "e" },
  { label: "%", insert: "%" },
];

// Grouped into rows of four so the keypad reads as a numeric block rather
// than a single wrapping row of equal-weight buttons.
const DIGIT_ROWS: KeyDef[][] = [
  [
    { label: "7", insert: "7" },
    { label: "8", insert: "8" },
    { label: "9", insert: "9" },
    { label: "÷", insert: "/" },
  ],
  [
    { label: "4", insert: "4" },
    { label: "5", insert: "5" },
    { label: "6", insert: "6" },
    { label: "×", insert: "*" },
  ],
  [
    { label: "1", insert: "1" },
    { label: "2", insert: "2" },
    { label: "3", insert: "3" },
    { label: "−", insert: "-" },
  ],
  [
    { label: "0", insert: "0" },
    { label: ".", insert: "." },
    { label: "=", action: "equals", tone: "primary" },
    { label: "+", insert: "+" },
  ],
];

export function CalculatorPage() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const insert = (token: string) => {
    setError(null);
    setExpression((prev) => prev + token);
  };

  const handleClear = () => {
    setExpression("");
    setResult(null);
    setError(null);
  };

  const handleBackspace = () => {
    setError(null);
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleEquals = async () => {
    if (!expression.trim()) {
      setError("Enter an expression first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await calculate(expression);
      setResult(String(res.result));
      toast("Calculated", "success");
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : "Calculation failed";
      setResult(null);
      setError(detail.includes("->") ? "Invalid expression" : detail);
      toast("Calculation error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (key: KeyDef) => {
    if (key.action === "clear") return handleClear();
    if (key.action === "backspace") return handleBackspace();
    if (key.action === "equals") return handleEquals();
    if (key.insert) return insert(key.insert);
  };

  return (
    <AppShell brand="Scientific Calculator" palette="cyan" title="Calculator">
      <div className="container narrow stack-lg">
        <Card variant="elevated" title="Calculator">
          <div className="stack">
            <div className="stack-sm">
              <div className="mono muted truncate">{expression || "0"}</div>
              <div className="page-title mono">
                {result !== null ? result : error ? "Error" : "\u00A0"}
              </div>
            </div>

            {error && <Alert tone="danger">{error}</Alert>}

            <div className="row-wrap stagger">
              {FUNCTION_KEYS.map((key) => (
                <Button key={key.label} tone="outline" size="sm" onClick={() => handleKey(key)}>
                  {key.label}
                </Button>
              ))}
            </div>

            <div className="row">
              <Button tone="danger" icon={X} block onClick={handleClear}>
                Clear
              </Button>
              <Button tone="outline" icon={Delete} block onClick={handleBackspace} aria-label="Backspace">
                Back
              </Button>
            </div>

            <div className="stack-sm">
              {DIGIT_ROWS.map((row, rowIdx) => (
                <div className="row" key={rowIdx}>
                  {row.map((key, idx) => (
                    <Button
                      key={`${key.label}-${idx}`}
                      tone={key.tone ?? "ghost"}
                      size="lg"
                      block
                      loading={key.action === "equals" ? loading : undefined}
                      onClick={() => handleKey(key)}
                    >
                      {key.label}
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
