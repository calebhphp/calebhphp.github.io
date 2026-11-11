// What the app itself can do, in the three languages. Two uses:
// 1) the chat answers "how do I..." questions with no AI at all (helpAnswer);
// 2) the AI advisor receives the same text as a guide to the screens (appGuide).
const T = [
  { re: /(lanc|anot|regist|adicion|add|log|record|apunt|agreg).*(gasto|despesa|compra|expense|spend|gast)|como.*(lanc|anot)|how.*(log|add)|c[oó]mo.*(anot|regist)/,
    pt: 'Para lançar um gasto, escreva do jeito que falaria, tipo "almoço 32, uber 18". Pode ser aqui no chat, na tela Lançar gastos ou no botão + do topo. Eu separo os itens, sugiro a categoria e você confirma antes de salvar.',
    en: 'To log an expense, write it the way you would say it, like "lunch 32, uber 18". You can do it here in the chat, on the Log spending screen or with the + button on top. I split the items, suggest a category and you confirm before saving.',
    es: 'Para anotar un gasto, escríbelo como lo dirías: "almuerzo 32, uber 18". Puedes hacerlo aquí, en la pantalla Anotar gastos o con el botón + de arriba. Separo los ítems, sugiero la categoría y confirmas antes de guardar.' },
  { re: /cofre|\bpots?\b|alcanc|\bmetas?\b|\bgoals?\b|reserva de emerg|savings/,
    pt: 'Os cofres separam dinheiro para um objetivo (viagem, reserva, sofá). Cada cofre tem uma meta e um valor por mês, e esse valor sai da sobra antes de você gastar. Crie e acompanhe na tela Cofres.',
    en: 'Savings pots set money aside for a goal (trip, emergency fund, couch). Each pot has a target and a monthly amount, and that amount leaves your free money before you spend it. Create and follow them on the Savings pots screen.',
    es: 'Las alcancías separan dinero para un objetivo (viaje, reserva, sofá). Cada una tiene una meta y un monto mensual que sale de lo que te sobra antes de gastar. Créalas y síguelas en la pantalla Alcancías.' },
  { re: /assinatura|subscri|suscrip|streaming|netflix|cancelar.*(servi|assin)/,
    pt: 'Na tela Assinaturas ficam os serviços que cobram todo mês. Ela soma o total por mês e por ano, mostra em dólar e em real quando for o caso, e marca as que você ainda não revisou, para decidir quais cortar.',
    en: 'The Subscriptions screen lists everything that bills you monthly. It totals per month and per year, shows dollar and local amounts when relevant, and flags the ones you have not reviewed so you can decide what to cut.',
    es: 'En Suscripciones están los servicios que cobran cada mes. Suma el total por mes y por año, muestra dólares y moneda local cuando corresponde y marca las que no revisaste, para decidir cuáles cortar.' },
  { re: /cart[aã]o|parcel|fatura|credit card|\bcard\b|installment|cuota|tarjeta|limite do cart/,
    pt: 'Na tela Cartão e parcelas você lança compras parceladas, tipo "geladeira 3290 em 10x". Ela mostra a fatura do mês, quanto das parcelas já está comprometido nos próximos meses e o limite livre.',
    en: 'On the Card and installments screen you log purchases like "fridge 3290 in 10x". It shows this month\'s statement, how much of the next months is already committed and your free limit.',
    es: 'En Tarjeta y cuotas anotas compras como "nevera 3290 en 10x". Muestra la factura del mes, cuánto de los próximos meses ya está comprometido y el límite libre.' },
  { re: /conta.*(pagar|vence)|boleto|bills|vencimento|due date|cuentas por pagar|pagar.*conta/,
    pt: 'Contas a pagar mostra o que vence no mês, o que já foi pago e o que falta. Marque como paga e o valor sai da conta do mês. As contas fixas também entram no cálculo da sobra.',
    en: 'Bills shows what is due this month, what is paid and what is left. Mark one as paid and it leaves the month\'s total. Fixed bills also count in your free-money calculation.',
    es: 'Cuentas por pagar muestra lo que vence en el mes, lo pagado y lo pendiente. Marca una como pagada y sale del total del mes. Las fijas también entran en el cálculo de lo que te sobra.' },
  { re: /extrato|importar|\bimport|\bofx\b|\bcsv\b|\bbancos?\b|\bbank|senha do banco|\bconnect|estado de cuenta/,
    pt: 'O Prumo não conecta no banco e não pede senha. Para trazer gastos de lá, baixe o extrato em OFX ou CSV no app do seu banco e importe na tela Bancos. Você revisa tudo antes de salvar.',
    en: 'Prumo never connects to your bank and never asks for a password. To bring spending in, download the OFX or CSV statement from your bank app and import it on the Accounts screen. You review everything before saving.',
    es: 'Prumo no se conecta al banco ni pide contraseña. Para traer gastos, descarga el extracto en OFX o CSV desde la app de tu banco e impórtalo en la pantalla Bancos. Revisas todo antes de guardar.' },
  { re: /entrada|renda|sal[aá]rio|salary|income|ingreso|receita|freela/,
    pt: 'Em Entradas você cadastra o que entra por mês (salário, freela, outras rendas). A sobra do mês é entradas menos contas fixas, cofres e o orçamento do dia a dia. Se a renda cair em algum mês, o app avisa e mostra o plano.',
    en: 'On Income you add what comes in each month (salary, freelance, other). Free money is income minus fixed bills, pots and the day-to-day budget. If income drops in some month, the app warns you and shows a plan.',
    es: 'En Ingresos cargas lo que entra cada mes (sueldo, freelance, otros). Lo que sobra es ingresos menos cuentas fijas, alcancías y presupuesto diario. Si el ingreso baja en algún mes, la app avisa y muestra un plan.' },
  { re: /\bmei\b|nota fiscal|faturamento anual|limite do mei/,
    pt: 'A tela MEI acompanha o faturamento do ano contra o limite do MEI e mostra o ritmo: se continuar assim, onde você chega no fim do ano. Ligue o módulo em Personalizar se ele não aparecer.',
    en: 'The Business (MEI) screen tracks yearly revenue against the MEI limit and shows your pace: where you end the year if nothing changes. Turn the module on in Customize if it is not showing.',
    es: 'La pantalla Empresa (MEI) sigue la facturación del año contra el límite y muestra tu ritmo: dónde terminas el año si nada cambia. Activa el módulo en Personalizar si no aparece.' },
  { re: /retrospectiva|resumo do m[eê]s|dia 1|monthly recap|recap|retrospectiv/,
    pt: 'A Retrospectiva monta o mês em cartões: o dia mais caro, o ritmo de gasto e o personagem do mês. Ela fica pronta quando o mês fecha, no dia 1.',
    en: 'The Recap builds the month into cards: the most expensive day, your spending pace and the month\'s character. It is ready when the month closes, on the 1st.',
    es: 'La Retrospectiva arma el mes en tarjetas: el día más caro, tu ritmo de gasto y el personaje del mes. Queda lista cuando el mes cierra, el día 1.' },
  { re: /\bxp\b|n[ií]vel|\blevel|conquista|medalha|achievement|logro|miss[aã]o|sequ[eê]ncia|streak|gamifica/,
    pt: 'Conquistas guarda XP, nível, missões, sequência e medalhas. Você ganha XP ao lançar gastos, pagar contas e fechar o mês dentro do plano. É só incentivo: nada aqui afeta seu dinheiro.',
    en: 'Achievements holds XP, level, missions, streak and badges. You earn XP by logging spending, paying bills and closing the month inside the plan. It is only encouragement: nothing here touches your money.',
    es: 'Logros guarda XP, nivel, misiones, racha e insignias. Ganas XP al anotar gastos, pagar cuentas y cerrar el mes dentro del plan. Es solo incentivo: nada aquí toca tu dinero.' },
  { re: /\btom\b|\btone\b|deboche|ironic|ironia|acido|savage|pega leve|personaliz|customi|\btema\b|escuro|\bdark\b|idioma|\blanguage\b|tamanho do texto|contraste|libras|acessib/,
    pt: 'Em Personalizar você muda o tom do Prumo (do sóbrio ao ácido, com botão de pegar leve), o tema claro, escuro ou de alto contraste, o tamanho do texto, o idioma e os módulos que aparecem no menu.',
    en: 'In Customize you change Prumo\'s tone (from sober to savage, with an ease-off button), light, dark or high-contrast theme, text size, language and which modules show in the menu.',
    es: 'En Personalizar cambias el tono de Prumo (de sobrio a ácido, con botón para bajar el tono), el tema claro, oscuro o de alto contraste, el tamaño del texto, el idioma y los módulos del menú.' },
  { re: /exportar|\bexport|baixar meus dados|apagar|excluir|\bdelete|privacidade|privacy|\bmeus? dados?\b|backup|datos/,
    pt: 'Em Dados você exporta tudo em CSV ou planilha, faz backup e pode apagar sua conta e os dados. Seus dados são só seus e a política de privacidade explica o que sai do aparelho.',
    en: 'In Data you export everything as CSV or a spreadsheet, make a backup and can delete your account and data. Your data is yours and the privacy page explains what leaves your device.',
    es: 'En Datos exportas todo en CSV u hoja de cálculo, haces una copia y puedes borrar tu cuenta y tus datos. Tus datos son tuyos y la política de privacidad explica qué sale del dispositivo.' },
  { re: /voz|falar|microfone|ouvir|voice|speak|listen|dictat|micr[oó]fono|hablar/,
    pt: 'Dá para lançar gastos falando: toque no microfone do chat e dite. E "Ouvir resumo" lê o mês em voz alta. O reconhecimento de voz é do seu navegador e o app pede permissão antes do primeiro uso.',
    en: 'You can log spending by voice: tap the chat microphone and dictate. "Listen to summary" reads the month aloud. Speech recognition belongs to your browser and the app asks before the first use.',
    es: 'Puedes anotar gastos hablando: toca el micrófono del chat y dicta. "Escuchar resumen" lee el mes en voz alta. El reconocimiento de voz es del navegador y la app pide permiso antes del primer uso.' },
  { re: /offline|sem internet|instalar|install|celular|iphone|android|app no|sin internet|tela de in[ií]cio/,
    pt: 'Funciona no celular e no computador. No iPhone, abra no Safari, toque em Compartilhar e em Adicionar à Tela de Início. No Android, Chrome, três pontinhos, Instalar app. Depois abre e salva gastos até sem internet.',
    en: 'It works on phone and computer. On iPhone, open in Safari, tap Share, then Add to Home Screen. On Android, Chrome, three dots, Install app. After that it opens and saves spending even offline.',
    es: 'Funciona en el móvil y en el ordenador. En iPhone, abre en Safari, toca Compartir y Añadir a pantalla de inicio. En Android, Chrome, tres puntos, Instalar app. Después abre y guarda gastos incluso sin internet.' },
  { re: /o que [eé] (isso|o prumo|esse app)|como funciona|para que serve|what is (this|prumo)|how does (this|it) work|qu[eé] es (esto|prumo)|c[oó]mo funciona|ajuda|help|ayuda|o que voc[eê] faz|what can you do|qu[eé] puedes/,
    pt: 'O Prumo mostra quanto ainda dá para gastar por dia sem mexer nos cofres. Você lança gastos numa frase, e ele separa, categoriza e cuida de contas, cartão, parcelas, assinaturas e metas. Eu respondo sobre os seus números e sobre como usar cada tela. Pergunte "como lanço um gasto?", "posso comprar o sofá?" ou "como estou indo?".',
    en: 'Prumo shows how much you can still spend per day without touching your pots. You log spending in one sentence, and it splits, categorizes and tracks bills, card, installments, subscriptions and goals. I answer about your numbers and how to use each screen. Try "how do I log an expense?", "can I buy the couch?" or "how am I doing?".',
    es: 'Prumo muestra cuánto puedes gastar aún por día sin tocar tus alcancías. Anotas gastos en una frase y separa, categoriza y sigue cuentas, tarjeta, cuotas, suscripciones y metas. Respondo sobre tus números y sobre cómo usar cada pantalla. Prueba "¿cómo anoto un gasto?", "¿puedo comprar el sofá?" o "¿cómo voy?".' },
];

const strip = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const norm = s => strip(String(s || '').toLowerCase()).replace(/\s+/g, ' ');
const nrm = new Map(T.map(x => [x, new RegExp(strip(x.re.source), 'i')]));

// Plain answer about the app, or null when the question is about the person's own numbers.
// Only "how do I / where is / what is" questions: questions about the person's own numbers stay with the numbers.
const HOW = /\bcomo\b|\bonde\b|\bo que (e|sao)\b|para que|funciona|tem como|da pra|\bhow\b|\bwhere\b|\bwhat (is|are|does)\b|\bcan i (use|install|export|import|delete)\b|donde|que es\b|ajuda|\bhelp\b|ayuda|o que voce faz/;
export function helpAnswer(q, lang) {
  const n = norm(q);
  if (!HOW.test(n)) return null;
  const hit = T.find(x => nrm.get(x).test(n));
  if (!hit) return null;
  return hit[(lang || 'pt').slice(0, 2)] || hit.pt;
}

// Same facts, one line per screen, for the AI advisor's instructions.
export const appGuide = () => T.map(x => '- ' + x.pt).join('\n');
