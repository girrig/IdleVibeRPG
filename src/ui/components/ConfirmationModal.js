export class ConfirmationModal {
  static show(title, message, onConfirm) {
    const app = document.getElementById("app") || document.body;

    const modal = document.createElement("div");
    modal.className = "game-modal";
    modal.innerHTML = `
        <div class="modal-content" style="width: 400px;">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="btn-close">×</button>
            </div>
            <div class="modal-body" style="color: #ccc; margin-bottom: 24px; line-height: 1.5;">
                ${message}
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn-cancel" style="
                    padding: 8px 16px; 
                    background: transparent; 
                    border: 1px solid rgba(255,255,255,0.2); 
                    color: #fff; 
                    border-radius: 4px; 
                    cursor: pointer;
                    transition: all 0.2s;
                ">Cancel</button>
                <button class="btn-confirm" style="
                    padding: 8px 16px; 
                    background: rgba(220, 50, 50, 0.8); 
                    border: 1px solid rgba(255, 100, 100, 0.3); 
                    color: #fff; 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(220, 50, 50, 0.3);
                    transition: all 0.2s;
                ">Confirm</button>
            </div>
        </div>
    `;

    app.appendChild(modal);

    const close = () => {
      modal.classList.add("hidden");
      setTimeout(() => modal.remove(), 200);
    };

    // Events
    modal.querySelector(".btn-close").addEventListener("click", close);
    modal.querySelector(".btn-cancel").addEventListener("click", close);

    modal.querySelector(".btn-confirm").addEventListener("click", () => {
      onConfirm();
      close();
    });

    // Close on background click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    // Hover effects for inline styles (since we're using inline for buttons to be safe/quick)
    const btnCancel = modal.querySelector(".btn-cancel");
    btnCancel.onmouseenter = () =>
      (btnCancel.style.background = "rgba(255,255,255,0.1)");
    btnCancel.onmouseleave = () => (btnCancel.style.background = "transparent");

    const btnConfirm = modal.querySelector(".btn-confirm");
    btnConfirm.onmouseenter = () => {
      btnConfirm.style.background = "rgba(240, 70, 70, 0.9)";
      btnConfirm.style.transform = "translateY(-1px)";
    };
    btnConfirm.onmouseleave = () => {
      btnConfirm.style.background = "rgba(220, 50, 50, 0.8)";
      btnConfirm.style.transform = "none";
    };
  }
}
