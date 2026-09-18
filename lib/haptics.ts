let enabled = true;
let mod: any = null;
try {
  mod = require('expo-haptics');
} catch {
  mod = null;
}

export const Haptics = {
  setEnabled(v: boolean) {
    enabled = v;
  },
  light() {
    if (!enabled || !mod) return;
    try { mod.impactAsync(mod.ImpactFeedbackStyle.Light); } catch { /* noop */ }
  },
  medium() {
    if (!enabled || !mod) return;
    try { mod.impactAsync(mod.ImpactFeedbackStyle.Medium); } catch { /* noop */ }
  },
  heavy() {
    if (!enabled || !mod) return;
    try { mod.impactAsync(mod.ImpactFeedbackStyle.Heavy); } catch { /* noop */ }
  },
  success() {
    if (!enabled || !mod) return;
    try { mod.notificationAsync(mod.NotificationFeedbackType.Success); } catch { /* noop */ }
  },
  warning() {
    if (!enabled || !mod) return;
    try { mod.notificationAsync(mod.NotificationFeedbackType.Warning); } catch { /* noop */ }
  },
  error() {
    if (!enabled || !mod) return;
    try { mod.notificationAsync(mod.NotificationFeedbackType.Error); } catch { /* noop */ }
  },
  select() {
    if (!enabled || !mod) return;
    try { mod.selectionAsync(); } catch { /* noop */ }
  },
};
