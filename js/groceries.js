/* ================= Zutaten → Kategorie & Emoji =================
 * Wörterbuch für die automatische Einordnung auf der Einkaufsliste.
 * Längere Begriffe gewinnen („Kokosmilch“ vor „Milch“, „Tomatenmark“ vor „Tomate“).
 */
const SHOP_CATS = [
  { id: "obst", label: "Obst & Gemüse", emoji: "🥦" },
  { id: "allgemein", label: "Allgemein", emoji: "🥫" },
  { id: "kuehl", label: "Kühlfach", emoji: "🧀" },
  { id: "tiefkuehl", label: "Tiefkühl", emoji: "🧊" },
  { id: "haushalt", label: "Haushalt", emoji: "🧻" },
  { id: "getraenke", label: "Getränke", emoji: "🥤" },
];
const shopCatById = (id) => SHOP_CATS.find((c) => c.id === id) || SHOP_CATS[1];

// Begriff → [Kategorie, Emoji]; mehrere Begriffe mit „|“ getrennt
const GROCERY_WORDS = {
  obst: {
    "gurke|gurken|salatgurke": "🥒", "tomate|tomaten|kirschtomate|cherrytomate|rispentomate": "🍅", "zwiebel|zwiebeln|schalotte|schalotten|frühlingszwiebel|lauchzwiebel": "🧅",
    "knoblauch|knoblauchzehe": "🧄", "kartoffel|kartoffeln|süßkartoffel|drillinge": "🥔", "karotte|karotten|möhre|möhren|rüebli": "🥕",
    "paprika|paprikaschote": "🫑", "chili|chilis|chilischote|peperoni|jalapeño|jalapeno": "🌶️", "brokkoli|broccoli|blumenkohl|romanesco": "🥦",
    "salat|kopfsalat|eisbergsalat|rucola|feldsalat|römersalat|spinat|blattspinat|mangold|grünkohl|kohl|weißkohl|rotkohl|wirsing|chinakohl|pak choi|lauch|porree|sellerie|staudensellerie|fenchel|spargel|rosenkohl|kohlrabi": "🥬",
    "pilze|champignon|champignons|pfifferlinge|steinpilze|shiitake|kräuterseitlinge": "🍄", "mais|maiskolben": "🌽", "aubergine|auberginen": "🍆", "zucchini": "🥒",
    "avocado|avocados": "🥑", "zitrone|zitronen": "🍋", "limette|limetten": "🍋", "apfel|äpfel": "🍎", "banane|bananen": "🍌", "birne|birnen": "🍐",
    "orange|orangen|mandarine|mandarinen|clementine|clementinen|grapefruit": "🍊", "erdbeere|erdbeeren": "🍓", "heidelbeere|heidelbeeren|blaubeere|blaubeeren|himbeere|himbeeren|beeren|brombeeren|johannisbeeren": "🫐",
    "traube|trauben|weintrauben": "🍇", "kiwi|kiwis": "🥝", "mango|mangos": "🥭", "ananas": "🍍", "kirsche|kirschen": "🍒", "pfirsich|pfirsiche|nektarine|nektarinen|aprikose|aprikosen": "🍑",
    "melone|wassermelone|honigmelone": "🍉", "ingwer": "🫚", "kürbis|hokkaido|butternut": "🎃", "erbsen|zuckerschoten|grüne bohnen|bohnen grün|edamame": "🫛",
    "petersilie|basilikum|koriander|schnittlauch|minze|dill|rosmarin|thymian|salbei|oregano frisch|kräuter|frische kräuter|zitronengras": "🌿",
    "radieschen|rote bete|rote beete|rettich|pastinake|pastinaken|steckrübe": "🥕", "granatapfel": "🍎", "feige|feigen|datteln": "🍇", "rhabarber": "🥬",
  },
  kuehl: {
    "milch|vollmilch|frischmilch|hafermilch|mandelmilch|sojamilch|buttermilch": "🥛", "sahne|schlagsahne|kochsahne|schmand|crème fraîche|creme fraiche|saure sahne|sauerrahm": "🥛",
    "butter|margarine": "🧈", "käse|parmesan|mozzarella|feta|gouda|emmentaler|cheddar|bergkäse|hirtenkäse|halloumi|ricotta|mascarpone|burrata|camembert|brie|gorgonzola|pecorino|grana padano|reibekäse|frischkäse|hüttenkäse|ziegenkäse": "🧀",
    "joghurt|jogurt|naturjoghurt|griechischer joghurt|skyr|quark|magerquark|pudding": "🥣", "ei|eier": "🥚",
    "hähnchen|hähnchenbrust|hähnchenschenkel|hähnchenkeulen|hühnchen|huhn|pute|putenbrust|hähnchenbrustfilet": "🍗",
    "hackfleisch|hack|rinderhack|gemischtes hack|rind|rindfleisch|steak|gulasch|schwein|schweinefleisch|kotelett|schnitzel|lamm|lammfleisch|filet|braten": "🥩",
    "speck|bacon|pancetta|guanciale": "🥓", "schinken|kochschinken|serrano|prosciutto|salami|aufschnitt|chorizo": "🍖", "wurst|würstchen|bratwurst|wiener": "🌭",
    "lachs|lachsfilet|fisch|kabeljau|seelachs|forelle|thunfisch frisch": "🐟", "garnelen|shrimps|scampi|krabben|gambas": "🦐",
    "tofu|tempeh|räuchertofu": "🧊", "hefe|frische hefe|hefewürfel": "🍞", "blätterteig|pizzateig|quicheteig|filoteig|yufka|mürbeteig|wraps|tortillas": "🫓",
    "hummus|pesto frisch|gnocchi|frische pasta|tortellini": "🍝",
  },
  tiefkuehl: {
    "tk|tiefkühl|tiefgekühlt|gefroren|tiefkühlpizza|pommes|pommes frites|kroketten|fischstäbchen|eis|eiscreme|speiseeis|eiswürfel|tk-erbsen|tk-spinat|tk-beeren|blattspinat tk|tiefkühlgemüse|rahmspinat": "🧊",
  },
  getraenke: {
    "wasser|mineralwasser|sprudel|stilles wasser": "💧", "saft|orangensaft|apfelsaft|apfelschorle|schorle": "🧃", "cola|limo|limonade|fanta|sprite|eistee|energy": "🥤",
    "bier|radler|alkoholfreies bier": "🍺", "wein|weißwein|rotwein|rosé|rose": "🍷", "sekt|prosecco|champagner|crémant": "🥂", "kaffee|kaffeebohnen|espresso|kaffeepads": "☕", "tee|grüner tee|kräutertee|früchtetee": "🍵",
    "gin|rum|wodka|whisky|aperol|likör|tonic": "🍸", "milchshake|smoothie": "🥤",
  },
  haushalt: {
    "klopapier|toilettenpapier": "🧻", "küchenrolle|küchenpapier|servietten": "🧻", "spülmittel|geschirrspültabs|spültabs|schwamm|schwämme|spülschwamm|putzmittel|reiniger|allzweckreiniger|glasreiniger|entkalker": "🧽",
    "müllbeutel|müllsäcke|mülltüten": "🗑️", "alufolie|backpapier|frischhaltefolie|gefrierbeutel|brotdose|zip-beutel": "📜", "waschmittel|weichspüler|fleckentferner": "🧺",
    "seife|handseife|duschgel|shampoo|spülung|deo|deodorant|bodylotion|creme|sonnencreme": "🧴", "zahnpasta|zahnbürste|zahnseide|mundspülung": "🪥", "taschentücher": "🤧",
    "batterien|batterie": "🔋", "kerzen|teelichter": "🕯️", "rasierer|rasierklingen|wattepads|wattestäbchen|binden|tampons|pflaster": "🧴", "glühbirne|leuchtmittel": "💡", "katzenfutter|hundefutter|katzenstreu": "🐾",
  },
  allgemein: {
    "nudeln|pasta|spaghetti|penne|fusilli|tagliatelle|farfalle|linguine|rigatoni|lasagneplatten|maccaroni|makkaroni|bandnudeln|reisnudeln|mie-nudeln|glasnudeln|spätzle": "🍝",
    "reis|basmatireis|jasminreis|risottoreis|milchreis|wildreis|couscous|bulgur|quinoa|polenta|hirse": "🍚", "mehl|weizenmehl|dinkelmehl|vollkornmehl|speisestärke|stärke|paniermehl|semmelbrösel|grieß": "🌾",
    "zucker|puderzucker|brauner zucker|rohrzucker|vanillezucker|ahornsirup|agavendicksaft": "🍬", "salz|meersalz|pfeffer|gewürz|gewürze|paprikapulver|kreuzkümmel|kurkuma|zimt|muskat|muskatnuss|curry|currypulver|garam masala|chiliflocken|oregano|lorbeer|lorbeerblatt|brühwürfel|gemüsebrühe|hühnerbrühe|rinderbrühe|brühe|fond": "🧂",
    "öl|olivenöl|rapsöl|sonnenblumenöl|sesamöl|kokosöl|pflanzenöl": "🫒", "essig|balsamico|weißweinessig|apfelessig|reisessig": "🍶", "brot|toast|toastbrot|vollkornbrot|baguette|ciabatta|fladenbrot|naan": "🍞", "brötchen|semmeln|croissant|croissants|laugenbrezel|brezel": "🥖",
    "honig": "🍯", "zitronensaft|limettensaft": "🍋", "nüsse|walnüsse|haselnüsse|mandeln|cashews|cashewkerne|pinienkerne|erdnüsse|pistazien|sonnenblumenkerne|kürbiskerne|sesam|leinsamen|chiasamen": "🥜",
    "schokolade|kakao|kakaopulver|schokotropfen|kuvertüre|nutella|nougatcreme": "🍫", "gehackte tomaten|passierte tomaten|tomatenmark|dosentomaten|pizzatomaten|stückige tomaten|tomatensauce|passata": "🥫",
    "kokosmilch|kokosnussmilch": "🥥", "linsen|rote linsen|bohnen|kidneybohnen|weiße bohnen|schwarze bohnen|kichererbsen|dosenmais|mais dose": "🫘",
    "haferflocken|müsli|cornflakes|granola": "🥣", "backpulver|natron|trockenhefe|gelatine|vanille|vanilleextrakt|vanilleschote|puddingpulver|zuckerguss|streusel": "🧁",
    "sojasauce|sojasoße|fischsauce|austernsauce|teriyaki|worcestershiresauce|sriracha|tabasco|currypaste|sambal": "🥢", "senf|ketchup|mayo|mayonnaise|remoulade|grillsauce|bbq-sauce": "🍯",
    "marmelade|konfitüre|erdnussbutter": "🍓", "kekse|cracker|zwieback|knäckebrot|reiswaffeln": "🍪", "chips|popcorn|salzstangen|flips|nachos": "🍿", "oliven|kapern|getrocknete tomaten|essiggurken|gewürzgurken|antipasti": "🫒",
    "thunfisch|thunfischdose|sardinen": "🐟", "rosinen|cranberries|trockenobst": "🍇", "kokosraspeln|kokosflocken": "🥥", "wraps|tortilla": "🌮", "pesto": "🌿",
  },
};

// in eine flache, nach Länge sortierte Liste umwandeln
const GROCERY_INDEX = Object.entries(GROCERY_WORDS)
  .flatMap(([cat, words]) => Object.entries(words).flatMap(([keys, emoji]) => keys.split("|").map((k) => ({ k, cat, emoji }))))
  .sort((a, b) => b.k.length - a.k.length);

/** Zutat → { cat, emoji }. unit hilft z. B. bei „Dose“ → Allgemein. */
function categorize(name, unit = "") {
  const n = " " + String(name || "").toLowerCase().replace(/[(),.;:/]/g, " ").replace(/\s+/g, " ").trim() + " ";
  if (/^\s*(tk|tiefkühl)/.test(n) || /\btk\b/.test(n)) return { cat: "tiefkuehl", emoji: "🧊" };
  let hit = null;
  for (const e of GROCERY_INDEX) {
    // ganzes Wort oder Wortanfang/-ende (deutsche Komposita: „Hähnchenbrustfilet“, „Cocktailtomaten“)
    const i = n.indexOf(e.k);
    if (i < 0) continue;
    const before = n[i - 1], after = n[i + e.k.length];
    const wordStart = before === " ";
    const wordEnd = after === " " || after === "n" || after === "s" || after === "e";
    if (wordStart || wordEnd || e.k.length >= 5) { hit = e; break; }
  }
  if (/^dose|^dosen/i.test(unit) && (!hit || hit.cat === "obst")) return { cat: "allgemein", emoji: "🥫" };
  return hit ? { cat: hit.cat, emoji: hit.emoji } : { cat: "allgemein", emoji: "🛒" };
}

/* ================= Eigene Zutaten ================= */
let CUSTOM_GROCERIES = []; // { id, kind: "custom", name, emoji, cat, unit, amount }
function setCustomGroceries(list) { CUSTOM_GROCERIES = list; }
function findCustom(name) {
  const n = String(name || "").toLowerCase().trim();
  if (!n) return null;
  return CUSTOM_GROCERIES.find((c) => c.name.toLowerCase() === n)
    || [...CUSTOM_GROCERIES].sort((a, b) => b.name.length - a.name.length).find((c) => c.name.length >= 3 && n.includes(c.name.toLowerCase()))
    || null;
}
// eigene Zutaten haben Vorrang vor dem Wörterbuch
const _categorizeBase = categorize;
categorize = function (name, unit = "") {
  const c = findCustom(name);
  return c ? { cat: c.cat, emoji: c.emoji } : _categorizeBase(name, unit);
};

/* ================= Passende Einheit & Startmenge ================= */
const SHOP_UNITS = ["Stk.", "g", "kg", "ml", "l", "Packung", "Dose", "Flasche", "Bund", "Becher", "Glas", "Tube", "Netz", "Schale", "Beutel", "Rolle", "Kiste", "Würfel"];

// [Begriffe, Einheit, Startmenge] – längere Begriffe zuerst geprüft
const QTY_RULES = [
  ["gurke|paprika|zwiebel|rote zwiebel|zitrone|limette|apfel|banane|birne|orange|mango|ananas|melone|wassermelone|kiwi|avocado|aubergine|zucchini|kürbis|hokkaido|butternut|brokkoli|blumenkohl|romanesco|kopfsalat|eisbergsalat|römersalat|salat|kohlrabi|fenchel|chili|peperoni|mais|maiskolben|granatapfel|knoblauch|ingwer|sellerie|staudensellerie|lauch|porree|mandarine|grapefruit|pfirsich|nektarine|baguette|ciabatta|fladenbrot|brot|croissant|brezel", "Stk.", 1],
  ["brötchen|semmeln|laugenbrezel", "Stk.", 4],
  ["ei|eier", "Stk.", 10],
  ["frühlingszwiebel|lauchzwiebel|petersilie|basilikum|koriander|schnittlauch|minze|dill|rosmarin|thymian|salbei|kräuter|radieschen|karotten|möhren", "Bund", 1],
  ["kartoffeln|kartoffel|drillinge|süßkartoffeln|zwiebeln|äpfel|mandarinen|clementinen", "kg", 1],
  ["tomaten|tomate|rispentomate", "g", 500],
  ["kirschtomaten|cherrytomaten|cocktailtomaten|erdbeeren|heidelbeeren|blaubeeren|himbeeren|beeren|brombeeren|trauben|weintrauben|champignons|pilze|pfifferlinge|kräuterseitlinge", "Schale", 1],
  ["spinat|blattspinat|rucola|feldsalat|grünkohl|mangold|zuckerschoten|grüne bohnen|edamame|erbsen|rosenkohl|spargel|karotte|möhre|rote bete|pastinaken", "g", 250],
  ["nudeln|pasta|spaghetti|penne|fusilli|tagliatelle|farfalle|linguine|rigatoni|maccaroni|makkaroni|bandnudeln|lasagneplatten|reisnudeln|glasnudeln|spätzle|gnocchi|tortellini|frische pasta", "g", 500],
  ["reis|basmatireis|jasminreis|risottoreis|milchreis|couscous|bulgur|quinoa|polenta|linsen|rote linsen|haferflocken|müsli|grieß", "g", 500],
  ["mehl|weizenmehl|dinkelmehl|zucker|puderzucker|brauner zucker|rohrzucker", "kg", 1],
  ["hackfleisch|hack|rinderhack|gemischtes hack|rindfleisch|gulasch|schweinefleisch|lammfleisch", "g", 500],
  ["hähnchen|hähnchenbrust|hähnchenbrustfilet|hähnchenschenkel|hühnchen|putenbrust|lachs|lachsfilet|fisch|kabeljau|seelachs|garnelen|shrimps|steak|schnitzel|filet|tofu|räuchertofu|tempeh", "g", 400],
  ["speck|bacon|pancetta|schinken|kochschinken|salami|aufschnitt|chorizo|serrano|prosciutto", "g", 150],
  ["käse|gouda|emmentaler|cheddar|bergkäse|reibekäse|parmesan|grana padano|pecorino|ziegenkäse", "g", 200],
  ["mozzarella|feta|hirtenkäse|halloumi|burrata|camembert|brie|frischkäse|ricotta|mascarpone|hüttenkäse|gorgonzola", "Packung", 1],
  ["butter|margarine", "g", 250],
  ["milch|vollmilch|frischmilch|hafermilch|mandelmilch|sojamilch|buttermilch", "l", 1],
  ["sahne|schlagsahne|kochsahne|schmand|crème fraîche|creme fraiche|saure sahne|sauerrahm|joghurt|naturjoghurt|griechischer joghurt|skyr|quark|magerquark|pudding", "Becher", 1],
  ["gehackte tomaten|passierte tomaten|dosentomaten|stückige tomaten|pizzatomaten|kokosmilch|kidneybohnen|weiße bohnen|schwarze bohnen|kichererbsen|bohnen|dosenmais|thunfisch|thunfischdose|sardinen", "Dose", 1],
  ["tomatenmark|senf|mayo|mayonnaise", "Tube", 1],
  ["öl|olivenöl|rapsöl|sonnenblumenöl|sesamöl|essig|balsamico|sojasauce|sojasoße|ketchup|grillsauce|fischsauce", "Flasche", 1],
  ["honig|marmelade|konfitüre|erdnussbutter|nutella|nougatcreme|pesto|oliven|kapern|gewürzgurken|essiggurken|getrocknete tomaten|currypaste|brühe|gemüsebrühe|hühnerbrühe", "Glas", 1],
  ["hefe|frische hefe|hefewürfel", "Würfel", 1],
  ["wasser|mineralwasser|sprudel|stilles wasser|bier|radler", "Kiste", 1],
  ["saft|orangensaft|apfelsaft|wein|weißwein|rotwein|rosé|sekt|prosecco|cola|limo|eistee|tonic|gin|rum|wodka|aperol", "Flasche", 1],
  ["kaffee|kaffeebohnen|espresso", "g", 500],
  ["schokolade|zartbitterschokolade", "Stk.", 1],
  ["nüsse|walnüsse|haselnüsse|mandeln|cashews|cashewkerne|erdnüsse|pinienkerne|pistazien|sonnenblumenkerne|kürbiskerne|rosinen", "g", 200],
  ["klopapier|toilettenpapier|küchenrolle", "Packung", 1],
  ["alufolie|backpapier|frischhaltefolie", "Rolle", 1],
  ["müllbeutel|müllsäcke|gefrierbeutel", "Rolle", 1],
  ["spülmittel|waschmittel|weichspüler|duschgel|shampoo|handseife|allzweckreiniger|glasreiniger", "Flasche", 1],
  ["zahnpasta", "Tube", 1],
].map(([keys, unit, amount]) => ({ keys: keys.split("|"), unit, amount }));
const QTY_INDEX = QTY_RULES.flatMap((r) => r.keys.map((k) => ({ k, unit: r.unit, amount: r.amount }))).sort((a, b) => b.k.length - a.k.length);
const CAT_DEFAULT_QTY = { obst: ["Stk.", 1], kuehl: ["Packung", 1], tiefkuehl: ["Packung", 1], allgemein: ["Packung", 1], haushalt: ["Packung", 1], getraenke: ["Flasche", 1] };

/** Zutat → { unit, amount } als sinnvoller Startwert */
function suggestQty(name) {
  const c = findCustom(name);
  if (c && c.unit) return { unit: c.unit, amount: c.amount ?? 1 };
  const n = " " + String(name || "").toLowerCase().trim() + " ";
  const exact = QTY_INDEX.find((e) => n.trim() === e.k);
  const hit = exact || QTY_INDEX.find((e) => e.k.length >= 4 && n.includes(e.k));
  if (hit) return { unit: hit.unit, amount: hit.amount };
  const [unit, amount] = CAT_DEFAULT_QTY[categorize(name).cat] || ["Stk.", 1];
  return { unit, amount };
}

/** Einheiten für Rezepte (inkl. Küchenmaße) */
const RECIPE_UNITS = ["", "g", "kg", "ml", "l", "EL", "TL", "Prise", "Stk.", "Zehe", "Scheibe", "Bund", "Dose", "Becher", "Packung", "Glas", "Tasse", "Handvoll", "Spritzer", "Würfel", "Tube", "Flasche", "Schale", "Zweig", "Blatt"];

/** sinnvolle Schrittweite für −/+ */
function qtyStep(unit, amount) {
  if (unit === "g" || unit === "ml") return amount >= 1000 ? 250 : amount >= 200 ? 50 : amount >= 50 ? 25 : 10;
  if (unit === "kg" || unit === "l") return 0.5;
  if (unit === "EL" || unit === "TL" || unit === "Tasse") return 0.5;
  return 1;
}

/** Rezept-Startmenge: wie Einkauf, aber Küchenmaße für Gewürze, Öl & Co. */
const RECIPE_QTY = [
  ["salz|pfeffer|zucker|muskat|muskatnuss|zimt", "Prise", 1],
  ["öl|olivenöl|rapsöl|sonnenblumenöl|sesamöl|essig|balsamico|sojasauce|sojasoße|honig|senf|tomatenmark|fischsauce|ahornsirup|mehl|speisestärke|butter", "EL", 1],
  ["paprikapulver|kreuzkümmel|kurkuma|curry|currypulver|garam masala|chiliflocken|oregano|backpulver|natron|vanillezucker|gemüsebrühe|brühe", "TL", 1],
  ["knoblauch|knoblauchzehe", "Zehe", 2],
  ["milch|sahne|kochsahne|wasser|brühe", "ml", 200],
  ["nudeln|pasta|spaghetti|penne|fusilli|tagliatelle|farfalle|linguine|rigatoni|bandnudeln|reis|basmatireis|risottoreis|couscous|bulgur|quinoa", "g", 250],
  ["hackfleisch|rinderhack|hähnchenbrust|hähnchen|lachs|lachsfilet|tofu|garnelen", "g", 300],
  ["käse|parmesan|reibekäse|feta|mozzarella", "g", 100],
  ["kartoffeln|kartoffel", "g", 500],
].map(([keys, unit, amount]) => ({ keys: keys.split("|"), unit, amount }));
function suggestRecipeQty(name) {
  const n = String(name || "").toLowerCase().trim();
  const hit = RECIPE_QTY.find((r) => r.keys.includes(n)) || RECIPE_QTY.find((r) => r.keys.some((k) => k.length >= 4 && n.includes(k)));
  if (hit) return { unit: hit.unit, amount: hit.amount };
  const s = suggestQty(name);
  // Einkaufseinheiten wie Kiste/Netz/Packung passen im Rezept selten → Stück
  return ["Kiste", "Netz", "Rolle"].includes(s.unit) ? { unit: "Stk.", amount: 1 } : s;
}

/* ================= Vorschläge beim Tippen ================= */
const SUGGEST_SKIP = new Set(["jogurt", "sojasoße", "creme fraiche", "rose", "huhn", "tk", "tiefkühl", "tiefgekühlt", "gefroren", "ei", "hack", "eis", "tee", "öl", "rind", "huhn", "schwein", "filet", "braten", "creme", "rose", "energy", "fond"]);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SUGGEST_BASE = (() => {
  const seen = new Set(), out = [];
  for (const [cat, words] of Object.entries(GROCERY_WORDS)) {
    for (const [keys, emoji] of Object.entries(words)) {
      for (const k of keys.split("|")) {
        if (SUGGEST_SKIP.has(k) || k.length < 3 || seen.has(k)) continue;
        // Mehrzahl ausblenden, wenn die Einzahl schon vorkommt („Gurken“ neben „Gurke“)
        if ([k.replace(/en$/, ""), k.replace(/n$/, ""), k.replace(/s$/, ""), k.replace(/e$/, "")].some((x) => x !== k && seen.has(x))) { seen.add(k); continue; }
        seen.add(k);
        out.push({ name: cap(k), cat, emoji });
      }
    }
  }
  out.push({ name: "Eier", cat: "kuehl", emoji: "🥚" }, { name: "Eis", cat: "tiefkuehl", emoji: "🍨" }, { name: "Tee", cat: "getraenke", emoji: "🍵" });
  return out;
})();

/** passende Vorschläge (eigene Zutaten zuerst) */
function suggestGroceries(query, limit = 6) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  const custom = CUSTOM_GROCERIES.map((c) => ({ name: c.name, cat: c.cat, emoji: c.emoji, custom: true }));
  const all = [...custom, ...SUGGEST_BASE.filter((b) => !custom.some((c) => c.name.toLowerCase() === b.name.toLowerCase()))];
  const starts = all.filter((s) => s.name.toLowerCase().startsWith(q));
  const contains = all.filter((s) => !s.name.toLowerCase().startsWith(q) && s.name.toLowerCase().includes(q));
  const rank = (a, b) => (b.custom ? 1 : 0) - (a.custom ? 1 : 0) || a.name.length - b.name.length;
  return [...starts.sort(rank), ...contains.sort(rank)].slice(0, limit);
}
const isKnownGrocery = (name) => {
  const n = String(name || "").toLowerCase().trim();
  return CUSTOM_GROCERIES.some((c) => c.name.toLowerCase() === n) || SUGGEST_BASE.some((s) => s.name.toLowerCase() === n);
};

const EMOJI_CHOICES = ["🥒","🍅","🧅","🧄","🥔","🥕","🫑","🌶️","🥦","🥬","🍄","🌽","🍆","🥑","🍋","🍎","🍏","🍌","🍐","🍊","🍓","🫐","🍇","🥝","🥭","🍍","🍒","🍑","🍉","🥥","🫚","🎃","🫛","🌿","🥛","🧈","🧀","🥚","🍗","🥩","🥓","🍖","🌭","🐟","🦐","🍤","🍝","🍚","🌾","🍞","🥖","🥐","🥯","🫓","🌮","🍕","🍔","🍟","🥫","🫘","🥜","🌰","🍯","🧂","🫒","🍶","🥣","🍫","🍪","🍰","🧁","🍬","🍿","🥨","🍨","🧊","💧","🧃","🥤","🍺","🍷","🥂","☕","🍵","🧋","🧻","🧽","🧴","🧼","🪥","🧺","🗑️","🔋","🕯️","🐾","💐","🛒"];
