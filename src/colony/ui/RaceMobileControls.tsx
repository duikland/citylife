import type { PointerEvent } from "react";
import type { ColonyRuntime, ColonyUiState } from "../runtime";

export type MobileRallyControlAction =
  | "steer-left"
  | "steer-right"
  | "throttle"
  | "brake-reverse";

type RaceUiState = ColonyUiState["race"];

const MOBILE_RALLY_CONTROLS: {
  action: MobileRallyControlAction;
  keyCode: string;
  label: string;
  ariaLabel: string;
  className: string;
}[] = [
  {
    action: "steer-left",
    keyCode: "KeyA",
    label: "←",
    ariaLabel: "Steer left",
    className: "race-mobile-controls__button--steer",
  },
  {
    action: "throttle",
    keyCode: "KeyW",
    label: "Throttle",
    ariaLabel: "Hold throttle",
    className: "race-mobile-controls__button--throttle",
  },
  {
    action: "brake-reverse",
    keyCode: "KeyS",
    label: "Brake",
    ariaLabel: "Brake or reverse",
    className: "race-mobile-controls__button--brake",
  },
  {
    action: "steer-right",
    keyCode: "KeyD",
    label: "→",
    ariaLabel: "Steer right",
    className: "race-mobile-controls__button--steer",
  },
];

export function shouldShowMobileRallyControls(
  race: RaceUiState,
  isTouch: boolean,
): boolean {
  return isTouch && (race.mode === "countdown" || race.mode === "running");
}

export function mobileRallyControlKeyCode(
  action: MobileRallyControlAction,
): string {
  return MOBILE_RALLY_CONTROLS.find((control) => control.action === action)!
    .keyCode;
}

function releaseControl(runtime: ColonyRuntime, keyCode: string): void {
  runtime.setRaceKey(keyCode, false);
}

function pressControl(runtime: ColonyRuntime, keyCode: string): void {
  runtime.setRaceKey(keyCode, true);
}

function captureTouch(e: PointerEvent<HTMLButtonElement>): void {
  e.preventDefault();
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId);
  } catch {
    // Synthetic/browser-proof events may not be eligible for pointer capture; the held key still works.
  }
}

export function RaceMobileControls({
  race,
  runtime,
  isTouch,
}: {
  race: RaceUiState;
  runtime: ColonyRuntime;
  isTouch: boolean;
}) {
  if (!shouldShowMobileRallyControls(race, isTouch)) return null;
  return (
    <div
      className="race-mobile-controls"
      role="group"
      aria-label="Mobile Road Rally driving controls"
    >
      <div className="race-mobile-controls__hint">
        Hold throttle · steer left/right · brake to reverse
      </div>
      <div className="race-mobile-controls__grid">
        {MOBILE_RALLY_CONTROLS.map((control) => (
          <button
            key={control.action}
            type="button"
            className={`race-mobile-controls__button ${control.className}`}
            data-race-action={control.action}
            aria-label={control.ariaLabel}
            title={control.ariaLabel}
            onPointerDown={(e) => {
              captureTouch(e);
              pressControl(runtime, control.keyCode);
            }}
            onPointerUp={() => releaseControl(runtime, control.keyCode)}
            onPointerCancel={() => releaseControl(runtime, control.keyCode)}
            onPointerLeave={() => releaseControl(runtime, control.keyCode)}
            onBlur={() => releaseControl(runtime, control.keyCode)}
          >
            {control.label}
          </button>
        ))}
      </div>
    </div>
  );
}
