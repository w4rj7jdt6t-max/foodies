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
