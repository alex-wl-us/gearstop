import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Card, Button, Skeleton, Alert, PageHeader } from "../ui";
import { useToast } from "../ui";
import { getGreeting } from "../api/greeting";

export function HomePage() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGreeting();
      setMessage(data.message);
    } catch (e) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    await load();
    if (!error) {
      toast("Greeting refreshed", "success");
    }
  };

  return (
    <div className="container narrow stack-lg animate-in">
      <PageHeader
        eyebrow="Demo"
        title="Hello World App"
        subtitle="A minimal full-stack greeting, served live from the backend."
        icon={<Sparkles size={20} />}
      />
      <Card title="Greeting" icon={<Sparkles size={16} />}>
        <div className="stack-lg">
          {loading && <Skeleton lines={2} />}
          {!loading && error && <Alert tone="danger">{error}</Alert>}
          {!loading && !error && message && (
            <p className="page-title">{message}</p>
          )}
          <div className="row">
            <Button
              tone="primary"
              icon={RefreshCw}
              loading={loading}
              onClick={handleRefresh}
            >
              Refresh greeting
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
