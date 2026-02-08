import { hexToRgbString } from "../../utils/formatters";

export class NotificationDisplay {
  static show(container, message, type = "info") {
    if (!container) return;

    // Append notification container to document.body for guaranteed z-index stacking
    let notifContainer = document.querySelector(".notification-container");
    if (!notifContainer) {
      notifContainer = document.createElement("div");
      notifContainer.className = "notification-container";
      document.body.appendChild(notifContainer);
    }

    const notif = document.createElement("div");

    let typeId = type;
    let color = null;

    if (type && typeof type === "object") {
      typeId = type.id;
      color = type.color;
    }

    notif.className = `game-notification ${typeId}`;
    if (color) {
      notif.style.borderLeftColor = color;
      notif.style.background = `linear-gradient(to right, rgba(0,0,0,0.8), rgba(${hexToRgbString(color)}, 0.15))`;
    }

    notif.innerText = message;

    notifContainer.appendChild(notif);

    setTimeout(() => {
      if (notif.parentNode) notif.parentNode.removeChild(notif);
    }, 3500);
  }

}
