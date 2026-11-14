/* ================= Übersetzung EN → DE =================
 * 1. Eingebautes Wörterbuch für Zutaten, Einheiten, Küchen & Kategorien (offline, zuverlässig)
 * 2. Freitexte (Titel, Zubereitung) über kostenlose Übersetzungsdienste:
 *    Google (inoffizieller Endpunkt) → MyMemory → sonst Original
 * Ergebnisse werden im Browser zwischengespeichert.
 */
const TR = (() => {
  const KEY = "foodies-tr-v1";
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { cache = {}; }
  let saveTimer;
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const keys = Object.keys(cache);
        if (keys.length > 3000) keys.slice(0, keys.length - 3000).forEach((k) => delete cache[k]);
        localStorage.setItem(KEY, JSON.stringify(cache));
      } catch {}
    }, 400);
  };

  /* ---------- Wörterbücher ---------- */
  const ING = {
    "chicken": "Hähnchen", "chicken breast": "Hähnchenbrust", "chicken breasts": "Hähnchenbrust", "chicken thighs": "Hähnchenschenkel", "chicken legs": "Hähnchenkeulen",
    "chicken stock": "Hühnerbrühe", "beef stock": "Rinderbrühe", "vegetable stock": "Gemüsebrühe", "stock cube": "Brühwürfel", "chicken stock cube": "Hühnerbrühwürfel",
    "beef": "Rindfleisch", "minced beef": "Rinderhackfleisch", "ground beef": "Rinderhackfleisch", "beef brisket": "Rinderbrust", "lamb": "Lammfleisch", "lamb mince": "Lammhackfleisch",
    "pork": "Schweinefleisch", "bacon": "Speck", "ham": "Schinken", "sausages": "Würstchen", "chorizo": "Chorizo",
    "salmon": "Lachs", "tuna": "Thunfisch", "prawns": "Garnelen", "king prawns": "Riesengarnelen", "white fish": "weißer Fisch", "cod": "Kabeljau",
    "onion": "Zwiebel", "onions": "Zwiebeln", "red onion": "rote Zwiebel", "red onions": "rote Zwiebeln", "spring onions": "Frühlingszwiebeln", "spring onion": "Frühlingszwiebel", "shallots": "Schalotten", "shallot": "Schalotte",
    "garlic": "Knoblauch", "garlic clove": "Knoblauchzehe", "garlic cloves": "Knoblauchzehen", "ginger": "Ingwer", "ginger garlic paste": "Ingwer-Knoblauch-Paste",
    "olive oil": "Olivenöl", "vegetable oil": "Pflanzenöl", "sunflower oil": "Sonnenblumenöl", "sesame oil": "Sesamöl", "oil": "Öl", "butter": "Butter", "unsalted butter": "ungesalzene Butter",
    "salt": "Salz", "pepper": "Pfeffer", "black pepper": "schwarzer Pfeffer", "sea salt": "Meersalz", "sugar": "Zucker", "brown sugar": "brauner Zucker", "caster sugar": "feiner Zucker", "icing sugar": "Puderzucker",
    "flour": "Mehl", "plain flour": "Mehl", "self-raising flour": "Mehl mit Backpulver", "baking powder": "Backpulver", "bicarbonate of soda": "Natron", "yeast": "Hefe", "cornstarch": "Speisestärke", "cornflour": "Speisestärke", "breadcrumbs": "Paniermehl",
    "egg": "Ei", "eggs": "Eier", "egg yolks": "Eigelb", "egg yolk": "Eigelb", "egg white": "Eiweiß", "egg whites": "Eiweiß",
    "milk": "Milch", "water": "Wasser", "cream": "Sahne", "double cream": "Sahne", "heavy cream": "Sahne", "single cream": "Kochsahne", "sour cream": "Schmand", "creme fraiche": "Crème fraîche",
    "yogurt": "Joghurt", "greek yogurt": "griechischer Joghurt", "natural yogurt": "Naturjoghurt", "cheese": "Käse", "parmesan": "Parmesan", "parmesan cheese": "Parmesan", "cheddar cheese": "Cheddar", "mozzarella": "Mozzarella", "feta": "Feta",
    "rice": "Reis", "basmati rice": "Basmatireis", "long grain rice": "Langkornreis", "jasmine rice": "Jasminreis",
    "potatoes": "Kartoffeln", "potato": "Kartoffel", "red potatoes": "rote Kartoffeln", "sweet potatoes": "Süßkartoffeln", "sweet potato": "Süßkartoffel",
    "pasta": "Nudeln", "spaghetti": "Spaghetti", "penne": "Penne", "penne rigate": "Penne", "noodles": "Nudeln", "egg noodles": "Eiernudeln", "rice noodles": "Reisnudeln", "lasagne sheets": "Lasagneplatten",
    "tomato": "Tomate", "tomatoes": "Tomaten", "chopped tomatoes": "gehackte Tomaten", "tomato puree": "Tomatenmark", "tomato paste": "Tomatenmark", "cherry tomatoes": "Kirschtomaten", "passata": "passierte Tomaten", "plum tomatoes": "Eiertomaten",
    "carrot": "Karotte", "carrots": "Karotten", "celery": "Staudensellerie", "mushrooms": "Champignons", "spinach": "Spinat", "broccoli": "Brokkoli", "cauliflower": "Blumenkohl", "peas": "Erbsen", "sweetcorn": "Mais",
    "red pepper": "rote Paprika", "green pepper": "grüne Paprika", "yellow pepper": "gelbe Paprika", "courgettes": "Zucchini", "courgette": "Zucchini", "zucchini": "Zucchini", "aubergine": "Aubergine", "eggplant": "Aubergine",
    "cucumber": "Gurke", "lettuce": "Salat", "avocado": "Avocado", "leek": "Lauch", "cabbage": "Kohl", "pumpkin": "Kürbis", "butternut squash": "Butternusskürbis", "beetroot": "Rote Bete", "kale": "Grünkohl",
    "kidney beans": "Kidneybohnen", "chickpeas": "Kichererbsen", "lentils": "Linsen", "red lentils": "rote Linsen", "black beans": "schwarze Bohnen", "green beans": "grüne Bohnen",
    "lemon": "Zitrone", "lime": "Limette", "lemon juice": "Zitronensaft", "lime juice": "Limettensaft", "lemon zest": "Zitronenschale", "orange": "Orange", "apple": "Apfel", "apples": "Äpfel", "banana": "Banane", "bananas": "Bananen",
    "parsley": "Petersilie", "coriander": "Koriander", "cilantro": "Koriander", "basil": "Basilikum", "thyme": "Thymian", "oregano": "Oregano", "rosemary": "Rosmarin", "sage": "Salbei", "mint": "Minze", "dill": "Dill", "chives": "Schnittlauch", "bay leaf": "Lorbeerblatt", "bay leaves": "Lorbeerblätter",
    "cumin": "Kreuzkümmel", "ground cumin": "gemahlener Kreuzkümmel", "cumin seeds": "Kreuzkümmelsamen", "paprika": "Paprikapulver", "smoked paprika": "geräuchertes Paprikapulver", "turmeric": "Kurkuma", "ground turmeric": "Kurkuma",
    "chilli powder": "Chilipulver", "chili powder": "Chilipulver", "cayenne pepper": "Cayennepfeffer", "cinnamon": "Zimt", "nutmeg": "Muskatnuss", "garam masala": "Garam Masala", "curry powder": "Currypulver", "coriander seeds": "Koriandersamen", "ground coriander": "gemahlener Koriander",
    "chilli": "Chili", "red chilli": "rote Chili", "green chilli": "grüne Chili", "chilli flakes": "Chiliflocken",
    "soy sauce": "Sojasauce", "fish sauce": "Fischsauce", "oyster sauce": "Austernsauce", "worcestershire sauce": "Worcestershiresauce", "mustard": "Senf", "dijon mustard": "Dijonsenf",
    "vinegar": "Essig", "white wine vinegar": "Weißweinessig", "red wine vinegar": "Rotweinessig", "balsamic vinegar": "Balsamico", "rice vinegar": "Reisessig",
    "white wine": "Weißwein", "red wine": "Rotwein", "honey": "Honig", "maple syrup": "Ahornsirup", "coconut milk": "Kokosmilch", "peanut butter": "Erdnussbutter", "peanuts": "Erdnüsse",
    "sesame seed": "Sesam", "sesame seeds": "Sesam", "almonds": "Mandeln", "walnuts": "Walnüsse", "pine nuts": "Pinienkerne",
    "chocolate": "Schokolade", "dark chocolate": "Zartbitterschokolade", "cocoa": "Kakao", "vanilla extract": "Vanilleextrakt", "vanilla": "Vanille",
  };
  const UNIT = {
    cup: { u: "ml", f: 240 }, cups: { u: "ml", f: 240 },
    tbsp: { u: "EL" }, tbs: { u: "EL" }, tbls: { u: "EL" }, tblsp: { u: "EL" }, tablespoon: { u: "EL" }, tablespoons: { u: "EL" },
    tsp: { u: "TL" }, teaspoon: { u: "TL" }, teaspoons: { u: "TL" },
    oz: { u: "g", f: 28.35 }, ounce: { u: "g", f: 28.35 }, ounces: { u: "g", f: 28.35 },
    lb: { u: "g", f: 453.6 }, lbs: { u: "g", f: 453.6 }, pound: { u: "g", f: 453.6 }, pounds: { u: "g", f: 453.6 },
    g: { u: "g" }, gr: { u: "g" }, gram: { u: "g" }, grams: { u: "g" }, kg: { u: "kg" }, ml: { u: "ml" }, l: { u: "l" }, litre: { u: "l" }, liter: { u: "l" }, litres: { u: "l" },
    pinch: { u: "Prise" }, clove: { u: "Zehe" }, cloves: { u: "Zehe" }, can: { u: "Dose" }, cans: { u: "Dose" }, tin: { u: "Dose" }, tins: { u: "Dose" },
    handful: { u: "Handvoll" }, slice: { u: "Scheibe" }, slices: { u: "Scheiben" }, bunch: { u: "Bund" }, sprig: { u: "Zweig" }, sprigs: { u: "Zweige" }, dash: { u: "Spritzer" }, piece: { u: "Stk." }, pieces: { u: "Stk." },
  };
  const DESC = {
    "large": "groß", "medium": "mittelgroß", "small": "klein", "chopped": "gehackt", "finely chopped": "fein gehackt", "diced": "gewürfelt", "sliced": "in Scheiben",
    "minced": "fein gehackt", "grated": "gerieben", "crushed": "zerdrückt", "to taste": "nach Geschmack", "to serve": "zum Servieren", "to garnish": "zum Garnieren",
    "peeled": "geschält", "beaten": "verquirlt", "melted": "geschmolzen", "juice of": "Saft von", "zest of": "Schale von", "for frying": "zum Braten", "handful": "eine Handvoll",
  };
  const AREA = {
    American: "Amerikanisch", British: "Britisch", Canadian: "Kanadisch", Chinese: "Chinesisch", Croatian: "Kroatisch", Dutch: "Niederländisch", Egyptian: "Ägyptisch",
    French: "Französisch", Greek: "Griechisch", Indian: "Indisch", Irish: "Irisch", Italian: "Italienisch", Jamaican: "Jamaikanisch", Japanese: "Japanisch", Kenyan: "Kenianisch",
    Malaysian: "Malaysisch", Mexican: "Mexikanisch", Moroccan: "Marokkanisch", Polish: "Polnisch", Portuguese: "Portugiesisch", Russian: "Russisch", Spanish: "Spanisch",
    Thai: "Thailändisch", Tunisian: "Tunesisch", Turkish: "Türkisch", Vietnamese: "Vietnamesisch", Filipino: "Philippinisch", Ukrainian: "Ukrainisch", Norwegian: "Norwegisch",
    Syrian: "Syrisch", Algerian: "Algerisch", Argentinian: "Argentinisch", Australian: "Australisch", Venezulan: "Venezolanisch", Saudi: "Saudi-Arabisch", Slovakian: "Slowakisch",
    "United States": "USA", "United Kingdom": "Großbritannien", Unknown: "",
  };
  const CAT = {
    Beef: "Rind", Chicken: "Hähnchen", Dessert: "Dessert", Lamb: "Lamm", Miscellaneous: "Verschiedenes", Pasta: "Pasta", Pork: "Schwein", Seafood: "Fisch & Meeresfrüchte",
    Side: "Beilage", Starter: "Vorspeise", Vegan: "Vegan", Vegetarian: "Vegetarisch", Breakfast: "Frühstück", Goat: "Ziege",
  };

  /* ---------- Maschinelle Übersetzung ---------- */
  let googleOk = true;
  const byteLen = (s) => new TextEncoder().encode(s).length;

  async function viaGoogle(text) {
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=de&dt=t&q=" + encodeURIComponent(text);
    const res = await fetch(url);
    if (!res.ok) throw new Error("google " + res.status);
    const data = await res.json();
    return data[0].map((seg) => seg[0]).join("");
  }
  async function viaMyMemory(text) {
    const url = "https://api.mymemory.translated.net/get?langpair=en|de&q=" + encodeURIComponent(text);
    const res = await fetch(url);
    const data = await res.json();
    if (data.responseStatus !== 200 || data.quotaFinished) throw new Error("mymemory " + data.responseStatus);
    return data.responseData.translatedText;
  }
  async function translateChunk(text) {
    if (googleOk) {
      try { return await viaGoogle(text); } catch { googleOk = false; }
    }
    return viaMyMemory(text);
  }

  // Zeilen zu Paketen (≤ 450 Byte) bündeln; überlange Zeilen nach Sätzen teilen
  function splitLong(line) {
    if (byteLen(line) <= 450) return [line];
    const parts = line.match(/[^.!?]+[.!?]*\s*/g) || [line];
    const out = []; let cur = "";
    for (const p of parts) {
      if (cur && byteLen(cur + p) > 450) { out.push(cur.trim()); cur = ""; }
      cur += p;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.flatMap((s) => (byteLen(s) > 450 ? s.match(/.{1,200}(\s|$)/g) || [s] : [s]));
  }

  /** Liste englischer Texte → deutsche Texte (bei Fehlern das Original) */
  async function many(texts) {
    const todo = [...new Set(texts.filter((t) => t && !(t in cache)))];
    if (todo.length) {
      // Jede Eingabe in Stücke zerlegen, Stücke zu Paketen zusammenfassen
      const pieces = todo.map((t) => splitLong(t.replace(/\s*\n\s*/g, " ")));
      const flat = pieces.flat();
      const chunks = []; let cur = [];
      for (const s of flat) {
        if (cur.length && byteLen([...cur, s].join("\n")) > 450) { chunks.push(cur); cur = []; }
        cur.push(s);
      }
      if (cur.length) chunks.push(cur);
      const results = new Map();
      let i = 0;
      const worker = async () => {
        while (i < chunks.length) {
          const chunk = chunks[i++];
          try {
            const out = (await translateChunk(chunk.join("\n"))).split(/\n/).map((s) => s.trim());
            if (out.length === chunk.length) chunk.forEach((s, k) => results.set(s, out[k]));
            else if (chunk.length === 1) results.set(chunk[0], out.join(" "));
          } catch {}
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      todo.forEach((t, k) => {
        const ok = pieces[k].every((p) => results.has(p));
        if (ok) cache[t] = pieces[k].map((p) => results.get(p)).join(" ");
      });
      persist();
    }
    return texts.map((t) => (t && cache[t]) || t);
  }

  /* ---------- Hilfen ---------- */
  const fahrenheit = (s) => s.replace(/(\d{3})\s*(?:°|º|degrees?\s*)?\s*F\b/gi, (_, f) => `${Math.round(((+f - 32) * 5) / 9 / 5) * 5} °C`);

  function ingredient(i) {
    let amount = i.amount, unit = "", desc = [];
    const words = String(i.unit || "").toLowerCase().replace(/\./g, "").trim();
    if (words) {
      const [first, ...rest] = words.split(/\s+/);
      const u = UNIT[first];
      if (u) {
        unit = u.u;
        if (u.f && amount != null) amount = amount * u.f;
        if (rest.length) desc.push(rest.join(" "));
      } else desc.push(words);
    }
    const base = String(i.name || "").trim();
    return { amount, unit, base, desc: desc.join(" ") };
  }

  return { many, ING, UNIT, DESC, AREA, CAT, fahrenheit, ingredient, get cache() { return cache; } };
})();

/** Kartentitel und Untertitel einer Ideenliste übersetzen (verändert die Objekte) */
async function translateCards(ideas) {
  const titles = await TR.many(ideas.map((i) => i.title));
  ideas.forEach((idea, k) => {
    idea.title = titles[k];
    if (idea.meta) idea.summary = [TR.AREA[idea.meta.area] ?? idea.meta.area, TR.CAT[idea.meta.cat] ?? idea.meta.cat].filter(Boolean).join(" · ");
  });
  return ideas;
}

/** Komplettes Rezept übersetzen (Titel, Zutaten, Einheiten, Zubereitung) */
async function translateIdea(idea) {
  if (idea.translated) return idea;
  const ings = idea.ingredients.map(TR.ingredient);
  const unknownNames = ings.map((x) => x.base).filter((b) => !TR.ING[b.toLowerCase()]);
  const unknownDesc = ings.map((x) => x.desc).filter((d) => d && !TR.DESC[d]);
  const steps = idea.steps.map(TR.fahrenheit);
  const [title, ...rest] = await TR.many([idea.title, ...steps, ...unknownNames, ...unknownDesc]);
  const stepsDe = rest.slice(0, steps.length);
  const lookup = new Map();
  [...unknownNames, ...unknownDesc].forEach((src, k) => lookup.set(src, rest[steps.length + k]));
  const tr = (s, dict) => dict[s.toLowerCase()] || lookup.get(s) || s;

  const anyFailed = [idea.title, ...steps].some((s) => s && !(s in TR.cache));
  return {
    ...idea,
    title,
    steps: stepsDe,
    ingredients: ings.map((x) => {
      const name = tr(x.base, TR.ING);
      const d = x.desc ? tr(x.desc, TR.DESC) : "";
      return { amount: x.amount, unit: x.unit, name: d ? `${name} (${d})` : name };
    }),
    summary: idea.meta ? [TR.AREA[idea.meta.area] ?? idea.meta.area, TR.CAT[idea.meta.cat] ?? idea.meta.cat].filter(Boolean).join(" · ") : idea.summary,
    translated: true,
    origin: anyFailed
      ? "Aus der Rezept-Datenbank TheMealDB. Die automatische Übersetzung war gerade nicht vollständig möglich – manches steht noch auf Englisch."
      : "Aus der Rezept-Datenbank TheMealDB, automatisch ins Deutsche übersetzt und in g/ml umgerechnet. Beim Übernehmen könnt ihr alles anpassen.",
  };
}
