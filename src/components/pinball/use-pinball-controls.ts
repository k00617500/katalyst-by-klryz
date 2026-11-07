"use client";

import { useEffect } from "react";
import type { usePinballGame } from "./use-pinball-game";

const bindings = {
  left: new Set(["ArrowLeft", "KeyA"]),
  right: new Set(["ArrowRight", "KeyD"]),
  launch: new Set(["Space", "ArrowDown", "KeyS"]),
};

export function usePinballControls(game: ReturnType<typeof usePinballGame>, active: boolean) {
  const { cancelInput, chargePlunger, releasePlunger, setFlipper, togglePause, nudge } = game;
  useEffect(() => {
    if (!active) return;
    const pressed = new Set<string>();
    const held = (keys: Set<string>) => [...pressed].some((key) => keys.has(key));
    const clear = () => { pressed.clear(); cancelInput(); };

    const keyDown = (event: KeyboardEvent) => {
      const key = event.code;
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey ||
        (target instanceof HTMLElement && target.closest("button, input, textarea, select, a, [contenteditable=true]"))) return;
      if (![...Object.values(bindings)].some((keys) => keys.has(key)) &&
        !["KeyZ", "KeyC", "KeyX", "Escape"].includes(key)) return;
      event.preventDefault();
      if (event.repeat || pressed.has(key)) return;
      pressed.add(key);
      if (bindings.left.has(key)) setFlipper("left", true);
      else if (bindings.right.has(key)) setFlipper("right", true);
      else if (bindings.launch.has(key)) chargePlunger();
      else if (key === "KeyZ") nudge("left");
      else if (key === "KeyC") nudge("right");
      else if (key === "KeyX") nudge("up");
      else if (key === "Escape") togglePause();
    };

    const keyUp = (event: KeyboardEvent) => {
      if (!pressed.delete(event.code)) return;
      if (bindings.left.has(event.code) && !held(bindings.left)) setFlipper("left", false);
      else if (bindings.right.has(event.code) && !held(bindings.right)) setFlipper("right", false);
      else if (bindings.launch.has(event.code) && !held(bindings.launch)) releasePlunger();
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      clear();
    };
  }, [active, cancelInput, chargePlunger, releasePlunger, setFlipper, togglePause, nudge]);
}

