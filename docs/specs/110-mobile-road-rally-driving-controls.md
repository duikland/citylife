# Spec 110 — Mobile Road Rally driving controls

Status: BUILT · Date: 2026-06-26 · Owner: Joe / Player & UI

## Why

The Road Rally already runs on phones — countdown, checkpoint HUD, and car render all appear — but the car was only controllable through keyboard events (`W/A/S/D` or arrows) feeding `race.ts` through `runtime.setRaceKey`. Touch devices have no keyboard, so the rally could start while remaining unplayable on a phone.

## Mechanic

Add a touch-only Road Rally control dock that appears only while an active rally is in `countdown` or `running` mode. The dock gives the player four large hold buttons:

- `Steer left` -> the same `KeyA` path as desktop keyboard left steering.
- `Steer right` -> the same `KeyD` path as desktop keyboard right steering.
- `Hold throttle` -> the same `KeyW` path as desktop accelerate.
- `Brake or reverse` -> the same `KeyS` path as desktop brake/reverse.

The controls do not call a separate car movement API. Pointer down sets the mapped race key to `true`; pointer up/cancel/leave/blur releases it to `false`. That means `stepRace` and `driveCar` consume the identical `RaceInput` booleans used by desktop, preserving handling, checkpoint crossing, off-track pullback, and reverse behaviour.

## Rules and boundaries

- Visibility gate: render controls only when touch capability is detected and `race.mode` is `countdown` or `running`; never show them for idle/finished races or on normal desktop keyboard play.
- The existing first-person walking joystick remains separate (`data-fp-action=*`) and untouched; rally controls use `data-race-action=*` selectors.
- Desktop keyboard handling stays unchanged: the existing `RACE_KEY_CODES` listener still drives `runtime.setRaceKey`.
- CSS uses large touch targets, `touch-action: none`, safe-area-aware bottom placement, and high day/night contrast.
- Deterministic: no sim randomness, no race physics fork, and no wall-clock input in the race stepper.

## Acceptance

- On mobile/touch during Road Rally countdown/running, the player can steer, throttle, brake/reverse, and clear checkpoints using on-screen controls.
- Desktop keyboard remains unchanged.
- The walking first-person mobile joystick does not regress.
- Vitest covers the visibility gate, accessible `data-race-action` controls, and the exact keyboard-code bridge into the race driver input path.
- Browser proof should use a phone viewport/touch context, start the rally, hold throttle/steer through the actual DOM controls, and capture day + night evidence plus structured car movement/checkpoint state.
