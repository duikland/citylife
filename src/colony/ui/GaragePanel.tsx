// Spec 096 — the Garage HUD. Tune the signed-in player's car: four derived stat bars and the part
// catalog; clicking a part mounts it on its socket (one per socket) or unmounts it, live via
// runtime.mountCarPart / unmountCarPart. Bound to uiState.garage (operator-gated; the panel is only
// rendered when that is non-null). Player-safe labels only; price shows as city coin, never the brand.
import type { ColonyRuntime, ColonyUiState } from "../runtime";

type Garage = NonNullable<ColonyUiState["garage"]>;

const STATS: { key: keyof Garage["stats"]; label: string }[] = [
  { key: "topSpeed", label: "Top speed" },
  { key: "acceleration", label: "Acceleration" },
  { key: "grip", label: "Grip" },
  { key: "braking", label: "Braking" },
];

export function GaragePanel({
  runtime,
  garage,
}: {
  runtime: ColonyRuntime;
  garage: Garage;
}) {
  return (
    <div
      className="garage-panel"
      style={{
        position: "fixed",
        left: 12,
        bottom: 90,
        width: 270,
        background: "rgba(8,14,24,0.92)",
        border: "1px solid #1e3a5a",
        borderRadius: 10,
        padding: "10px 12px",
        color: "#c8dff0",
        fontFamily: "monospace",
        fontSize: 13,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span style={{ color: "#ffd25a", fontWeight: 700 }}>
        🔧 Garage · {garage.carName}
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {STATS.map(({ key, label }) => {
          const pct = Math.round(garage.stats[key] * 100);
          return (
            <div key={key} style={{ fontSize: 11 }}>
              <span style={{ color: "#7ab0d0" }}>{label}</span>
              <div
                role="progressbar"
                aria-label={label}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  height: 5,
                  borderRadius: 999,
                  background: "rgba(122,176,208,0.16)",
                  overflow: "hidden",
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    borderRadius: 999,
                    background: "linear-gradient(90deg,#6ea8d0,#a0d4f0)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="garage-panel__parts"
        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
      >
        {garage.parts.map((p) => (
          <button
            key={p.kind}
            data-build-action={p.mounted ? `unmount-${p.kind}` : `mount-${p.kind}`}
            title={`${p.socket} · ${p.category}${p.cost ? ` · ${p.cost} city coin` : ""}`}
            onClick={() =>
              p.mounted
                ? runtime.unmountCarPart(p.kind)
                : runtime.mountCarPart(p.kind)
            }
            style={{
              padding: "3px 7px",
              fontSize: 11,
              borderRadius: 5,
              cursor: "pointer",
              border: `1px solid ${p.mounted ? "#b6892f" : "#1e3a5a"}`,
              background: p.mounted
                ? "rgba(255,210,90,0.16)"
                : "rgba(255,255,255,0.05)",
              color: p.mounted ? "#ffd25a" : "#a0d4f0",
            }}
          >
            {p.mounted ? "✓ " : "+ "}
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
