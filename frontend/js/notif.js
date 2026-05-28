// ─── EcoVida Notificaciones — reemplaza alert() / confirm() nativos ──────────
const ECOVIDA_NOTIF_STYLE = document.createElement('style');
ECOVIDA_NOTIF_STYLE.textContent = `
  @keyframes _ecoSlideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes _ecoSlideOut{ to{opacity:0;transform:translateX(20px)} }
  #_ecoNotifContainer { position:fixed;top:80px;right:18px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:320px;pointer-events:none; }
  ._ecoNotif { pointer-events:auto;border-radius:13px;padding:12px 15px;display:flex;align-items:center;gap:10px;font-family:'DM Sans',system-ui,sans-serif;font-size:.91rem;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.18);animation:_ecoSlideIn .24s ease; }
  ._ecoNotif button{background:rgba(255,255,255,.22);border:none;color:#fff;width:21px;height:21px;border-radius:50%;cursor:pointer;font-size:.8rem;line-height:1;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
  #_ecoConfirmOverlay{position:fixed;inset:0;background:rgba(10,20,15,.48);z-index:10000;display:none;align-items:center;justify-content:center;}
  ._ecoConfirmBox{background:#fff;border-radius:18px;padding:28px 26px 20px;max-width:370px;width:90%;box-shadow:0 20px 52px rgba(0,0,0,.22);font-family:'DM Sans',system-ui,sans-serif;}
  ._ecoConfirmBox p{color:#1b4332;font-weight:600;font-size:.98rem;margin:0 0 20px;line-height:1.5;}
  ._ecoConfirmBtns{display:flex;gap:10px;justify-content:flex-end;}
  ._ecoBtnCancel{padding:8px 18px;border-radius:9px;border:1.5px solid #ddd;background:#fff;cursor:pointer;font-weight:500;font-family:inherit;}
  ._ecoBtnConfirm{padding:8px 18px;border-radius:9px;background:#2d6a4f;color:#fff;border:none;cursor:pointer;font-weight:600;font-family:inherit;}
  ._ecoBtnConfirm:hover{background:#1b4332;}
`;
document.head.appendChild(ECOVIDA_NOTIF_STYLE);

// Container de notificaciones
let _ecoContainer = null;
function _getContainer() {
  if (!_ecoContainer) {
    _ecoContainer = document.createElement('div');
    _ecoContainer.id = '_ecoNotifContainer';
    document.body.appendChild(_ecoContainer);
  }
  return _ecoContainer;
}

// Confirm overlay (creado una sola vez)
let _ecoConfirmOverlay = null;
function _getConfirmOverlay() {
  if (!_ecoConfirmOverlay) {
    _ecoConfirmOverlay = document.createElement('div');
    _ecoConfirmOverlay.id = '_ecoConfirmOverlay';
    _ecoConfirmOverlay.innerHTML = `
      <div class="_ecoConfirmBox">
        <p id="_ecoConfirmMsg"></p>
        <div class="_ecoConfirmBtns">
          <button class="_ecoBtnCancel" id="_ecoBtnNo">Cancelar</button>
          <button class="_ecoBtnConfirm" id="_ecoBtnYes">Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(_ecoConfirmOverlay);
  }
  return _ecoConfirmOverlay;
}

/**
 * showNotif(msg, type)
 * type: 'success' | 'error' | 'warning' | 'info'
 */
function showNotif(msg, type = 'success') {
  const colors = { success:'#2d6a4f', error:'#c0392b', warning:'#b5830a', info:'#0a6bb5' };
  const icons  = { success:'bi-check-circle-fill', error:'bi-x-circle-fill', warning:'bi-exclamation-triangle-fill', info:'bi-info-circle-fill' };
  const bg = colors[type] || colors.success;
  const ic = icons[type]  || icons.success;
  const el = document.createElement('div');
  el.className = '_ecoNotif';
  el.style.background = bg;
  el.style.color = '#fff';
  el.innerHTML = `<i class="bi ${ic}" style="font-size:1.06rem;flex-shrink:0;"></i><span style="flex:1;">${msg}</span><button onclick="this.closest('._ecoNotif').remove()">✕</button>`;
  _getContainer().appendChild(el);
  setTimeout(() => {
    el.style.animation = '_ecoSlideOut .3s ease forwards';
    setTimeout(() => el.remove(), 310);
  }, 3800);
}

/**
 * showConfirm(msg, onConfirm)
 */
function showConfirm(msg, onConfirm) {
  const overlay = _getConfirmOverlay();
  document.getElementById('_ecoConfirmMsg').textContent = msg;
  overlay.style.display = 'flex';
  const yes = document.getElementById('_ecoBtnYes');
  const no  = document.getElementById('_ecoBtnNo');
  const close = () => { overlay.style.display = 'none'; };
  yes.onclick = () => { close(); onConfirm(); };
  no.onclick  = close;
  overlay.onclick = (e) => { if(e.target === overlay) close(); };
}
