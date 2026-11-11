// Fast entry: turns "almoço 32, uber 18,50, mercado 120" into transactions,
// and reads bank statements (OFX or CSV) without any bank password.

export const CATS = ['mercado', 'restaurante', 'transporte', 'casa', 'saude', 'lazer', 'pet', 'compras', 'trabalho', 'outros'];

// Keyword -> category. Portuguese, English and Spanish words people actually type.
export const WORDS = {
  trabalho: ['aws', 'vercel', 'github', 'copilot', 'claude', 'chatgpt', 'openai', 'domínio', 'dominio', 'hospedagem', 'vps', 'servidor', 'notebook', 'monitor', 'teclado', 'mouse', 'adobe', 'figma', 'canva', 'capcut', 'tinta acrílica', 'pincel', 'tela', 'microfone', 'câmera', 'camera', 'curso', 'udemy', 'alura', 'livro', 'coworking', 'hosting', 'domain', 'laptop'],
  mercado: ['mercado', 'supermercado', 'feira', 'hortifruti', 'padaria', 'açougue', 'acougue', 'atacadão', 'atacadao', 'grocery', 'groceries', 'supermarket', 'bakery', 'super'],
  restaurante: ['almoço', 'almoco', 'janta', 'jantar', 'lanche', 'café', 'cafe', 'ifood', 'restaurante', 'pizza', 'hamburguer', 'burger', 'bar', 'cerveja', 'delivery', 'lunch', 'dinner', 'coffee', 'comida', 'sushi', 'açaí', 'acai', 'almuerzo', 'cena'],
  transporte: ['uber', '99', 'taxi', 'táxi', 'ônibus', 'onibus', 'metrô', 'metro', 'gasolina', 'combustível', 'combustivel', 'estacionamento', 'pedágio', 'pedagio', 'bilhete', 'gas', 'parking', 'bus', 'train', 'cabify'],
  casa: ['luz', 'água', 'agua', 'gás', 'internet', 'aluguel', 'condomínio', 'condominio', 'limpeza', 'faxina', 'diarista', 'móvel', 'movel', 'tinta', 'reforma', 'sofá', 'sofa', 'mesa', 'cadeira', 'cortina', 'tapete', 'papel de parede', 'geladeira', 'fogão', 'fogao', 'máquina de lavar', 'colchão', 'colchao', 'rent', 'fridge', 'cleaning', 'alquiler'],
  saude: ['farmácia', 'farmacia', 'remédio', 'remedio', 'consulta', 'médico', 'medico', 'dentista', 'exame', 'academia', 'whey', 'creatina', 'pharmacy', 'doctor', 'gym', 'suplemento'],
  lazer: ['cinema', 'show', 'ingresso', 'netflix', 'spotify', 'jogo', 'game', 'steam', 'viagem', 'passeio', 'balada', 'teatro', 'movie', 'concert', 'trip'],
  pet: ['ração', 'racao', 'pet', 'veterinário', 'veterinario', 'vet', 'banho', 'tosa', 'petshop', 'vermífugo', 'vermifugo', 'vacina', 'dog', 'cachorro', 'gato'],
  compras: ['roupa', 'tênis', 'tenis', 'shopee', 'amazon', 'mercado livre', 'shein', 'presente', 'eletrônico', 'eletronico', 'celular', 'tv', 'televisão', 'clothes', 'gift', 'shopping'],
};

const PAY = [
  { re: /\b(pix)\b/i, v: 'pix' },
  { re: /\b(d[eé]bito|debit)\b/i, v: 'debito' },
  { re: /\b(cr[eé]dito|cart[aã]o|credit|card)\b/i, v: 'credito' },
  { re: /\b(dinheiro|cash|efectivo)\b/i, v: 'dinheiro' },
];

export function guessCategory(text) {
  const s = ' ' + text.toLowerCase() + ' ';
  for (const [cat, words] of Object.entries(WORDS)) {
    if (words.some(w => s.includes(' ' + w + ' ') || s.includes(' ' + w + ',') || s.startsWith(' ' + w) || s.includes(w + ' '))) return cat;
  }
  return 'outros';
}

const toNum = raw => {
  let n = raw.replace(/[^\d.,]/g, '');
  if (n.includes(',') && n.includes('.')) n = n.lastIndexOf(',') > n.lastIndexOf('.') ? n.replace(/\./g, '').replace(',', '.') : n.replace(/,/g, '');
  else if (n.includes(',')) n = n.replace(',', '.');
  return Math.round(parseFloat(n) * 100) / 100;
};

// "almoço 32, uber 18,50 e mercado 120 no débito" -> [{desc, amount, cat, pay}]
export function parseQuick(text) {
  if (!text || !text.trim()) return [];
  const chunks = text
    .replace(/\s+e\s+(?=\D*\d)/gi, ';')
    .replace(/\s+and\s+(?=\D*\d)/gi, ';')
    .replace(/\s+y\s+(?=\D*\d)/gi, ';')
    .split(/[;\n]+|,(?!\d{1,2}\b)/)
    .map(c => c.trim())
    .filter(Boolean);
  const out = [];
  for (let c of chunks) {
    // '3290 em 10x', '10 vezes': an installment purchase on the card.
    const inst = c.match(/\b(?:em\s+|in\s+)?(\d{1,2})\s*(?:x\b|vezes\b|parcelas\b|installments\b|cuotas\b)/i);
    const n = inst ? Math.min(48, +inst[1]) : 0;
    if (inst) c = c.replace(inst[0], ' ');
    const m = c.match(/(?:r\$|us\$|\$|€)?\s*(\d{1,3}(?:[.\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|conto|contos|pila|dólares|dolares|dollars|euros)?/i);
    if (!m) continue;
    const amount = toNum(m[1]);
    if (!(amount > 0)) continue;
    const pay = n > 1 ? 'credito' : (PAY.find(p => p.re.test(c)) || {}).v || null;
    let desc = c.replace(m[0], ' ')
      .replace(/\b(gastei|paguei|comprei|foi|de|no|na|com|em|pelo|pela|spent|paid|on|for|gasté|pagué)\b/gi, ' ')
      .replace(/\b(pix|d[eé]bito|cr[eé]dito|cart[aã]o|dinheiro|debit|credit|card|cash)\b/gi, ' ')
      .replace(/\s+/g, ' ').trim();
    if (!desc) desc = c.trim();
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
    out.push(n > 1 ? { desc, amount, cat: guessCategory(desc), pay, n } : { desc, amount, cat: guessCategory(desc), pay });
  }
  return out;
}

// OFX: <STMTTRN> blocks with TRNAMT, DTPOSTED, MEMO/NAME. Only outflows become expenses.
export function parseOFX(text) {
  const rows = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const b of blocks) {
    const get = tag => { const m = b.match(new RegExp('<' + tag + '>([^<\\r\\n]+)', 'i')); return m ? m[1].trim() : ''; };
    const amt = parseFloat(get('TRNAMT').replace(',', '.'));
    if (!(amt < 0)) continue;
    const d = get('DTPOSTED');
    const date = /^\d{8}/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null;
    const desc = (get('MEMO') || get('NAME') || 'Lançamento').replace(/\s+/g, ' ');
    rows.push({ desc, amount: Math.abs(amt), cat: guessCategory(desc), date, pay: null });
  }
  return rows;
}

// CSV: finds a date column, a description column and an amount column by content.
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const split = l => l.split(sep).map(x => x.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(split);
  const n = Math.max(...rows.map(r => r.length));
  const isDate = v => /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(v);
  const isAmt = v => /^-?\s*(r\$)?\s*-?\d[\d.,]*$/i.test(v);
  let di = -1, ai = -1, ti = -1;
  for (let i = 0; i < n; i++) {
    const col = rows.map(r => r[i] || '');
    if (di < 0 && col.filter(isDate).length > rows.length / 2) di = i;
    else if (ai < 0 && col.filter(isAmt).length > rows.length / 2) ai = i;
    else if (ti < 0 && col.some(v => /[a-zA-Z]{3,}/.test(v))) ti = i;
  }
  if (ai < 0) return [];
  const out = [];
  const anyNeg = rows.some(x => (x[ai] || '').includes('-'));
  for (const r of rows) {
    const raw = (r[ai] || '').replace(/\s/g, '');
    const neg = raw.includes('-');
    const amount = toNum(raw);
    if (!(amount > 0)) continue;
    // Statements show spending as negative; if nothing is negative, keep all rows.
    if (anyNeg && !neg) continue;
    const desc = ti >= 0 ? r[ti] : 'Lançamento';
    let date = null;
    if (di >= 0) {
      const p = r[di].split(/[/-]/);
      date = p[0].length === 4 ? `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}` : `${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = null;
    }
    out.push({ desc, amount, cat: guessCategory(desc), date, pay: null });
  }
  return out;
}
