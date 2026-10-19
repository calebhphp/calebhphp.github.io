// WhatsApp number with country and area code, digits only. Change it here and every button updates.
const WHATSAPP = '5511933010415';

const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

// Any element with data-wa="message" becomes a WhatsApp link with that message.
document.querySelectorAll('[data-wa]').forEach((el) => {
  el.href = waLink(el.dataset.wa);
  el.target = '_blank';
  el.rel = 'noopener';
});

// Quick picker: turns the visitor's choices into a ready-to-send message.
const picker = document.querySelector('[data-picker]');
if (picker) {
  const send = picker.querySelector('[data-picker-send]');
  const update = () => {
    const service = picker.querySelector('input[name="servico"]:checked')?.value;
    const business = picker.querySelector('#negocio').value.trim();
    const lang = picker.dataset.picker;
    const text = lang === 'en'
      ? `Hi Matheus! I found your website. ${service ? `I'm interested in: ${service}.` : ''} ${business ? `My business: ${business}.` : ''} Can we talk?`
      : `Olá, Matheus! Vi seu site. ${service ? `Tenho interesse em: ${service}.` : ''} ${business ? `Meu negócio: ${business}.` : ''} Podemos conversar?`;
    send.href = waLink(text.replace(/\s+/g, ' ').trim());
  };
  picker.addEventListener('input', update);
  picker.addEventListener('change', update);
  update();
}

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
