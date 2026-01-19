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

    let typeId = type;
    let color = null;

    if (type && typeof type === "object") {
      typeId = type.id;
      color = type.color;
    }

    notif.className = `game-notification ${typeId}`;
    if (color) {
      notif.style.borderLeftColor = color;
      notif.style.background = `linear-gradient(to right, rgba(0,0,0,0.8), rgba(${NotificationDisplay.hexToRgb(color)}, 0.15))`;
    }

    notif.innerText = message;

    notifContainer.appendChild(notif);

    setTimeout(() => {
      if (notif.parentNode) notif.parentNode.removeChild(notif);
    }, 1500);
  }

  static hexToRgb(hex) {
    if (!hex) return "255, 255, 255";
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "255, 255, 255";
  }
}
