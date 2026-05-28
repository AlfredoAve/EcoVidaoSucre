const SOCIAL = {
  whatsapp: {
    phone: '59175442968',
    msg: 'Hola! Me gustaría información sobre los productos de EcoVida',
    color: '#25D366'
  },
  messenger: {
    url: 'https://m.me/ecovida',
    color: '#0099FF'
  }
};

function createSocialDock() {
  const dock = document.createElement('div');
  dock.id = 'social-dock';
  dock.style.cssText = `
    position: fixed;
    right: 20px;
    bottom: 140px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 12050;
    opacity: 1;
    pointer-events: auto;
  `;

  const buttons = [
    {
      href: `https://wa.me/${SOCIAL.whatsapp.phone}?text=${encodeURIComponent(SOCIAL.whatsapp.msg)}`,
      bg: SOCIAL.whatsapp.color,
      label: 'WhatsApp',
      svg: `<svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.523 5.847L.057 23.882l6.19-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.726.977.995-3.63-.234-.373A9.818 9.818 0 1112 21.818z"/></svg>`
    },
    {
      href: SOCIAL.messenger.url,
      bg: SOCIAL.messenger.color,
      label: 'Messenger',
      svg: `<svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.732 8l3.13 3.259L19.752 8l-6.559 6.963z"/></svg>`
    }
  ];

  buttons.forEach(btn => {
    const a = document.createElement('a');
    a.href = btn.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = btn.label;
    a.setAttribute('aria-label', btn.label);
    a.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${btn.bg};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 26px rgba(0,0,0,0.2);
      transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s;
      text-decoration: none;
    `;
    a.innerHTML = btn.svg;
    a.onmouseenter = () => {
      a.style.transform = 'translateY(-2px) scale(1.04)';
      a.style.boxShadow = '0 14px 28px rgba(0,0,0,0.22)';
    };
    a.onmouseleave = () => {
      a.style.transform = 'scale(1)';
      a.style.boxShadow = '0 10px 24px rgba(0,0,0,0.18)';
    };
    dock.appendChild(a);
  });

  document.body.appendChild(dock);
}

document.addEventListener('DOMContentLoaded', createSocialDock);
