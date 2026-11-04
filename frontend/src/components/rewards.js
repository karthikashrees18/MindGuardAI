// Shared copy for garden reward toasts after a calming activity or game.
export function rewardToast(toast, res) {
  if (!res) return;
  if (res.awarded > 0) {
    toast(`+${res.awarded} garden points — your plant is growing`, { type: "reward" });
  } else {
    toast("Daily garden points reached — nice work, your garden thanks you", { type: "reward" });
  }
}
