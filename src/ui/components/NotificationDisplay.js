export class NotificationDisplay {
  static show(container, message, type = "info") {
    if (!container) return;

    let notifContainer = container.querySelector(".notification-container");
    if (!notifContainer) {
      notifContainer = document.createElement("div");
      notifContainer.className = "notification-container";
      container.appendChild(notifContainer);
    }

    const notif = document.createElement("div");
    notif.className = `game-notification ${type}`;
    notif.innerText = message;

    notifContainer.appendChild(notif);

    setTimeout(() => {
      if (notif.parentNode) notif.parentNode.removeChild(notif);
    }, 4500);
  }
}
