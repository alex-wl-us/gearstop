import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CornerUpLeft,
  LayoutDashboard,
  Rocket,
  Server,
} from "lucide-react";
import { getHealth } from "../api/health";
import {
  Alert,
  AppShell,
  AvatarStack,
  BarChart,
  Button,
  Card,
  DataTable,
  Donut,
  Drawer,
  Menu,
  PageHeader,
  RemoteImage,
  Skeleton,
  Sparkline,
  Stat,
  Timeline,
  photo,
} from "../ui";
import { StatusBadge } from "../components/StatusBadge";
import type { IconLike } from "../ui";

/**
 * The application screen, and the pattern every generated screen should
 * follow:
 *
 * - framed by <AppShell>, which also carries the theme and accent controls,
 * - opened by a <Hero> whose `image` names the application's subject, so the
 *   screen leads with a photograph of the right thing,
 * - every photo seeded from a record and given a topic, so it is both stable
 *   across renders and about the subject,
 * - all three async states handled — skeleton while loading, <Alert> on
 *   failure, content on success — so the page is never blank or jumping,
 * - composed from src/ui and the classes in styles/components.css, with no
 *   new CSS and no inline style objects,
 * - entrances staggered with the `stagger` class on the container, so the
 *   content arrives in sequence instead of all at once.
 */
type DemoRecord = { id: string; name: string; status: string; total: number };
type DemoStat = {
  label: string;
  value: string;
  delta: string;
  direction?: string;
  tone?: string;
  icon: IconLike;
};

const demoRecords: DemoRecord[] = Array.from({ length: 14 }, (_, i) => ({
  id: `r-${i}`,
  name: `Record ${i + 1}`,
  status: i % 3 === 0 ? "active" : i % 3 === 1 ? "pending" : "done",
  total: (i + 1) * 19,
}));

export function HomePage({ onBack }: { onBack?: () => void }) {
  const [selected, setSelected] = useState<DemoRecord | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then((health) => setStatus(health.status))
      .catch(() => setError("The API is unreachable. Check that the backend is running."));
  }, []);

  const loading = status === null && error === null;

  return (
    <AppShell
      brand="Generated Application"
      brandIcon={<LayoutDashboard size={16} />}
      // The accent the whole application wears. Pick the one that suits the
      // subject; the control in the top bar lets the reader change it.
      palette="indigo"
      nav={[{ id: "overview", label: "Overview", icon: <Activity size={16} /> }]}
      active="overview"
      title="Overview"
      actions={
        onBack && (
          <Button tone="ghost" icon={CornerUpLeft} onClick={onBack}>
            Landing
          </Button>
        )
      }
    >
      <div className="stack-lg">
        {/* The banner header: the title row a screen opens with, carried on
            a gradient surface with the application's subject behind it.
            `image` takes a topic from the curated library, so the banner is
            a photograph of the right thing rather than an abstract mesh. */}
        <PageHeader
          variant="banner"
          image="workspace"
          icon={LayoutDashboard}
          eyebrow="Overview"
          title={
            <>
              Your application, <span className="gradient-text">ready to build</span>
            </>
          }
          subtitle="React + TypeScript + Vite, talking to FastAPI. Replace this screen with the real thing."
          actions={
            <>
              <Button tone="primary">Get started</Button>
              {status && <StatusBadge label={`API ${status}`} tone="success" />}
            </>
          }
        />

        {error && <Alert tone="danger">{error}</Alert>}

        {/* `.stat-grid` lays out a strip of metric tiles; `tone` leans each
            tile's chip and corner wash toward its meaning. */}
        <div className="stat-grid stagger">
          {loading ? (
            <>
              <Skeleton lines={3} />
              <Skeleton lines={3} />
            </>
          ) : (
            (
              [
                {
                  label: "API status",
                  value: status ?? "unknown",
                  delta: "Checked just now",
                  tone: "success",
                  icon: CheckCircle2,
                },
                {
                  label: "Endpoints",
                  value: "1",
                  delta: "GET /api/v1/health",
                  icon: Server,
                },
                {
                  label: "Records",
                  value: String(demoRecords.length),
                  delta: "+3 this week",
                  direction: "up",
                  icon: Activity,
                },
              ] as DemoStat[]
            ).map((stat) => (
              <Stat
                key={stat.label}
                label={stat.label}
                value={stat.value}
                delta={stat.delta}
                direction={stat.direction}
                tone={stat.tone}
                icon={stat.icon}
              />
            ))
          )}
        </div>

        {/* Where a number has a history, draw it. A row of tiles above a
            table is what every generated dashboard looked like before these
            existed; each of them is one prop and no CSS. */}
        <div className="section-head">
          <div>
            <p className="eyebrow">Activity</p>
            <h2 className="section-title">The numbers, drawn</h2>
          </div>
        </div>

        <div className="grid stagger">
          <Card title="Requests" icon={Activity} tight>
            {/* A trend. The series is passed raw — Sparkline normalises to
                its own range, so there is no maximum to work out. */}
            <Sparkline
              data={[8, 14, 11, 19, 23, 18, 27, 31, 26, 34]}
              aria-label="Requests over the last ten days, trending up"
            />
          </Card>

          <Card title="By endpoint" tight>
            <BarChart
              data={[
                { label: "health", value: 34 },
                { label: "items", value: 21 },
                { label: "users", value: 13, highlight: true },
                { label: "auth", value: 8 },
              ]}
            >
              Calls this week
            </BarChart>
          </Card>

          <Card title="Coverage" tight>
            <Donut value={72} max={100}>
              of the plan built
            </Donut>
          </Card>
        </div>

        <div className="section-head">
          <div>
            <p className="eyebrow">Overview</p>
            <h2 className="section-title">Where to start</h2>
          </div>
        </div>

        {/* `.split` is the asymmetric two-column layout a detail screen wants:
            the subject on the left, the facts beside it. */}
        <div className="split">
          {/* A card that leads with a photograph. The seed keeps it stable
              across renders; the topic keeps it on subject. */}
          <Card interactive className="animate-in" tight>
            <RemoteImage
              src={photo("starter-overview", { topic: "workspace", width: 800, height: 450 })}
              alt=""
              overlay={
                <>
                  <strong>Imagery</strong>
                  <span className="subtle">photo(seed, {"{ topic }"}) — stable, and on subject</span>
                </>
              }
            />
          </Card>

          <Card title="Next steps" className="animate-in">
            <p className="muted">
              Compose screens from the components in <code>src/ui</code> and the classes in{" "}
              <code>styles/components.css</code>.
            </p>
            {/* A history of events, in order. The same answer for an audit
                trail, an order's progress or a changelog. */}
            <Timeline
              events={[
                {
                  id: "scaffold",
                  at: "Step 1",
                  title: "Starter in place",
                  detail: "Vite, React and FastAPI, already talking to each other.",
                  icon: CheckCircle2,
                  tone: "success",
                },
                {
                  id: "build",
                  at: "Step 2",
                  title: "Your screens",
                  detail: "Replace these two pages; keep their shape.",
                  icon: LayoutDashboard,
                  tone: "accent",
                },
                {
                  id: "ship",
                  at: "Step 3",
                  title: "Ship it",
                  icon: Rocket,
                },
              ]}
            />
            <div className="row">
              <Server size={16} className="subtle" />
              <span className="subtle">
                Backend routes live in <code className="mono">backend/app/api/</code>.
              </span>
            </div>
            <div className="row-between">
              <span className="label">Team</span>
              <AvatarStack names={["Ada Lovelace", "Grace Hopper", "Alan Turing"]} />
            </div>
          </Card>
        </div>

        {/* Records: every list a generated app needs is one component —
            search, sort, pagination, loading and empty state are inside
            DataTable; a row opens its detail in a Drawer; actions in a Menu. */}
        <div className="section-head">
          <div>
            <p className="eyebrow">Records</p>
            <h2 className="section-title">The list, complete</h2>
          </div>
        </div>
        <DataTable
          searchable="Search records"
          pageSize={5}
          columns={[
            { key: "name", header: "Name", sortable: true },
            { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge label={r.status} /> },
            { key: "total", header: "Total", sortable: true, align: "right" },
          ]}
          rows={useMemo(() => demoRecords, [])}
          rowKey="id"
          loading={false}
          onRowClick={(row) => setSelected(row)}
          rowActions={(row) => (
            <Menu
              trigger=""
              items={[
                { label: "Edit", onSelect: () => setSelected(row) },
                { label: "Delete", tone: "danger", onSelect: () => {} },
              ]}
            />
          )}
        />
        <Drawer open={selected !== null} onClose={() => setSelected(null)} title={selected?.name}>
          {selected ? <p className="muted">Record detail for {selected.name} ({selected.status}).</p> : null}
        </Drawer>
      </div>
    </AppShell>
  );
}
