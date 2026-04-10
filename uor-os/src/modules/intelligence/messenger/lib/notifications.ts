/**
 * Desktop Notifications — shows browser notifications for new messages.
 */

let permissionGranted = false;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  permissionGranted = result === "granted";
  return permissionGranted;
}

export function showMessageNotification(
  senderName: string,
  plaintext: string,
  conversationId: string,
  options?: { icon?: string; isMuted?: boolean },
) {
  if (!permissionGranted || options?.isMuted) return;
  if (document.hasFocus()) return; // Don't notify if app is focused

  const body =
    plaintext === "🔒 Encrypted"
      ? "New encrypted message"
      : plaintext.length > 100
        ? plaintext.slice(0, 100) + "…"
        : plaintext;

  const notification = new Notification(senderName, {
    body,
    icon: options?.icon,
    tag: conversationId, // Collapse same-conversation notifications
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Auto-close after 5s
  setTimeout(() => notification.close(), 5000);
}
