/**
 * Short, original grammar notes for beginners (A1–A2).
 * Written for this app; not taken from any textbook or reference grammar.
 */
export interface GrammarTopic {
  id: string;
  title: string;
  summary: string;
  points: string[];
  table?: { head: string[]; rows: string[][] };
  examples: { sv: string; en: string }[];
}

export const GRAMMAR: GrammarTopic[] = [
  {
    id: 'en-ett',
    title: 'En and ett: the two genders',
    summary: 'Every Swedish noun is either an en-word or an ett-word. The gender decides the article, the definite ending and the form of adjectives.',
    points: [
      'Roughly three nouns out of four are en-words. There is no reliable rule, so learn every noun together with its article: “en bil”, “ett hus”. This app always shows the article for that reason.',
      'People and animals are almost always en-words (en man, en kvinna, en hund). The best-known exception is “ett barn” (a child).',
      'En/ett also mean “one”, so “en kaffe” can be “a coffee” or “one coffee”.',
    ],
    examples: [
      { sv: 'Jag har en bil och ett hus.', en: 'I have a car and a house.' },
      { sv: 'Hon läser en bok.', en: 'She is reading a book.' },
      { sv: 'Vi har ett barn.', en: 'We have one child.' },
    ],
  },
  {
    id: 'definite',
    title: 'The definite form: “the” is an ending',
    summary: 'Swedish does not put a word for “the” in front of a plain noun. It glues an ending onto the noun instead.',
    points: [
      'En-words add -en (or just -n after a vowel): en bil → bilen, en flicka → flickan.',
      'Ett-words add -et (or just -t after a vowel): ett hus → huset, ett äpple → äpplet.',
      'When an adjective stands before the noun you need both a separate article (den / det / de) and the ending: den röda bilen, det stora huset, de nya böckerna. This “double definiteness” feels odd at first but is completely regular.',
    ],
    table: {
      head: ['', 'indefinite', 'definite'],
      rows: [
        ['en-word', 'en bil', 'bilen'],
        ['ett-word', 'ett hus', 'huset'],
        ['with adjective', 'en röd bil', 'den röda bilen'],
      ],
    },
    examples: [
      { sv: 'Bilen är ny.', en: 'The car is new.' },
      { sv: 'Huset ligger vid sjön.', en: 'The house is by the lake.' },
      { sv: 'Jag gillar den röda bilen.', en: 'I like the red car.' },
    ],
  },
  {
    id: 'plural',
    title: 'Plural: five patterns',
    summary: 'Swedish nouns form the plural in five ways. The last sound of the word and its gender usually tell you which one.',
    points: [
      'The definite plural (“the cars”) is built on the plural: mostly -na (bilarna), -a after the -n plural (äpplena), and -en for ett-words with no plural ending (husen).',
      'A few very common nouns change their vowel: en man → män, en bok → böcker, en hand → händer, en stad → städer.',
      'Dictionary entries in this app list the forms in the order definite – plural – definite plural.',
    ],
    table: {
      head: ['ending', 'typical nouns', 'example'],
      rows: [
        ['-or', 'en-words ending in -a', 'en flicka → flickor'],
        ['-ar', 'many short en-words, en-words in -e', 'en bil → bilar, en pojke → pojkar'],
        ['-er', 'many loanwords, stress on the last syllable', 'en telefon → telefoner'],
        ['-n', 'ett-words ending in a vowel', 'ett äpple → äpplen'],
        ['(no ending)', 'ett-words ending in a consonant; people in -are', 'ett hus → hus, en lärare → lärare'],
      ],
    },
    examples: [
      { sv: 'Jag har två bilar.', en: 'I have two cars.' },
      { sv: 'Flickorna spelar fotboll.', en: 'The girls are playing football.' },
      { sv: 'Det finns många hus här.', en: 'There are many houses here.' },
    ],
  },
  {
    id: 'pronouns',
    title: 'Personal pronouns',
    summary: 'Pronouns have a subject form and an object form, like English I / me.',
    points: [
      '“De” and “dem” are both pronounced “dom” in everyday speech, and many people write “dom” informally.',
      '“Ni” is “you” for several people. For one person, “du” is used with almost everybody, including your boss and strangers.',
      '“Den” and “det” both mean “it”: den for en-words, det for ett-words. “Hen” is a gender-neutral alternative to han/hon.',
      '“Man” is the general “one / you / people”: Man får inte röka här – You may not smoke here.',
    ],
    table: {
      head: ['subject', 'object', 'English'],
      rows: [
        ['jag', 'mig', 'I / me'],
        ['du', 'dig', 'you (one person)'],
        ['han / hon', 'honom / henne', 'he, she / him, her'],
        ['den / det', 'den / det', 'it'],
        ['vi', 'oss', 'we / us'],
        ['ni', 'er', 'you (several)'],
        ['de', 'dem', 'they / them'],
      ],
    },
    examples: [
      { sv: 'Jag älskar dig.', en: 'I love you.' },
      { sv: 'Kan du hjälpa oss?', en: 'Can you help us?' },
      { sv: 'Hon ser honom varje dag.', en: 'She sees him every day.' },
    ],
  },
  {
    id: 'possessives',
    title: 'Possessives: min, mitt, mina',
    summary: 'Words like “my” and “your” agree with the thing that is owned: one form for en-words, one for ett-words, one for plurals.',
    points: [
      'hans (his), hennes (her), dess (its) and deras (their) never change.',
      'Swedish has a special reflexive possessive, sin / sitt / sina, used when the owner is the subject of the same clause. “Han älskar sin fru” – he loves his own wife. “Han älskar hans fru” – he loves another man’s wife.',
      'The noun after a possessive is always in the indefinite form: min bil, never “min bilen”.',
      'Ownership with a name just adds -s, without an apostrophe: Annas bil, Sveriges huvudstad.',
    ],
    table: {
      head: ['', 'en-word', 'ett-word', 'plural'],
      rows: [
        ['my', 'min', 'mitt', 'mina'],
        ['your (one person)', 'din', 'ditt', 'dina'],
        ['our', 'vår', 'vårt', 'våra'],
        ['your (several)', 'er', 'ert', 'era'],
        ['his/her/their own', 'sin', 'sitt', 'sina'],
      ],
    },
    examples: [
      { sv: 'Det här är min bror och mina föräldrar.', en: 'This is my brother and my parents.' },
      { sv: 'Var är ditt pass?', en: 'Where is your passport?' },
      { sv: 'Hon ringer sin mamma varje söndag.', en: 'She calls her mum every Sunday.' },
    ],
  },
  {
    id: 'present',
    title: 'Verbs: the present tense',
    summary: 'Good news: a Swedish verb has one form for all persons. Jag är, du är, vi är, de är.',
    points: [
      'The present tense nearly always ends in -r: talar, läser, bor, kommer.',
      'The infinitive (dictionary form) usually ends in -a: att tala, att läsa. “Att” corresponds to English “to”.',
      'There is no separate -ing form. “Jag läser” is both “I read” and “I am reading”.',
      'The most important irregular presents: är (am/is/are), har (have), vet (know), vill (want), kan (can), ska (will/shall), måste (must).',
    ],
    table: {
      head: ['infinitive', 'present', 'English'],
      rows: [
        ['tala', 'talar', 'speak'],
        ['läsa', 'läser', 'read'],
        ['bo', 'bor', 'live'],
        ['vara', 'är', 'be'],
        ['ha', 'har', 'have'],
      ],
    },
    examples: [
      { sv: 'Jag bor i Sverige.', en: 'I live in Sweden.' },
      { sv: 'Vi talar lite svenska.', en: 'We speak a little Swedish.' },
      { sv: 'Vad gör du?', en: 'What are you doing?' },
    ],
  },
  {
    id: 'past',
    title: 'Verbs: past, perfect and the four groups',
    summary: 'The past tense is one word (talade). The perfect is “har” plus a special form called the supine (har talat).',
    points: [
      'Group 1 (the largest, -ar verbs): add -ade and -at. Every new verb that enters the language goes here: googlar, googlade, googlat.',
      'Group 2 (-er verbs): -de / -t, or -te / -t after the voiceless consonants k, p, s, t, x.',
      'Group 3 (short verbs ending in a long vowel): -dde / -tt.',
      'Group 4 (strong and irregular verbs): the vowel changes and the forms must be memorised – they are also the most frequent verbs. The answer screen in Study shows present, past, supine and imperative for every verb.',
      'The pluperfect uses “hade”: jag hade ätit – I had eaten.',
    ],
    table: {
      head: ['group', 'infinitive', 'present', 'past', 'supine'],
      rows: [
        ['1', 'tala', 'talar', 'talade', 'talat'],
        ['2a', 'ringa', 'ringer', 'ringde', 'ringt'],
        ['2b', 'köpa', 'köper', 'köpte', 'köpt'],
        ['3', 'bo', 'bor', 'bodde', 'bott'],
        ['4', 'skriva', 'skriver', 'skrev', 'skrivit'],
        ['4', 'gå', 'går', 'gick', 'gått'],
        ['4', 'vara', 'är', 'var', 'varit'],
      ],
    },
    examples: [
      { sv: 'Jag köpte en ny cykel i går.', en: 'I bought a new bike yesterday.' },
      { sv: 'Har du ätit lunch?', en: 'Have you had lunch?' },
      { sv: 'Vi bodde i Umeå i tre år.', en: 'We lived in Umeå for three years.' },
    ],
  },
  {
    id: 'future',
    title: 'Talking about the future',
    summary: 'Swedish has no future ending. There are three everyday ways to talk about what will happen.',
    points: [
      'Present tense plus a time expression is the most common: Jag åker i morgon – I’m leaving tomorrow.',
      '“Ska” + infinitive expresses a plan, decision or promise: Jag ska ringa dig – I’ll call you.',
      '“Kommer att” + infinitive is a neutral prediction, something that happens regardless of anybody’s will: Det kommer att regna – It is going to rain.',
    ],
    examples: [
      { sv: 'Vi ses på måndag.', en: 'See you on Monday.' },
      { sv: 'Jag ska börja en svenskkurs i höst.', en: 'I am going to start a Swedish course this autumn.' },
      { sv: 'Du kommer att klara det.', en: 'You will manage it.' },
    ],
  },
  {
    id: 'modals',
    title: 'Helping verbs: kan, vill, måste, ska, får, brukar',
    summary: 'After a helping verb the main verb is a bare infinitive – no “att”.',
    points: [
      'kan = can, know how to · vill = want to · måste = must, have to · ska = will, am going to · får = may, am allowed to · bör = ought to · brukar = usually do.',
      '“Vill” means “want”, never “will”. “I will help you” is “Jag ska hjälpa dig”.',
      '“Behöver inte” is “don’t have to”; “får inte” is “must not”.',
      '“Brukar” has no neat English equivalent: Jag brukar dricka kaffe på morgonen – I usually drink coffee in the morning.',
    ],
    examples: [
      { sv: 'Kan du tala engelska?', en: 'Can you speak English?' },
      { sv: 'Jag vill lära mig svenska.', en: 'I want to learn Swedish.' },
      { sv: 'Man får inte parkera här.', en: 'You are not allowed to park here.' },
    ],
  },
  {
    id: 'v2',
    title: 'Word order: the verb comes second (V2)',
    summary: 'In a statement, the conjugated verb is always the second element. This is the single most important word-order rule in Swedish.',
    points: [
      'If the sentence starts with the subject, the order looks like English: Jag dricker kaffe nu.',
      'If anything else comes first – a time, a place, an object, a whole subordinate clause – the verb still has to be second, so the subject moves behind the verb: Nu dricker jag kaffe.',
      '“Second” means second element, not second word: “I morgon bitti” (early tomorrow morning) counts as one element.',
      'The words och, men, eller, för, så (“and, but, or, for, so”) link clauses and do not count as the first element.',
    ],
    table: {
      head: ['1st place', 'verb', 'subject', 'rest'],
      rows: [
        ['Jag', 'dricker', '–', 'kaffe nu.'],
        ['Nu', 'dricker', 'jag', 'kaffe.'],
        ['I Sverige', 'dricker', 'man', 'mycket kaffe.'],
        ['När jag vaknar', 'dricker', 'jag', 'kaffe.'],
      ],
    },
    examples: [
      { sv: 'I dag arbetar jag hemma.', en: 'Today I am working from home.' },
      { sv: 'Sedan gick vi på bio.', en: 'Then we went to the cinema.' },
      { sv: 'Den boken har jag redan läst.', en: 'That book I have already read.' },
    ],
  },
  {
    id: 'negation',
    title: 'Negation: where does “inte” go?',
    summary: '“Inte” (not) comes after the conjugated verb in a main clause, but before it in a subordinate clause.',
    points: [
      'Main clause: Jag dricker inte kaffe. With a helping verb, inte goes between the two verbs: Jag kan inte komma.',
      'When the subject has moved behind the verb (see V2), inte follows the subject: I dag dricker jag inte kaffe.',
      'Subordinate clause (after att, som, eftersom, om, när …): inte comes before the verb. A handy name for this is the BIFF rule – “i Bisats kommer Inte Före det Finita verbet”.',
      'Other small adverbs behave the same way: aldrig (never), alltid (always), ofta (often), bara (only), kanske (maybe), också (also).',
    ],
    examples: [
      { sv: 'Jag förstår inte.', en: 'I don’t understand.' },
      { sv: 'Han säger att han inte kan komma.', en: 'He says that he can’t come.' },
      { sv: 'Vi stannar hemma eftersom det inte är varmt.', en: 'We are staying at home because it isn’t warm.' },
    ],
  },
  {
    id: 'questions',
    title: 'Questions',
    summary: 'There is no “do” in Swedish questions. You simply put the verb first, or a question word followed by the verb.',
    points: [
      'Yes/no question: verb + subject. Talar du svenska? – Do you speak Swedish?',
      'Question words: vad (what), vem (who), var (where), vart (where to), när (when), varför (why), hur (how), vilken / vilket / vilka (which). The verb comes directly after.',
      '“Var” is a position, “vart” is a direction: Var bor du? / Vart går du?',
      'To answer “yes” to a negative question, use “jo” instead of “ja”: Kommer du inte? – Jo, jag kommer.',
    ],
    examples: [
      { sv: 'Vad heter du?', en: 'What is your name?' },
      { sv: 'Var ligger stationen?', en: 'Where is the station?' },
      { sv: 'Hur mycket kostar den?', en: 'How much does it cost?' },
    ],
  },
  {
    id: 'adjectives',
    title: 'Adjectives agree with the noun',
    summary: 'An adjective has three forms: basic (en-words), -t (ett-words) and -a (plural and all definite forms).',
    points: [
      'The same happens after “är”: Bilen är stor. Huset är stort. Bilarna är stora.',
      'After den/det/de, a possessive (min, Annas) or a demonstrative, always use the -a form: min nya bil, det gamla huset.',
      'Some spelling quirks: ny → nytt, röd → rött, god → gott. “Liten” is irregular: en liten bil, ett litet hus, små bilar, den lilla bilen.',
      'A few adjectives never change: bra, extra, rosa, gratis, kul.',
    ],
    table: {
      head: ['', 'indefinite', 'definite'],
      rows: [
        ['en-word', 'en stor bil', 'den stora bilen'],
        ['ett-word', 'ett stort hus', 'det stora huset'],
        ['plural', 'stora bilar', 'de stora bilarna'],
      ],
    },
    examples: [
      { sv: 'Vi har ett litet kök.', en: 'We have a small kitchen.' },
      { sv: 'Äpplena är röda och goda.', en: 'The apples are red and tasty.' },
      { sv: 'Jag bor i det gula huset.', en: 'I live in the yellow house.' },
    ],
  },
  {
    id: 'comparison',
    title: 'Comparing: -are, -ast',
    summary: 'Most adjectives add -are for “more” and -ast for “most”. “Than” is “än”.',
    points: [
      'Long adjectives and those ending in -isk use mer / mest: mer intressant, mest praktisk.',
      'The common irregular ones: bra – bättre – bäst, dålig – sämre – sämst, liten – mindre – minst, stor – större – störst, gammal – äldre – äldst, ung – yngre – yngst, mycket – mer – mest, många – fler – flest.',
      '“As … as” is “lika … som”: Hon är lika lång som jag.',
    ],
    table: {
      head: ['basic', 'comparative', 'superlative'],
      rows: [
        ['billig', 'billigare', 'billigast'],
        ['stor', 'större', 'störst'],
        ['bra', 'bättre', 'bäst'],
      ],
    },
    examples: [
      { sv: 'Tåget är snabbare än bussen.', en: 'The train is faster than the bus.' },
      { sv: 'Det här är den bästa pizzan i stan.', en: 'This is the best pizza in town.' },
      { sv: 'Min syster är äldre än jag.', en: 'My sister is older than I am.' },
    ],
  },
  {
    id: 'prepositions',
    title: 'Common prepositions of place and time',
    summary: 'Prepositions rarely match English one-to-one. Learn them in short phrases rather than alone.',
    points: [
      'Place: i = inside / in a city or country (i Sverige, i köket); på = on a surface, and also many institutions, islands and activities (på bordet, på jobbet, på bio, på Gotland); hos = at somebody’s place (hos mig, hos läkaren); till = to; från = from; vid = by, next to.',
      'Time: på måndag (on Monday), i januari, på sommaren (in summer), i dag / i morgon / i går, klockan tre (at three o’clock).',
      'Duration versus time ago: “i två år” = for two years; “för två år sedan” = two years ago; “om två år” = in two years from now.',
    ],
    examples: [
      { sv: 'Jag är på jobbet.', en: 'I am at work.' },
      { sv: 'Vi ses hos mig klockan sju.', en: 'See you at my place at seven.' },
      { sv: 'Jag flyttade till Sverige för tre år sedan.', en: 'I moved to Sweden three years ago.' },
    ],
  },
  {
    id: 'particle-verbs',
    title: 'Particle verbs',
    summary: 'A verb plus a small stressed word often gets a brand-new meaning – just like English “give up” or “find out”.',
    points: [
      'The particle is stressed when you speak; that stress is what separates “hälsa PÅ” (visit) from “hälsa på” (say hello to).',
      'Very common ones: tycka om (like), hålla med (agree), känna igen (recognise), stänga av (switch off), sätta på (switch on), ta med (bring), gå upp (get up), komma ihåg (remember), se ut (look, appear).',
      'The particle follows the verb, but “inte” and a subject that has moved (V2) slip in between: Jag tycker inte om fisk.',
    ],
    examples: [
      { sv: 'Jag tycker om kaffe.', en: 'I like coffee.' },
      { sv: 'Kommer du ihåg mig?', en: 'Do you remember me?' },
      { sv: 'Kan du stänga av tv:n?', en: 'Can you switch off the TV?' },
    ],
  },
  {
    id: 'reflexive',
    title: 'Reflexive verbs: sig',
    summary: 'Many everyday verbs take a reflexive pronoun that English leaves out: “jag sätter mig” – I sit (myself) down.',
    points: [
      'The pronoun follows the person: jag … mig, du … dig, han/hon/de … sig, vi … oss, ni … er.',
      'Common ones: lära sig (learn), känna sig (feel), sätta sig (sit down), lägga sig (go to bed), gifta sig (get married), skynda sig (hurry), bestämma sig (make up one’s mind).',
      '“Mig, dig, sig” are pronounced “mej, dej, sej”.',
    ],
    examples: [
      { sv: 'Jag lär mig svenska.', en: 'I am learning Swedish.' },
      { sv: 'Hur känner du dig?', en: 'How do you feel?' },
      { sv: 'De gifte sig förra året.', en: 'They got married last year.' },
    ],
  },
  {
    id: 'there-is',
    title: '“Det finns” and the all-purpose “det”',
    summary: 'Swedish sentences need a subject, and “det” fills the gap – for weather, time, and “there is / there are”.',
    points: [
      '“Det finns” = there is / there are (something exists). It does not change in the plural.',
      'Weather and time: Det regnar. Det är kallt. Det är sent.',
      '“Det är” introduces or identifies something, whatever its gender or number: Det är min bror. Det är mina vänner.',
    ],
    examples: [
      { sv: 'Det finns en mataffär runt hörnet.', en: 'There is a grocery shop round the corner.' },
      { sv: 'Det snöar mycket här på vintern.', en: 'It snows a lot here in winter.' },
      { sv: 'Finns det kaffe kvar?', en: 'Is there any coffee left?' },
    ],
  },
  {
    id: 'pronunciation',
    title: 'Pronunciation survival kit',
    summary: 'A handful of spelling-to-sound rules explain most surprises. Use the play buttons everywhere in the app and imitate out loud.',
    points: [
      'Nine vowels, each long or short: a, o, u, å (back or “hard”) and e, i, y, ä, ö (front or “soft”). A vowel is long before a single consonant (glas, long a) and short before two (glass, short a).',
      'å sounds like the vowel in English “more”, ä like “air” or “bed”, ö like the vowel in “bird”. Swedish “o” is often pronounced like English “oo” (bok, stor), and “u” is a sound of its own made with tightly rounded lips (hus).',
      'Before the soft vowels, g becomes a “y” sound (göra, ge), k becomes a soft “sh/ch” sound (köpa, kär) and sk becomes the “sj” sound (sked, skön). Before hard vowels they stay hard (gata, kall, skola).',
      'The “sj” sound (sju, station, skjorta) is a breathy “hw/sh” that varies by region; “tj/kj” (tjugo, kjol) is like the “ch” in German “ich”. Both are understood even when imperfect.',
      'rs sounds like English “sh” (mars, person); rd, rt, rn, rl also melt into single sounds. In “-ig” endings and in “jag”, “det”, “med”, “och” the final consonant is normally silent in speech.',
      'Swedish has a melodic word accent; two-syllable words often have a second rising beat (the ² mark in this app’s phonetic transcriptions). Do not worry about it early on – you will be understood without it.',
    ],
    examples: [
      { sv: 'Sju sjuksköterskor skötte sju sjösjuka sjömän.', en: 'Seven nurses took care of seven seasick sailors. (a tongue twister for the sj-sound)' },
      { sv: 'Jag köper gärna kött och kyckling.', en: 'I am happy to buy meat and chicken. (soft k and g)' },
      { sv: 'God morgon! Hur mår du?', en: 'Good morning! How are you?' },
    ],
  },
];
