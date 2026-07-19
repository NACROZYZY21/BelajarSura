// ============================================================
// SEED LENGKAP Belajar Ceria (Fase 2 Tahap 8)
//   node scripts/seed-lengkap.mjs
// Idempotent: aman dijalankan berulang (cek kunci alami dulu).
// ============================================================
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = readFileSync(resolve(root, ".env.local"), "utf8");
const env = Object.fromEntries(
  envFile.split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// RNG deterministik (LCG) supaya hasil seed stabil antar-run
let _s = 42;
const rnd = () => (_s = (_s * 1103515245 + 12345) % 2147483648) / 2147483648;
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- 10 MATA PELAJARAN ----------
const SUBJECTS = [
  { nama_id: "Membaca & Bahasa", nama_en: "Reading & Language", ikon: "📖", warna: "#29b0f0", urutan: 1 },
  { nama_id: "Berhitung & Matematika", nama_en: "Counting & Math", ikon: "🔢", warna: "#22c55e", urutan: 2 },
  { nama_id: "Bahasa Inggris", nama_en: "English", ikon: "🇬🇧", warna: "#8b5cf6", urutan: 3 },
  { nama_id: "Sains & IPA", nama_en: "Science", ikon: "🔬", warna: "#f97316", urutan: 4 },
  { nama_id: "IPS", nama_en: "Social Studies", ikon: "🗺️", warna: "#0ea5e9", urutan: 5 },
  { nama_id: "Agama & Budi Pekerti", nama_en: "Religion & Character", ikon: "🕌", warna: "#10b981", urutan: 6 },
  { nama_id: "Seni & Menggambar", nama_en: "Art & Drawing", ikon: "🎨", warna: "#ec4899", urutan: 7 },
  { nama_id: "PJOK", nama_en: "Physical Education", ikon: "⚽", warna: "#ef4444", urutan: 8 },
  { nama_id: "Komputer Dasar", nama_en: "Basic Computer", ikon: "💻", warna: "#6366f1", urutan: 9 },
  { nama_id: "Bahasa Daerah", nama_en: "Local Language", ikon: "🏛️", warna: "#d97706", urutan: 10 },
];

// ---------- HELPER PEMBUAT SOAL (bobot: 5 PG × 14 + 2 esai × 15 = 100) ----------
const pgSoal = (q_id, q_en, opsi_id, opsi_en, benar) =>
  ({ tipe: "pg", pertanyaan_id: q_id, pertanyaan_en: q_en, opsi: { id: opsi_id, en: opsi_en }, jawaban_benar: String(benar), poin: 14 });
const esaiSoal = (q_id, q_en, jawab) =>
  ({ tipe: "esai", pertanyaan_id: q_id, pertanyaan_en: q_en, opsi: null, jawaban_benar: jawab, poin: 15 });

// matematika: soal aritmetika dengan jawaban dijamin benar
function mkMath(judul_id, judul_en, kelas, urutan, op, pgPairs, esaiPairs) {
  const calc = (a, b) => (op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b);
  const soal = pgPairs.map(([a, b]) => {
    const ans = calc(a, b);
    const opts = shuffle([ans, ans + 1, Math.max(0, ans - 1), ans + 2].map(String));
    return pgSoal(`${a} ${op} ${b} = ...`, `${a} ${op} ${b} = ...`, opts, opts, opts.indexOf(String(ans)));
  });
  esaiPairs.forEach(([a, b]) =>
    soal.push(esaiSoal(`${a} ${op} ${b} = ... (tulis angkanya)`, `${a} ${op} ${b} = ... (write the number)`, String(calc(a, b))))
  );
  const contoh = pgPairs.slice(0, 2).map(([a, b]) => `- **${a} ${op} ${b} = ${calc(a, b)}**`).join("\n");
  return {
    judul_id, judul_en, tingkat_kelas: kelas, urutan,
    materi_id: `# ${judul_id} ${op === "×" ? "✖️" : op === "÷" ? "➗" : op === "+" ? "➕" : "➖"}\n\nAyo berlatih ${judul_id.toLowerCase()}! Perhatikan contoh di bawah ini, lalu coba kerjakan sendiri ya.\n\n${contoh}\n\nIngat: kerjakan pelan-pelan dan teliti. Kamu pasti bisa! 💪`,
    materi_en: `# ${judul_en}\n\nLet's practice ${judul_en.toLowerCase()}! Look at the examples below, then try them yourself.\n\n${contoh}\n\nRemember: work slowly and carefully. You can do it! 💪`,
    soal,
  };
}

// bahasa inggris: dari daftar kosakata
function mkVocab(judul_id, judul_en, kelas, urutan, tema, pairs) {
  const soal = pairs.slice(0, 5).map(([id_w, en_w]) => {
    const others = shuffle(pairs.filter(([i]) => i !== id_w).map(([, e]) => e)).slice(0, 3);
    const opts = shuffle([en_w, ...others]);
    return pgSoal(
      `Apa bahasa Inggris dari '${id_w}'?`, `What is the English word for '${id_w}'?`,
      opts, opts, opts.indexOf(en_w)
    );
  });
  pairs.slice(5, 7).forEach(([id_w, en_w]) =>
    soal.push(esaiSoal(`Tulis bahasa Inggris dari '${id_w}'`, `Write the English word for '${id_w}'`, en_w.toLowerCase()))
  );
  const daftar = pairs.map(([i, e]) => `- **${i}** = ${e}`).join("\n");
  return {
    judul_id, judul_en, tingkat_kelas: kelas, urutan,
    materi_id: `# ${judul_id} 🇬🇧\n\nHari ini kita belajar kosakata bahasa Inggris tentang **${tema}**. Baca dan ucapkan pelan-pelan ya!\n\n${daftar}\n\nCoba ucapkan tiap kata tiga kali supaya cepat hafal! 🎉`,
    materi_en: `# ${judul_en} 🇬🇧\n\nToday we learn English vocabulary about **${tema}**. Read and say each word slowly!\n\n${daftar}\n\nSay each word three times to memorize it fast! 🎉`,
    soal,
  };
}

// modul tulis-tangan ringkas
function mkModul(judul_id, judul_en, kelas, urutan, materi_id, materi_en, soal) {
  return { judul_id, judul_en, tingkat_kelas: kelas, urutan, materi_id, materi_en, soal };
}

// ---------- MODUL PER MAPEL ----------
const MODULES = {
  "Berhitung & Matematika": [
    // 3 modul lama (Mengenal Angka, Penjumlahan, Pengurangan) sudah ada dari seed awal
    mkMath("Perkalian Dasar", "Basic Multiplication", 2, 4, "×", [[3, 4], [5, 2], [6, 3], [4, 4], [7, 2]], [[8, 2], [9, 3]]),
    mkMath("Pembagian Dasar", "Basic Division", 2, 5, "÷", [[10, 2], [12, 3], [8, 4], [15, 5], [6, 2]], [[14, 2], [18, 3]]),
    mkMath("Perkalian Lanjut", "More Multiplication", 3, 6, "×", [[12, 4], [15, 3], [11, 6], [13, 5], [14, 4]], [[16, 5], [17, 3]]),
    mkMath("Penjumlahan Ratusan", "Adding Hundreds", 3, 7, "+", [[123, 45], [210, 90], [156, 44], [305, 95], [240, 60]], [[199, 101], [350, 150]]),
    mkMath("Pengurangan Ribuan", "Subtracting Thousands", 4, 8, "−", [[1200, 350], [1500, 750], [2000, 999], [1750, 250], [1300, 450]], [[1000, 1], [2500, 500]]),
    mkMath("Perkalian Puluhan", "Multiplying Tens", 5, 9, "×", [[25, 12], [30, 15], [24, 20], [45, 11], [50, 14]], [[60, 12], [35, 20]]),
    mkMath("Pembagian Cepat", "Quick Division", 6, 10, "÷", [[144, 12], [225, 15], [196, 14], [169, 13], [288, 12]], [[324, 18], [400, 20]]),
  ],
  "Bahasa Inggris": [
    mkVocab("Warna-warni (Colors)", "Colors", 1, 1, "warna", [["merah", "red"], ["biru", "blue"], ["kuning", "yellow"], ["hijau", "green"], ["hitam", "black"], ["putih", "white"], ["ungu", "purple"]]),
    mkVocab("Angka (Numbers)", "Numbers", 1, 2, "angka", [["satu", "one"], ["dua", "two"], ["tiga", "three"], ["empat", "four"], ["lima", "five"], ["enam", "six"], ["tujuh", "seven"]]),
    mkVocab("Hewan (Animals)", "Animals", 2, 3, "hewan", [["kucing", "cat"], ["anjing", "dog"], ["burung", "bird"], ["ikan", "fish"], ["kuda", "horse"], ["sapi", "cow"], ["ayam", "chicken"]]),
    mkVocab("Keluarga (Family)", "Family", 2, 4, "keluarga", [["ayah", "father"], ["ibu", "mother"], ["kakek", "grandfather"], ["nenek", "grandmother"], ["paman", "uncle"], ["bibi", "aunt"], ["anak", "child"]]),
    mkVocab("Buah-buahan (Fruits)", "Fruits", 3, 5, "buah", [["apel", "apple"], ["pisang", "banana"], ["jeruk", "orange"], ["anggur", "grape"], ["mangga", "mango"], ["semangka", "watermelon"], ["nanas", "pineapple"]]),
    mkVocab("Anggota Tubuh (Body)", "Body Parts", 3, 6, "anggota tubuh", [["kepala", "head"], ["tangan", "hand"], ["kaki", "foot"], ["mata", "eye"], ["telinga", "ear"], ["hidung", "nose"], ["mulut", "mouth"]]),
    mkVocab("Hari (Days)", "Days of the Week", 4, 7, "hari", [["senin", "Monday"], ["selasa", "Tuesday"], ["rabu", "Wednesday"], ["kamis", "Thursday"], ["jumat", "Friday"], ["sabtu", "Saturday"], ["minggu", "Sunday"]]),
    mkVocab("Benda Sekolah (School)", "School Objects", 4, 8, "benda di sekolah", [["buku", "book"], ["pensil", "pencil"], ["meja", "desk"], ["kursi", "chair"], ["tas", "bag"], ["papan tulis", "whiteboard"], ["penghapus", "eraser"]]),
    mkVocab("Kata Kerja (Verbs)", "Action Words", 5, 9, "kata kerja", [["makan", "eat"], ["minum", "drink"], ["tidur", "sleep"], ["lari", "run"], ["membaca", "read"], ["menulis", "write"], ["bermain", "play"]]),
    mkVocab("Alam (Nature)", "Nature", 6, 10, "alam", [["matahari", "sun"], ["bulan", "moon"], ["bintang", "star"], ["hujan", "rain"], ["angin", "wind"], ["gunung", "mountain"], ["laut", "sea"]]),
  ],
  "Membaca & Bahasa": [
    // 3 modul lama sudah ada
    mkModul("Kalimat Sederhana", "Simple Sentences", 2, 4,
      "# Kalimat Sederhana ✏️\n\nKalimat adalah kumpulan kata yang punya arti. Kalimat sederhana punya **subjek** (pelaku) dan **kata kerja**.\n\nContoh:\n- **Adik bermain** bola.\n- **Ibu memasak** nasi.\n\nCoba buat kalimatmu sendiri ya!",
      "# Simple Sentences ✏️\n\nA sentence is a group of words with meaning. A simple sentence has a **subject** and a **verb**.\n\nExamples:\n- **The boy plays** ball.\n- **Mother cooks** rice.\n\nTry making your own sentence!",
      [
        pgSoal("Mana yang merupakan kalimat lengkap?", "Which is a complete sentence?", ["Adik bermain bola", "bola merah itu", "di halaman rumah", "sangat cepat"], ["The boy plays ball", "the red ball", "in the yard", "very fast"], 0),
        pgSoal("'Ibu ___ nasi di dapur.' Kata yang tepat adalah...", "'Mother ___ rice in the kitchen.' The right word is...", ["memasak", "meja", "sepatu", "buku"], ["cooks", "table", "shoe", "book"], 0),
        pgSoal("Subjek pada kalimat 'Budi membaca buku' adalah...", "The subject in 'Budi reads a book' is...", ["Budi", "membaca", "buku", "dan"], ["Budi", "reads", "book", "and"], 0),
        pgSoal("Kata kerja pada kalimat 'Kucing memanjat pohon' adalah...", "The verb in 'The cat climbs the tree' is...", ["kucing", "memanjat", "pohon", "itu"], ["cat", "climbs", "tree", "the"], 1),
        pgSoal("Kalimat yang benar adalah...", "The correct sentence is...", ["Ayah membaca koran", "Koran ayah membaca", "Membaca koran ayah", "Ayah koran membaca"], ["Father reads the newspaper", "Newspaper father reads", "Reads newspaper father", "Father newspaper reads"], 0),
        esaiSoal("Lengkapi: 'Adik ___ susu.' (kata kerja yang cocok)", "Complete: 'The child ___ milk.' (suitable verb)", "minum"),
        esaiSoal("Buat satu kalimat dengan kata 'sekolah'!", "Make one sentence with the word 'school'!", ""),
      ]),
    mkModul("Membaca Cerita Pendek", "Reading Short Stories", 2, 5,
      "# Cerita: Kancil yang Cerdik 🦌\n\nSuatu hari, Kancil ingin menyeberangi sungai yang penuh buaya. Kancil berkata, \"Hai Buaya, raja ingin menghitung kalian!\" Buaya pun berbaris rapi.\n\nKancil melompat dari punggung satu buaya ke buaya lain sambil berhitung, sampai ia tiba di seberang. \"Terima kasih, Buaya!\" seru Kancil sambil tersenyum.\n\nPesan cerita: gunakan kecerdikanmu untuk hal yang baik ya!",
      "# Story: The Clever Mouse-deer 🦌\n\nOne day, Mouse-deer wanted to cross a river full of crocodiles. He said, \"Crocodiles, the king wants to count you!\" The crocodiles lined up neatly.\n\nMouse-deer hopped across their backs while counting until he reached the other side. \"Thank you, Crocodiles!\" he cheered.\n\nMoral: use your cleverness for good things!",
      [
        pgSoal("Siapa tokoh utama cerita di atas?", "Who is the main character?", ["Kancil", "Buaya", "Raja", "Kera"], ["Mouse-deer", "Crocodile", "King", "Monkey"], 0),
        pgSoal("Kancil ingin...", "Mouse-deer wanted to...", ["menyeberangi sungai", "memanjat pohon", "tidur siang", "mencari raja"], ["cross the river", "climb a tree", "take a nap", "find the king"], 0),
        pgSoal("Bagaimana cara Kancil menyeberang?", "How did Mouse-deer cross?", ["melompat di punggung buaya", "berenang sendiri", "naik perahu", "terbang"], ["hopping on crocodile backs", "swimming alone", "by boat", "flying"], 0),
        pgSoal("Buaya berbaris karena...", "The crocodiles lined up because...", ["ingin dihitung raja", "mau tidur", "lapar", "takut hujan"], ["the king would count them", "they were sleepy", "they were hungry", "afraid of rain"], 0),
        pgSoal("Sifat Kancil dalam cerita adalah...", "Mouse-deer's character is...", ["cerdik", "pemalas", "penakut", "sombong"], ["clever", "lazy", "cowardly", "arrogant"], 0),
        esaiSoal("Hewan apa yang berbaris di sungai?", "Which animals lined up in the river?", "buaya"),
        esaiSoal("Apa pesan dari cerita ini menurutmu?", "What is the moral of the story?", ""),
      ]),
    mkModul("Sinonim & Antonim", "Synonyms & Antonyms", 3, 6,
      "# Sinonim & Antonim 🔄\n\n**Sinonim** adalah kata yang artinya sama. Contoh: *pintar* = *pandai*, *senang* = *gembira*.\n\n**Antonim** adalah kata yang artinya berlawanan. Contoh: *besar* ↔ *kecil*, *tinggi* ↔ *rendah*.\n\nMengetahui banyak kata membuat tulisanmu makin bagus!",
      "# Synonyms & Antonyms 🔄\n\n**Synonyms** are words with the same meaning: *smart* = *clever*, *happy* = *glad*.\n\n**Antonyms** are opposites: *big* ↔ *small*, *tall* ↔ *short*.\n\nKnowing many words makes your writing better!",
      [
        pgSoal("Sinonim dari kata 'pintar' adalah...", "A synonym of 'smart' is...", ["pandai", "malas", "kecil", "cepat"], ["clever", "lazy", "small", "fast"], 0),
        pgSoal("Antonim dari kata 'besar' adalah...", "The antonym of 'big' is...", ["kecil", "luas", "tinggi", "berat"], ["small", "wide", "tall", "heavy"], 0),
        pgSoal("Sinonim dari 'gembira' adalah...", "A synonym of 'glad' is...", ["senang", "sedih", "marah", "takut"], ["happy", "sad", "angry", "afraid"], 0),
        pgSoal("Antonim dari 'terang' adalah...", "The antonym of 'bright' is...", ["gelap", "silau", "putih", "jelas"], ["dark", "glaring", "white", "clear"], 0),
        pgSoal("Pasangan antonim yang benar adalah...", "The correct antonym pair is...", ["naik ↔ turun", "besar ↔ luas", "cepat ↔ kilat", "indah ↔ cantik"], ["up ↔ down", "big ↔ wide", "fast ↔ quick", "beautiful ↔ pretty"], 0),
        esaiSoal("Tulis antonim dari kata 'panas'", "Write the antonym of 'hot'", "dingin"),
        esaiSoal("Tulis sinonim dari kata 'indah'", "Write a synonym of 'beautiful'", "cantik"),
      ]),
    mkModul("Tanda Baca", "Punctuation", 3, 7,
      "# Tanda Baca ❗\n\nTanda baca membuat tulisan mudah dibaca:\n\n- **Titik (.)** mengakhiri kalimat berita.\n- **Tanya (?)** untuk kalimat pertanyaan.\n- **Seru (!)** untuk kalimat perintah atau kaget.\n- **Koma (,)** untuk jeda atau memisahkan daftar.\n\nContoh: *Wah, indah sekali pemandangan ini!*",
      "# Punctuation ❗\n\nPunctuation makes writing easy to read:\n\n- **Period (.)** ends a statement.\n- **Question mark (?)** for questions.\n- **Exclamation (!)** for commands or surprise.\n- **Comma (,)** for pauses or lists.\n\nExample: *Wow, this view is beautiful!*",
      [
        pgSoal("'Siapa namamu' sebaiknya diakhiri tanda...", "'What is your name' should end with...", ["?", ".", "!", ","], ["?", ".", "!", ","], 0),
        pgSoal("'Tolong tutup pintunya' sebaiknya diakhiri...", "'Please close the door' should end with...", ["!", "?", ",", ";"], ["!", "?", ",", ";"], 0),
        pgSoal("Tanda titik dipakai untuk...", "A period is used to...", ["mengakhiri kalimat berita", "bertanya", "berteriak", "memisahkan kata"], ["end a statement", "ask", "shout", "separate words"], 0),
        pgSoal("'Ibu membeli apel___ jeruk___ dan pisang.' Tanda yang tepat...", "'Mom bought apples___ oranges___ and bananas.' The right mark...", [",", ".", "?", "!"], [",", ".", "?", "!"], 0),
        pgSoal("Kalimat dengan tanda baca benar adalah...", "The correctly punctuated sentence is...", ["Kapan kamu pulang?", "Kapan kamu pulang.", "Kapan kamu pulang,", "Kapan kamu pulang"], ["When do you go home?", "When do you go home.", "When do you go home,", "When do you go home"], 0),
        esaiSoal("Tanda apa yang dipakai di akhir pertanyaan? (tulis namanya)", "What mark ends a question? (write its name)", "tanda tanya"),
        esaiSoal("Tulis satu kalimat seru tentang pemandangan!", "Write one exclamation about scenery!", ""),
      ]),
    mkModul("Ide Pokok Paragraf", "Main Idea", 4, 8,
      "# Ide Pokok Paragraf 📄\n\n**Ide pokok** adalah hal utama yang dibicarakan dalam paragraf. Biasanya ada di kalimat pertama.\n\nContoh paragraf: *\"Taman kota sangat bermanfaat. Udaranya jadi segar. Warga bisa berolahraga. Anak-anak bisa bermain.\"*\n\nIde pokoknya: **taman kota sangat bermanfaat**. Kalimat lainnya adalah kalimat penjelas.",
      "# Main Idea 📄\n\nThe **main idea** is the most important point of a paragraph, usually in the first sentence.\n\nExample: *\"City parks are very useful. The air becomes fresh. People can exercise. Children can play.\"*\n\nMain idea: **city parks are very useful**. The rest are supporting sentences.",
      [
        pgSoal("Ide pokok biasanya terletak di...", "The main idea is usually in...", ["kalimat pertama", "judul buku", "halaman akhir", "gambar"], ["the first sentence", "the book title", "the last page", "a picture"], 0),
        pgSoal("Kalimat selain ide pokok disebut kalimat...", "Sentences other than the main idea are called...", ["penjelas", "tanya", "perintah", "ajakan"], ["supporting", "question", "command", "invitation"], 0),
        pgSoal("Dari contoh di materi, ide pokoknya adalah...", "From the example, the main idea is...", ["taman kota sangat bermanfaat", "udara segar", "warga berolahraga", "anak-anak bermain"], ["city parks are useful", "fresh air", "people exercise", "children play"], 0),
        pgSoal("Satu paragraf yang baik membahas...", "A good paragraph discusses...", ["satu ide utama", "banyak ide sekaligus", "tanpa ide", "hanya gambar"], ["one main idea", "many ideas at once", "no idea", "only pictures"], 0),
        pgSoal("Untuk menemukan ide pokok kita harus...", "To find the main idea we must...", ["membaca dengan teliti", "melihat sampul", "menghitung kata", "mewarnai buku"], ["read carefully", "look at the cover", "count words", "color the book"], 0),
        esaiSoal("Apa nama kalimat yang menjelaskan ide pokok?", "What do we call sentences that explain the main idea?", "kalimat penjelas"),
        esaiSoal("Tulis satu paragraf pendek (2-3 kalimat) tentang sekolahmu!", "Write a short paragraph (2-3 sentences) about your school!", ""),
      ]),
    mkModul("Puisi Anak", "Children's Poetry", 5, 9,
      "# Puisi Anak 🌈\n\nPuisi adalah karangan indah dengan kata-kata pilihan. Puisi punya **bait** (kumpulan baris) dan **rima** (persamaan bunyi akhir).\n\nContoh:\n*Matahari pagi bersinar cerah,*\n*Menyapa bumi dengan ramah.*\n\nPerhatikan bunyi akhir: cer-**ah** dan ram-**ah** — itulah rima!",
      "# Children's Poetry 🌈\n\nA poem is beautiful writing with chosen words. Poems have **stanzas** (groups of lines) and **rhyme** (matching end sounds).\n\nExample:\n*The morning sun shines so bright,*\n*Greeting the earth with delight.*\n\nNotice: br-**ight** and del-**ight** — that's rhyme!",
      [
        pgSoal("Persamaan bunyi di akhir baris puisi disebut...", "Matching end sounds in poetry are called...", ["rima", "bait", "judul", "tema"], ["rhyme", "stanza", "title", "theme"], 0),
        pgSoal("Kumpulan baris dalam puisi disebut...", "A group of lines in a poem is a...", ["bait", "rima", "kata", "koma"], ["stanza", "rhyme", "word", "comma"], 0),
        pgSoal("Kata yang berima dengan 'cerah' adalah...", "A word that rhymes with 'bright' is...", ["ramah", "dingin", "biru", "cepat"], ["delight", "cold", "blue", "fast"], 0),
        pgSoal("Puisi ditulis dengan bahasa yang...", "Poems are written with language that is...", ["indah", "kasar", "acak", "salah"], ["beautiful", "rude", "random", "wrong"], 0),
        pgSoal("Membaca puisi sebaiknya dengan...", "Poems should be read with...", ["ekspresi dan perasaan", "suara datar", "sangat cepat", "mata tertutup"], ["expression and feeling", "a flat voice", "very fast", "eyes closed"], 0),
        esaiSoal("Apa sebutan untuk kumpulan baris dalam puisi?", "What is a group of lines in a poem called?", "bait"),
        esaiSoal("Buat dua baris puisi tentang ibu dengan rima!", "Write two rhyming lines about mother!", ""),
      ]),
    mkModul("Menulis Surat", "Writing Letters", 6, 10,
      "# Menulis Surat 💌\n\nSurat pribadi punya bagian-bagian:\n\n- **Tempat & tanggal** (kanan atas)\n- **Salam pembuka** — contoh: \"Halo, Nenek tersayang,\"\n- **Isi surat** — kabar dan cerita kita\n- **Salam penutup** — contoh: \"Salam sayang,\"\n- **Nama pengirim**\n\nMenulis surat melatih kita menyampaikan perasaan dengan sopan.",
      "# Writing Letters 💌\n\nA personal letter has parts:\n\n- **Place & date** (top right)\n- **Opening greeting** — e.g. \"Dear Grandma,\"\n- **Body** — our news and stories\n- **Closing** — e.g. \"With love,\"\n- **Sender's name**\n\nLetter writing helps us express feelings politely.",
      [
        pgSoal("Bagian surat paling atas adalah...", "The top part of a letter is...", ["tempat dan tanggal", "nama pengirim", "salam penutup", "isi surat"], ["place and date", "sender's name", "closing", "body"], 0),
        pgSoal("\"Halo, Nenek tersayang,\" termasuk...", "\"Dear Grandma,\" is the...", ["salam pembuka", "isi surat", "tanggal", "alamat"], ["opening greeting", "body", "date", "address"], 0),
        pgSoal("Bagian yang berisi kabar dan cerita adalah...", "The part with news and stories is the...", ["isi surat", "tanggal", "nama", "amplop"], ["body", "date", "name", "envelope"], 0),
        pgSoal("Surat untuk teman memakai bahasa yang...", "A letter to a friend uses language that is...", ["sopan dan akrab", "kasar", "resmi kaku", "asing"], ["polite and friendly", "rude", "stiffly formal", "foreign"], 0),
        pgSoal("Bagian paling akhir surat adalah...", "The last part of a letter is the...", ["nama pengirim", "tanggal", "salam pembuka", "judul"], ["sender's name", "date", "greeting", "title"], 0),
        esaiSoal("Apa nama bagian surat sebelum nama pengirim?", "What comes right before the sender's name?", "salam penutup"),
        esaiSoal("Tulis salam pembuka surat untuk sahabatmu!", "Write an opening greeting for your best friend!", ""),
      ]),
  ],
  "Sains & IPA": [
    mkModul("Panca Indera", "Five Senses", 1, 1,
      "# Panca Indera 👀\n\nManusia punya **lima indera**:\n\n- **Mata** untuk melihat 👁️\n- **Telinga** untuk mendengar 👂\n- **Hidung** untuk mencium bau 👃\n- **Lidah** untuk mengecap rasa 👅\n- **Kulit** untuk meraba ✋\n\nJagalah panca inderamu dengan baik ya!",
      "# Five Senses 👀\n\nHumans have **five senses**:\n\n- **Eyes** to see 👁️\n- **Ears** to hear 👂\n- **Nose** to smell 👃\n- **Tongue** to taste 👅\n- **Skin** to touch ✋\n\nTake good care of your senses!",
      [
        pgSoal("Indera untuk melihat adalah...", "The sense organ for seeing is...", ["mata", "telinga", "hidung", "lidah"], ["eyes", "ears", "nose", "tongue"], 0),
        pgSoal("Kita mendengar suara dengan...", "We hear sounds with our...", ["telinga", "mata", "kulit", "lidah"], ["ears", "eyes", "skin", "tongue"], 0),
        pgSoal("Bau harum bunga dicium dengan...", "We smell flowers with our...", ["hidung", "mata", "telinga", "tangan"], ["nose", "eyes", "ears", "hands"], 0),
        pgSoal("Rasa manis permen dirasakan oleh...", "Sweet candy is tasted by the...", ["lidah", "hidung", "mata", "rambut"], ["tongue", "nose", "eyes", "hair"], 0),
        pgSoal("Jumlah panca indera manusia adalah...", "How many senses do humans have?", ["5", "3", "7", "2"], ["5", "3", "7", "2"], 0),
        esaiSoal("Indera apa yang kita pakai untuk meraba?", "Which sense do we use to touch?", "kulit"),
        esaiSoal("Bagaimana cara menjaga kesehatan mata? Tulis satu cara!", "Write one way to keep your eyes healthy!", ""),
      ]),
    mkModul("Hewan & Tumbuhan", "Animals & Plants", 2, 2,
      "# Hewan & Tumbuhan 🌱\n\nMakhluk hidup butuh makan, tumbuh, dan berkembang biak.\n\n**Hewan** ada yang makan tumbuhan (herbivora, contoh: sapi), makan daging (karnivora, contoh: harimau), dan makan keduanya (omnivora, contoh: ayam).\n\n**Tumbuhan** membuat makanannya sendiri dengan bantuan sinar matahari. Hebat, kan?",
      "# Animals & Plants 🌱\n\nLiving things eat, grow, and reproduce.\n\n**Animals**: plant-eaters (herbivores, e.g. cows), meat-eaters (carnivores, e.g. tigers), and both (omnivores, e.g. chickens).\n\n**Plants** make their own food using sunlight. Amazing, right?",
      [
        pgSoal("Hewan pemakan tumbuhan disebut...", "Plant-eating animals are called...", ["herbivora", "karnivora", "omnivora", "insektivora"], ["herbivores", "carnivores", "omnivores", "insectivores"], 0),
        pgSoal("Harimau termasuk hewan...", "A tiger is a...", ["karnivora", "herbivora", "omnivora", "pemalu"], ["carnivore", "herbivore", "omnivore", "shy animal"], 0),
        pgSoal("Tumbuhan membuat makanan dengan bantuan...", "Plants make food with the help of...", ["sinar matahari", "lampu", "angin malam", "batu"], ["sunlight", "lamps", "night wind", "rocks"], 0),
        pgSoal("Contoh hewan omnivora adalah...", "An example of an omnivore is...", ["ayam", "sapi", "harimau", "ulat"], ["chicken", "cow", "tiger", "caterpillar"], 0),
        pgSoal("Yang BUKAN ciri makhluk hidup adalah...", "Which is NOT a trait of living things?", ["tidak pernah tumbuh", "makan", "bernapas", "berkembang biak"], ["never growing", "eating", "breathing", "reproducing"], 0),
        esaiSoal("Sapi termasuk kelompok hewan pemakan apa?", "What food group does a cow belong to?", "herbivora"),
        esaiSoal("Sebutkan satu contoh hewan karnivora selain harimau!", "Name one carnivore other than a tiger!", ""),
      ]),
    mkModul("Tata Surya", "The Solar System", 5, 3,
      "# Tata Surya 🪐\n\n**Tata surya** adalah matahari dan semua benda langit yang mengelilinginya.\n\nAda **8 planet**: Merkurius, Venus, **Bumi**, Mars, Jupiter, Saturnus, Uranus, Neptunus. Bumi adalah planet ketiga dari matahari — satu-satunya yang kita tahu punya kehidupan.\n\nBumi berputar pada porosnya (rotasi) menyebabkan siang & malam, dan mengelilingi matahari (revolusi) selama satu tahun.",
      "# The Solar System 🪐\n\nThe **solar system** is the sun and everything orbiting it.\n\nThere are **8 planets**: Mercury, Venus, **Earth**, Mars, Jupiter, Saturn, Uranus, Neptune. Earth is the third planet — the only one known to have life.\n\nEarth spins on its axis (rotation) causing day & night, and orbits the sun (revolution) in one year.",
      [
        pgSoal("Jumlah planet di tata surya adalah...", "How many planets are in the solar system?", ["8", "7", "9", "10"], ["8", "7", "9", "10"], 0),
        pgSoal("Planet ketiga dari matahari adalah...", "The third planet from the sun is...", ["Bumi", "Mars", "Venus", "Jupiter"], ["Earth", "Mars", "Venus", "Jupiter"], 0),
        pgSoal("Siang dan malam terjadi karena...", "Day and night happen because of Earth's...", ["rotasi bumi", "revolusi bumi", "gerhana", "hujan"], ["rotation", "revolution", "eclipse", "rain"], 0),
        pgSoal("Planet terbesar di tata surya adalah...", "The largest planet is...", ["Jupiter", "Bumi", "Merkurius", "Mars"], ["Jupiter", "Earth", "Mercury", "Mars"], 0),
        pgSoal("Bumi mengelilingi matahari selama...", "Earth orbits the sun in...", ["satu tahun", "satu hari", "satu bulan", "satu jam"], ["one year", "one day", "one month", "one hour"], 0),
        esaiSoal("Apa nama gerakan bumi berputar pada porosnya?", "What is Earth's spin on its axis called?", "rotasi"),
        esaiSoal("Mengapa Bumi disebut planet istimewa? Jelaskan singkat!", "Why is Earth special? Explain briefly!", ""),
      ]),
  ],
  "IPS": [
    mkModul("Keluargaku", "My Family", 1, 1,
      "# Keluargaku 👨‍👩‍👧‍👦\n\nKeluarga inti terdiri dari **ayah, ibu, dan anak**. Ada juga keluarga besar: kakek, nenek, paman, dan bibi.\n\nDi rumah kita saling menyayangi dan membantu. Ayah dan ibu bekerja serta merawat kita, dan kita membantu pekerjaan ringan di rumah.\n\nKeluarga adalah tempat pertama kita belajar!",
      "# My Family 👨‍👩‍👧‍👦\n\nA core family is **father, mother, and children**. The extended family includes grandparents, uncles, and aunts.\n\nAt home we love and help each other. Parents work and care for us, and we help with light chores.\n\nFamily is our first school!",
      [
        pgSoal("Keluarga inti terdiri dari...", "A core family consists of...", ["ayah, ibu, anak", "tetangga", "teman sekolah", "guru"], ["father, mother, children", "neighbors", "classmates", "teachers"], 0),
        pgSoal("Orang tua dari ayah atau ibu kita disebut...", "Our parents' parents are our...", ["kakek dan nenek", "paman", "sepupu", "adik"], ["grandparents", "uncle", "cousin", "younger sibling"], 0),
        pgSoal("Di rumah, anggota keluarga harus saling...", "At home, family members should...", ["menyayangi", "bertengkar", "mengejek", "berdiam"], ["love each other", "fight", "mock", "ignore"], 0),
        pgSoal("Contoh membantu di rumah adalah...", "An example of helping at home is...", ["merapikan tempat tidur", "membuang sampah sembarangan", "menonton terus", "tidur seharian"], ["making the bed", "littering", "watching TV all day", "sleeping all day"], 0),
        pgSoal("Saudara ayah laki-laki kita panggil...", "Our father's brother is our...", ["paman", "nenek", "bibi", "kakak"], ["uncle", "grandmother", "aunt", "older sibling"], 0),
        esaiSoal("Siapa saja anggota keluarga inti?", "Who are the members of a core family?", ""),
        esaiSoal("Tulis satu cara kamu membantu ibu di rumah!", "Write one way you help your mother at home!", ""),
      ]),
    mkModul("Lingkungan Sekitar", "Our Environment", 2, 2,
      "# Lingkungan Sekitar 🏘️\n\nLingkungan adalah semua yang ada di sekitar kita: rumah, sekolah, jalan, sungai, dan taman.\n\nLingkungan **bersih** membuat kita sehat. Caranya: buang sampah di tempatnya, menanam pohon, dan tidak mencoret-coret tembok.\n\nAyo jadi pahlawan kebersihan di lingkunganmu!",
      "# Our Environment 🏘️\n\nThe environment is everything around us: homes, schools, roads, rivers, and parks.\n\nA **clean** environment keeps us healthy: throw trash in bins, plant trees, and don't scribble on walls.\n\nBe a cleanliness hero in your neighborhood!",
      [
        pgSoal("Sampah sebaiknya dibuang di...", "Trash should go in...", ["tempat sampah", "sungai", "jalan", "halaman tetangga"], ["the trash bin", "the river", "the street", "a neighbor's yard"], 0),
        pgSoal("Lingkungan bersih membuat kita...", "A clean environment makes us...", ["sehat", "sakit", "sedih", "lapar"], ["healthy", "sick", "sad", "hungry"], 0),
        pgSoal("Menanam pohon membuat udara...", "Planting trees makes the air...", ["segar", "kotor", "panas", "bau"], ["fresh", "dirty", "hot", "smelly"], 0),
        pgSoal("Membuang sampah ke sungai menyebabkan...", "Throwing trash in rivers causes...", ["banjir", "udara segar", "ikan senang", "air jernih"], ["floods", "fresh air", "happy fish", "clear water"], 0),
        pgSoal("Contoh menjaga lingkungan sekolah adalah...", "An example of caring for school is...", ["piket kelas", "mencoret meja", "membuang jajan sembarangan", "menginjak taman"], ["class duty", "scribbling on desks", "littering snacks", "stepping on gardens"], 0),
        esaiSoal("Apa akibat membuang sampah ke sungai?", "What happens if we throw trash in rivers?", "banjir"),
        esaiSoal("Tulis dua cara menjaga kebersihan kelas!", "Write two ways to keep the classroom clean!", ""),
      ]),
    mkModul("Peta & Indonesiaku", "Maps & My Indonesia", 4, 3,
      "# Peta & Indonesiaku 🗺️\n\n**Peta** adalah gambar permukaan bumi. Pada peta ada arah mata angin: utara, timur, selatan, barat.\n\n**Indonesia** adalah negara kepulauan terbesar di dunia dengan ribuan pulau. Pulau besar: Sumatra, Jawa, Kalimantan, Sulawesi, dan Papua. Ibu kota kita adalah **Jakarta**.\n\nBanggalah menjadi anak Indonesia! 🇮🇩",
      "# Maps & My Indonesia 🗺️\n\nA **map** is a picture of the earth's surface with compass directions: north, east, south, west.\n\n**Indonesia** is the world's largest archipelago with thousands of islands. Major islands: Sumatra, Java, Kalimantan, Sulawesi, Papua. Our capital is **Jakarta**.\n\nBe proud to be Indonesian! 🇮🇩",
      [
        pgSoal("Ibu kota Indonesia adalah...", "The capital of Indonesia is...", ["Jakarta", "Surabaya", "Medan", "Bandung"], ["Jakarta", "Surabaya", "Medan", "Bandung"], 0),
        pgSoal("Gambar permukaan bumi disebut...", "A picture of the earth's surface is a...", ["peta", "lukisan", "foto", "poster"], ["map", "painting", "photo", "poster"], 0),
        pgSoal("Arah matahari terbit adalah...", "The sun rises in the...", ["timur", "barat", "utara", "selatan"], ["east", "west", "north", "south"], 0),
        pgSoal("Indonesia adalah negara...", "Indonesia is a country of...", ["kepulauan", "gurun", "es", "pegunungan saja"], ["islands", "deserts", "ice", "only mountains"], 0),
        pgSoal("Yang BUKAN pulau besar Indonesia adalah...", "Which is NOT a major Indonesian island?", ["Honshu", "Jawa", "Sumatra", "Papua"], ["Honshu", "Java", "Sumatra", "Papua"], 0),
        esaiSoal("Ke arah mana matahari terbenam?", "In which direction does the sun set?", "barat"),
        esaiSoal("Sebutkan dua pulau besar di Indonesia!", "Name two major islands of Indonesia!", ""),
      ]),
  ],
  "Agama & Budi Pekerti": [
    mkModul("Perilaku Baik", "Good Behavior", 1, 1,
      "# Perilaku Baik 😇\n\nAnak yang baik selalu:\n\n- Memberi **salam** saat bertemu\n- Berkata **tolong**, **terima kasih**, dan **maaf**\n- **Jujur** dan tidak berbohong\n- Menghormati orang tua dan guru\n\nPerilaku baik membuat semua orang senang berteman dengan kita!",
      "# Good Behavior 😇\n\nA good child always:\n\n- Gives **greetings** when meeting others\n- Says **please**, **thank you**, and **sorry**\n- Is **honest** and never lies\n- Respects parents and teachers\n\nGood behavior makes everyone happy to be our friend!",
      [
        pgSoal("Saat diberi hadiah kita mengucapkan...", "When given a gift we say...", ["terima kasih", "tidak mau", "biasa saja", "lagi dong"], ["thank you", "no way", "whatever", "give me more"], 0),
        pgSoal("Jika berbuat salah, kita harus...", "If we make a mistake, we should...", ["minta maaf", "lari", "menyalahkan teman", "diam saja"], ["apologize", "run away", "blame a friend", "stay silent"], 0),
        pgSoal("Saat bertemu guru di jalan kita...", "When meeting a teacher we...", ["memberi salam", "bersembunyi", "pura-pura tidak lihat", "berteriak"], ["greet them", "hide", "pretend not to see", "shout"], 0),
        pgSoal("Anak jujur adalah anak yang...", "An honest child is one who...", ["tidak berbohong", "suka mengambil", "sering marah", "malas belajar"], ["never lies", "likes taking things", "is often angry", "is lazy"], 0),
        pgSoal("Kepada orang tua kita harus...", "To our parents we must be...", ["hormat dan patuh", "cuek", "membantah", "kasar"], ["respectful and obedient", "indifferent", "defiant", "rude"], 0),
        esaiSoal("Apa yang kita ucapkan saat meminta bantuan?", "What do we say when asking for help?", "tolong"),
        esaiSoal("Tulis satu contoh perbuatan jujur di sekolah!", "Write one example of honesty at school!", ""),
      ]),
    mkModul("Tolong Menolong", "Helping Each Other", 2, 2,
      "# Tolong Menolong 🤝\n\nManusia tidak bisa hidup sendiri — kita saling membutuhkan.\n\nContoh tolong menolong: membantu teman yang jatuh, meminjamkan pensil, menjenguk teman sakit, dan bergotong royong membersihkan kelas.\n\nMenolong dilakukan dengan **ikhlas**, tanpa mengharap imbalan. Hati pun jadi senang!",
      "# Helping Each Other 🤝\n\nHumans can't live alone — we need each other.\n\nExamples: helping a friend who falls, lending a pencil, visiting a sick friend, and cleaning the classroom together.\n\nHelp **sincerely**, without expecting rewards. It makes your heart happy!",
      [
        pgSoal("Melihat teman jatuh, sebaiknya kita...", "If a friend falls, we should...", ["menolongnya", "menertawakan", "pergi", "memotret"], ["help them", "laugh", "walk away", "take photos"], 0),
        pgSoal("Menolong harus dilakukan dengan...", "We should help with...", ["ikhlas", "terpaksa", "imbalan", "marah"], ["sincerity", "reluctance", "rewards", "anger"], 0),
        pgSoal("Bekerja bersama membersihkan kelas disebut...", "Working together to clean is called...", ["gotong royong", "lomba", "piknik", "upacara"], ["mutual cooperation", "a race", "a picnic", "a ceremony"], 0),
        pgSoal("Teman lupa membawa pensil, kita...", "A friend forgot their pencil, we...", ["meminjamkan", "mengejek", "melapor", "menyembunyikan"], ["lend ours", "mock them", "report them", "hide it"], 0),
        pgSoal("Teman yang sakit sebaiknya kita...", "A sick friend should be...", ["dijenguk dan didoakan", "dijauhi", "diejek", "dilupakan"], ["visited and prayed for", "avoided", "mocked", "forgotten"], 0),
        esaiSoal("Apa nama kegiatan bekerja bersama-sama?", "What do we call working together?", "gotong royong"),
        esaiSoal("Ceritakan satu pengalamanmu menolong orang lain!", "Tell about a time you helped someone!", ""),
      ]),
    mkModul("Jujur & Amanah", "Honesty & Trust", 3, 3,
      "# Jujur & Amanah 💎\n\n**Jujur** artinya berkata dan berbuat sesuai kenyataan. **Amanah** artinya dapat dipercaya menjaga titipan atau tugas.\n\nContoh: mengembalikan barang temuan, mengakui kesalahan, dan menjalankan tugas piket dengan baik.\n\nOrang jujur dan amanah akan dipercaya serta disayangi banyak orang.",
      "# Honesty & Trust 💎\n\n**Honesty** means speaking and acting truthfully. **Trustworthiness** means being reliable with duties and belongings.\n\nExamples: returning found items, admitting mistakes, and doing class duty well.\n\nHonest, trustworthy people are trusted and loved by many.",
      [
        pgSoal("Menemukan dompet di jalan, sebaiknya...", "If you find a wallet, you should...", ["mengembalikan ke pemiliknya", "menyimpannya", "membuangnya", "membaginya"], ["return it to the owner", "keep it", "throw it away", "share it"], 0),
        pgSoal("Orang yang dapat dipercaya disebut...", "A reliable person is called...", ["amanah", "pembohong", "pemalas", "penakut"], ["trustworthy", "a liar", "lazy", "cowardly"], 0),
        pgSoal("Jika memecahkan gelas di rumah, kita...", "If we break a glass at home, we...", ["mengaku dengan jujur", "menyembunyikan", "menyalahkan kucing", "diam saja"], ["admit it honestly", "hide it", "blame the cat", "stay silent"], 0),
        pgSoal("Lawan dari jujur adalah...", "The opposite of honest is...", ["bohong", "rajin", "berani", "ramah"], ["dishonest", "diligent", "brave", "friendly"], 0),
        pgSoal("Tugas piket yang dijalankan baik menunjukkan sikap...", "Doing class duty well shows...", ["amanah", "sombong", "iri", "malas"], ["trustworthiness", "arrogance", "envy", "laziness"], 0),
        esaiSoal("Apa arti amanah?", "What does trustworthy mean?", "dapat dipercaya"),
        esaiSoal("Mengapa kita harus jujur? Jelaskan!", "Why must we be honest? Explain!", ""),
      ]),
  ],
  "Seni & Menggambar": [
    mkModul("Warna Dasar", "Basic Colors", 1, 1,
      "# Warna Dasar 🎨\n\n**Warna primer** adalah warna dasar: **merah, kuning, biru**. Warna lain lahir dari campurannya:\n\n- merah + kuning = **oranye** 🟠\n- kuning + biru = **hijau** 🟢\n- merah + biru = **ungu** 🟣\n\nAyo bereksperimen mencampur warna saat mewarnai!",
      "# Basic Colors 🎨\n\n**Primary colors** are **red, yellow, blue**. Other colors come from mixing them:\n\n- red + yellow = **orange** 🟠\n- yellow + blue = **green** 🟢\n- red + blue = **purple** 🟣\n\nExperiment with mixing colors when you paint!",
      [
        pgSoal("Yang termasuk warna primer adalah...", "Which is a primary color?", ["merah", "hijau", "oranye", "ungu"], ["red", "green", "orange", "purple"], 0),
        pgSoal("Kuning dicampur biru menjadi...", "Yellow mixed with blue makes...", ["hijau", "oranye", "ungu", "cokelat"], ["green", "orange", "purple", "brown"], 0),
        pgSoal("Merah dicampur kuning menjadi...", "Red mixed with yellow makes...", ["oranye", "hijau", "ungu", "abu-abu"], ["orange", "green", "purple", "gray"], 0),
        pgSoal("Merah dicampur biru menjadi...", "Red mixed with blue makes...", ["ungu", "hijau", "oranye", "putih"], ["purple", "green", "orange", "white"], 0),
        pgSoal("Jumlah warna primer adalah...", "How many primary colors are there?", ["3", "2", "5", "7"], ["3", "2", "5", "7"], 0),
        esaiSoal("Warna apa hasil campuran kuning dan biru?", "What color do yellow and blue make?", "hijau"),
        esaiSoal("Sebutkan tiga warna primer!", "Name the three primary colors!", ""),
      ]),
    mkModul("Menggambar Bentuk", "Drawing Shapes", 2, 2,
      "# Menggambar Bentuk ✏️\n\nSemua gambar dimulai dari bentuk dasar: **lingkaran ⭕, kotak ⬜, dan segitiga 🔺**.\n\nContoh: rumah = kotak + segitiga (atap). Matahari = lingkaran + garis-garis sinar. Pohon = segitiga di atas kotak kecil.\n\nDengan bentuk dasar, kamu bisa menggambar apa saja!",
      "# Drawing Shapes ✏️\n\nEvery drawing starts from basic shapes: **circle ⭕, square ⬜, and triangle 🔺**.\n\nExamples: house = square + triangle (roof). Sun = circle + ray lines. Tree = triangle on a small square.\n\nWith basic shapes you can draw anything!",
      [
        pgSoal("Atap rumah biasanya digambar dengan bentuk...", "A house roof is usually a...", ["segitiga", "lingkaran", "oval", "bintang"], ["triangle", "circle", "oval", "star"], 0),
        pgSoal("Matahari digambar dengan bentuk dasar...", "The sun is drawn from a...", ["lingkaran", "kotak", "segitiga", "garis"], ["circle", "square", "triangle", "line"], 0),
        pgSoal("Roda sepeda berbentuk...", "Bicycle wheels are...", ["lingkaran", "segitiga", "kotak", "trapesium"], ["circles", "triangles", "squares", "trapezoids"], 0),
        pgSoal("Bentuk yang punya 4 sisi sama adalah...", "The shape with 4 equal sides is a...", ["persegi", "segitiga", "lingkaran", "oval"], ["square", "triangle", "circle", "oval"], 0),
        pgSoal("Bentuk dasar untuk badan rumah adalah...", "The basic shape for a house body is a...", ["kotak", "lingkaran", "bintang", "hati"], ["square", "circle", "star", "heart"], 0),
        esaiSoal("Bentuk apa yang punya tiga sisi?", "Which shape has three sides?", "segitiga"),
        esaiSoal("Benda apa saja yang berbentuk lingkaran? Sebutkan dua!", "Name two circle-shaped objects!", ""),
      ]),
    mkModul("Kolase Kreatif", "Creative Collage", 3, 3,
      "# Kolase Kreatif ✂️\n\n**Kolase** adalah karya seni dari potongan bahan yang ditempel: kertas warna, daun kering, biji-bijian, atau kain perca.\n\nLangkahnya: buat sketsa gambar → siapkan bahan → gunting kecil-kecil → tempel dengan lem sedikit demi sedikit.\n\nKolase melatih kesabaran dan kreativitas. Hasilnya pasti unik!",
      "# Creative Collage ✂️\n\nA **collage** is art made from glued pieces: colored paper, dry leaves, seeds, or fabric scraps.\n\nSteps: sketch a picture → prepare materials → cut small pieces → glue them bit by bit.\n\nCollage builds patience and creativity. The result is always unique!",
      [
        pgSoal("Karya seni tempel dari potongan bahan disebut...", "Art made from glued pieces is a...", ["kolase", "patung", "lukisan cat", "origami"], ["collage", "sculpture", "painting", "origami"], 0),
        pgSoal("Langkah pertama membuat kolase adalah...", "The first step of a collage is...", ["membuat sketsa", "menempel", "menggunting", "menjemur"], ["sketching", "gluing", "cutting", "drying"], 0),
        pgSoal("Bahan alami untuk kolase contohnya...", "A natural collage material is...", ["daun kering", "plastik baru", "kaca", "besi"], ["dry leaves", "new plastic", "glass", "iron"], 0),
        pgSoal("Alat untuk menempel bahan kolase adalah...", "We attach collage pieces with...", ["lem", "paku", "jarum", "api"], ["glue", "nails", "needles", "fire"], 0),
        pgSoal("Membuat kolase melatih...", "Making collages trains...", ["kesabaran dan kreativitas", "kecepatan lari", "suara", "hafalan"], ["patience and creativity", "running speed", "voice", "memorization"], 0),
        esaiSoal("Apa alat untuk merekatkan potongan kolase?", "What do we use to stick collage pieces?", "lem"),
        esaiSoal("Sebutkan dua bahan yang bisa dipakai membuat kolase!", "Name two materials for a collage!", ""),
      ]),
  ],
  "PJOK": [
    mkModul("Gerak Dasar", "Basic Movements", 1, 1,
      "# Gerak Dasar 🏃\n\nTubuh kita bisa bergerak dengan banyak cara: **berjalan, berlari, melompat, dan melempar**.\n\nSebelum berolahraga, lakukan **pemanasan** dulu supaya otot tidak kaget dan tidak cedera.\n\nBergerak setiap hari membuat badan sehat dan kuat!",
      "# Basic Movements 🏃\n\nOur bodies move in many ways: **walking, running, jumping, and throwing**.\n\nBefore exercising, always **warm up** so muscles don't get injured.\n\nMoving every day keeps the body healthy and strong!",
      [
        pgSoal("Sebelum olahraga kita harus...", "Before exercise we must...", ["pemanasan", "tidur", "makan banyak", "duduk lama"], ["warm up", "sleep", "eat a lot", "sit long"], 0),
        pgSoal("Gerakan naik ke atas dengan dua kaki disebut...", "Pushing up off the ground with both feet is...", ["melompat", "merangkak", "berbaring", "berputar"], ["jumping", "crawling", "lying down", "spinning"], 0),
        pgSoal("Pemanasan berguna untuk mencegah...", "Warming up prevents...", ["cedera", "kemenangan", "keringat", "haus"], ["injury", "winning", "sweat", "thirst"], 0),
        pgSoal("Olahraga teratur membuat badan...", "Regular exercise makes the body...", ["sehat dan kuat", "lemas", "sakit", "mengantuk"], ["healthy and strong", "weak", "sick", "sleepy"], 0),
        pgSoal("Gerakan melempar menggunakan...", "Throwing uses our...", ["tangan", "kepala", "telinga", "hidung"], ["hands", "head", "ears", "nose"], 0),
        esaiSoal("Apa yang kita lakukan sebelum berolahraga?", "What do we do before exercising?", "pemanasan"),
        esaiSoal("Sebutkan dua gerak dasar yang kamu ketahui!", "Name two basic movements you know!", ""),
      ]),
    mkModul("Senam Irama", "Rhythmic Gymnastics", 2, 2,
      "# Senam Irama 🎵\n\n**Senam irama** adalah gerakan senam yang mengikuti musik. Gerakannya bisa memakai alat seperti pita atau simpai, bisa juga tanpa alat.\n\nHal penting dalam senam irama: **keluwesan gerak** dan **ketepatan irama** — gerakan harus pas dengan ketukan musik.\n\nSenam irama membuat tubuh lentur dan hati gembira!",
      "# Rhythmic Gymnastics 🎵\n\n**Rhythmic gymnastics** means moving to music, with tools like ribbons or hoops, or without any.\n\nKey points: **flexibility** and **rhythm accuracy** — movements must match the beat.\n\nIt makes the body flexible and the heart happy!",
      [
        pgSoal("Senam irama dilakukan mengikuti...", "Rhythmic gymnastics follows...", ["musik", "peluit saja", "diam", "aba-aba lawan"], ["music", "only whistles", "silence", "opponent's cue"], 0),
        pgSoal("Alat yang biasa dipakai senam irama adalah...", "A common rhythmic tool is a...", ["pita", "raket", "bola basket", "sepatu roda"], ["ribbon", "racket", "basketball", "roller skates"], 0),
        pgSoal("Hal penting dalam senam irama adalah...", "Important in rhythmic gymnastics is...", ["ketepatan irama", "kekuatan pukulan", "tinggi badan", "suara keras"], ["rhythm accuracy", "punch strength", "height", "loud voice"], 0),
        pgSoal("Senam irama membuat tubuh...", "Rhythmic gymnastics makes the body...", ["lentur", "kaku", "berat", "pendek"], ["flexible", "stiff", "heavy", "short"], 0),
        pgSoal("Gerakan senam harus pas dengan...", "Movements must match the...", ["ketukan musik", "warna baju", "cuaca", "jam"], ["music beat", "shirt color", "weather", "clock"], 0),
        esaiSoal("Sebutkan satu alat senam irama!", "Name one rhythmic gymnastics tool!", "pita"),
        esaiSoal("Mengapa senam irama menyehatkan? Jelaskan singkat!", "Why is rhythmic gymnastics healthy? Explain!", ""),
      ]),
    mkModul("Permainan Bola", "Ball Games", 3, 3,
      "# Permainan Bola ⚽\n\nBanyak permainan memakai bola: **sepak bola** (kaki), **basket** (tangan, memantulkan), dan **voli** (memukul melewati net).\n\nDalam bermain kita belajar **kerja sama tim** dan **sportivitas** — menang tidak sombong, kalah tidak marah.\n\nYang penting bergerak dan bergembira bersama teman!",
      "# Ball Games ⚽\n\nMany games use balls: **soccer** (feet), **basketball** (hands, dribbling), **volleyball** (hitting over a net).\n\nPlaying teaches **teamwork** and **sportsmanship** — win humbly, lose gracefully.\n\nWhat matters is moving and having fun with friends!",
      [
        pgSoal("Sepak bola dimainkan dengan...", "Soccer is played with the...", ["kaki", "tangan", "kepala saja", "raket"], ["feet", "hands", "head only", "a racket"], 0),
        pgSoal("Memantulkan bola ke lantai ada di permainan...", "Bouncing the ball is part of...", ["basket", "voli", "renang", "catur"], ["basketball", "volleyball", "swimming", "chess"], 0),
        pgSoal("Bola voli dipukul melewati...", "Volleyball is hit over a...", ["net", "gawang", "ring", "garis finish"], ["net", "goal", "hoop", "finish line"], 0),
        pgSoal("Kalah dalam permainan sebaiknya...", "When we lose, we should...", ["tetap tersenyum dan sportif", "marah", "menangis keras", "menyalahkan wasit"], ["smile and be sporting", "get angry", "cry loudly", "blame the referee"], 0),
        pgSoal("Bermain bola bersama melatih...", "Playing ball together trains...", ["kerja sama tim", "tidur", "menghitung", "menggambar"], ["teamwork", "sleeping", "counting", "drawing"], 0),
        esaiSoal("Permainan apa yang memakai gawang?", "Which game uses a goal?", "sepak bola"),
        esaiSoal("Apa arti sportif menurutmu?", "What does sportsmanship mean to you?", ""),
      ]),
  ],
  "Komputer Dasar": [
    mkModul("Mengenal Komputer", "Getting to Know Computers", 3, 1,
      "# Mengenal Komputer 💻\n\nBagian utama komputer:\n\n- **Monitor** — layar untuk melihat\n- **Keyboard** — papan tombol untuk mengetik\n- **Mouse** — penunjuk untuk mengklik\n- **CPU** — otak komputer\n\nKomputer membantu kita belajar, menggambar, dan mencari informasi. Gunakan dengan bijak ya!",
      "# Getting to Know Computers 💻\n\nMain computer parts:\n\n- **Monitor** — the screen\n- **Keyboard** — for typing\n- **Mouse** — for pointing and clicking\n- **CPU** — the computer's brain\n\nComputers help us learn, draw, and find information. Use them wisely!",
      [
        pgSoal("Layar komputer disebut...", "The computer screen is the...", ["monitor", "mouse", "keyboard", "speaker"], ["monitor", "mouse", "keyboard", "speaker"], 0),
        pgSoal("Untuk mengetik kita memakai...", "We type using the...", ["keyboard", "monitor", "kabel", "meja"], ["keyboard", "monitor", "cable", "desk"], 0),
        pgSoal("'Otak' komputer adalah...", "The computer's 'brain' is the...", ["CPU", "mouse", "layar", "printer"], ["CPU", "mouse", "screen", "printer"], 0),
        pgSoal("Alat untuk mengklik dan menunjuk adalah...", "The pointing and clicking tool is the...", ["mouse", "monitor", "kipas", "charger"], ["mouse", "monitor", "fan", "charger"], 0),
        pgSoal("Komputer sebaiknya dipakai untuk...", "Computers are best used for...", ["belajar dan berkarya", "bermain tanpa henti", "begadang", "membanting"], ["learning and creating", "endless games", "staying up late", "smashing"], 0),
        esaiSoal("Apa nama papan tombol untuk mengetik?", "What is the typing board called?", "keyboard"),
        esaiSoal("Sebutkan dua manfaat komputer untuk pelajar!", "Name two computer benefits for students!", ""),
      ]),
    mkModul("Belajar Mengetik", "Learning to Type", 4, 2,
      "# Belajar Mengetik ⌨️\n\nMengetik yang baik memakai **sepuluh jari**. Posisi awal jari di baris tengah keyboard: jari telunjuk kiri di huruf **F**, telunjuk kanan di huruf **J** (ada tonjolan kecilnya!).\n\nDuduk tegak, mata ke layar, dan jangan menunduk terus ke keyboard.\n\nLatihan sedikit setiap hari membuat mengetikmu makin cepat!",
      "# Learning to Type ⌨️\n\nGood typing uses **ten fingers**. Home position: left index on **F**, right index on **J** (feel the little bumps!).\n\nSit upright, eyes on the screen, don't keep looking down.\n\nA little practice daily makes your typing faster!",
      [
        pgSoal("Mengetik yang baik memakai berapa jari?", "Good typing uses how many fingers?", ["10", "2", "5", "1"], ["10", "2", "5", "1"], 0),
        pgSoal("Telunjuk kanan diletakkan di huruf...", "The right index finger rests on...", ["J", "A", "Z", "P"], ["J", "A", "Z", "P"], 0),
        pgSoal("Telunjuk kiri diletakkan di huruf...", "The left index finger rests on...", ["F", "Q", "M", "L"], ["F", "Q", "M", "L"], 0),
        pgSoal("Saat mengetik, badan sebaiknya...", "While typing, we should sit...", ["tegak", "membungkuk", "berbaring", "berdiri satu kaki"], ["upright", "hunched", "lying down", "on one foot"], 0),
        pgSoal("Tombol spasi berguna untuk...", "The space bar is for...", ["memberi jarak antar kata", "menghapus semua", "mematikan komputer", "menambah suara"], ["spacing between words", "deleting all", "turning off", "raising volume"], 0),
        esaiSoal("Di huruf apa telunjuk kanan diletakkan?", "On which letter does the right index rest?", "j"),
        esaiSoal("Mengapa posisi duduk penting saat mengetik?", "Why is sitting posture important when typing?", ""),
      ]),
    mkModul("Internet Aman", "Safe Internet", 5, 3,
      "# Internet Aman 🛡️\n\nInternet berguna, tapi kita harus hati-hati:\n\n- **Jangan** memberi tahu nama lengkap, alamat, atau nomor telepon kepada orang tak dikenal\n- **Jangan** membuka tautan aneh atau iklan mencurigakan\n- **Ceritakan** ke orang tua/guru jika ada yang membuatmu tidak nyaman\n\nJadilah anak cerdas di dunia nyata dan dunia maya!",
      "# Safe Internet 🛡️\n\nThe internet is useful, but be careful:\n\n- **Never** share your full name, address, or phone number with strangers\n- **Don't** open strange links or suspicious ads\n- **Tell** parents/teachers if something makes you uncomfortable\n\nBe smart both offline and online!",
      [
        pgSoal("Data pribadi yang TIDAK boleh disebar adalah...", "Personal data we must NOT share is...", ["alamat rumah", "warna favorit", "pelajaran favorit", "hewan kesukaan"], ["home address", "favorite color", "favorite subject", "favorite animal"], 0),
        pgSoal("Menerima pesan aneh dari orang tak dikenal, kita...", "Getting strange messages from a stranger, we...", ["memberi tahu orang tua", "membalas terus", "memberi alamat", "mengirim foto"], ["tell our parents", "keep replying", "give our address", "send photos"], 0),
        pgSoal("Tautan/iklan mencurigakan sebaiknya...", "Suspicious links/ads should be...", ["tidak dibuka", "dibuka cepat", "disebar ke teman", "disimpan"], ["not opened", "opened quickly", "shared", "saved"], 0),
        pgSoal("Waktu memakai gadget sebaiknya...", "Screen time should be...", ["dibatasi", "sepanjang hari", "saat makan", "saat tidur"], ["limited", "all day", "during meals", "during sleep"], 0),
        pgSoal("Internet paling baik dipakai untuk...", "The internet is best used for...", ["belajar hal bermanfaat", "mengejek orang", "begadang", "menyebar rahasia"], ["learning useful things", "mocking people", "staying up", "spreading secrets"], 0),
        esaiSoal("Kepada siapa kita bercerita jika ada hal aneh di internet?", "Who do we tell about strange things online?", "orang tua"),
        esaiSoal("Tulis satu aturan internet aman yang kamu ingat!", "Write one internet safety rule you remember!", ""),
      ]),
  ],
  "Bahasa Daerah": [
    mkModul("Salam & Sapaan Daerah", "Local Greetings", 1, 1,
      "# Salam & Sapaan Daerah 🙏\n\nIndonesia kaya bahasa daerah! Contoh sapaan Jawa:\n\n- **Sugeng enjing** = selamat pagi\n- **Sugeng siang** = selamat siang\n- **Matur nuwun** = terima kasih\n- **Nyuwun sewu** = permisi/maaf\n\nMenggunakan bahasa daerah adalah cara melestarikan budaya kita!",
      "# Local Greetings 🙏\n\nIndonesia is rich in local languages! Javanese greetings:\n\n- **Sugeng enjing** = good morning\n- **Sugeng siang** = good afternoon\n- **Matur nuwun** = thank you\n- **Nyuwun sewu** = excuse me/sorry\n\nUsing local language preserves our culture!",
      [
        pgSoal("'Sugeng enjing' artinya...", "'Sugeng enjing' means...", ["selamat pagi", "selamat malam", "terima kasih", "sampai jumpa"], ["good morning", "good night", "thank you", "goodbye"], 0),
        pgSoal("'Matur nuwun' artinya...", "'Matur nuwun' means...", ["terima kasih", "permisi", "selamat datang", "apa kabar"], ["thank you", "excuse me", "welcome", "how are you"], 0),
        pgSoal("Untuk meminta maaf dalam bahasa Jawa...", "To say sorry in Javanese...", ["nyuwun sewu", "sugeng dalu", "matur nuwun", "sugeng rawuh"], ["nyuwun sewu", "sugeng dalu", "matur nuwun", "sugeng rawuh"], 0),
        pgSoal("Bahasa daerah harus kita...", "Local languages should be...", ["lestarikan", "lupakan", "ejek", "tinggalkan"], ["preserved", "forgotten", "mocked", "abandoned"], 0),
        pgSoal("'Selamat siang' dalam bahasa Jawa adalah...", "'Good afternoon' in Javanese is...", ["sugeng siang", "sugeng enjing", "matur nuwun", "nyuwun sewu"], ["sugeng siang", "sugeng enjing", "matur nuwun", "nyuwun sewu"], 0),
        esaiSoal("Apa arti 'matur nuwun'?", "What does 'matur nuwun' mean?", "terima kasih"),
        esaiSoal("Tulis satu sapaan bahasa daerahmu dan artinya!", "Write one local greeting and its meaning!", ""),
      ]),
    mkModul("Angka dalam Bahasa Jawa", "Javanese Numbers", 2, 2,
      "# Angka Bahasa Jawa 🔢\n\nAyo hitung dalam bahasa Jawa:\n\n- 1 = **siji**\n- 2 = **loro**\n- 3 = **telu**\n- 4 = **papat**\n- 5 = **lima**\n- 6 = **enem**\n- 7 = **pitu**\n\nCoba hitung mainanmu di rumah pakai bahasa Jawa!",
      "# Javanese Numbers 🔢\n\nLet's count in Javanese:\n\n- 1 = **siji**\n- 2 = **loro**\n- 3 = **telu**\n- 4 = **papat**\n- 5 = **lima**\n- 6 = **enem**\n- 7 = **pitu**\n\nTry counting your toys in Javanese!",
      [
        pgSoal("'Telu' artinya angka...", "'Telu' means the number...", ["3", "1", "5", "7"], ["3", "1", "5", "7"], 0),
        pgSoal("Angka 1 dalam bahasa Jawa adalah...", "Number 1 in Javanese is...", ["siji", "loro", "lima", "pitu"], ["siji", "loro", "lima", "pitu"], 0),
        pgSoal("'Papat' artinya...", "'Papat' means...", ["4", "2", "6", "8"], ["4", "2", "6", "8"], 0),
        pgSoal("Angka 7 dalam bahasa Jawa adalah...", "Number 7 in Javanese is...", ["pitu", "enem", "telu", "siji"], ["pitu", "enem", "telu", "siji"], 0),
        pgSoal("'Loro' artinya angka...", "'Loro' means the number...", ["2", "3", "4", "5"], ["2", "3", "4", "5"], 0),
        esaiSoal("Tulis bahasa Jawa dari angka 5!", "Write number 5 in Javanese!", "lima"),
        esaiSoal("Tulis angka 1 sampai 3 dalam bahasa Jawa!", "Write numbers 1 to 3 in Javanese!", ""),
      ]),
    mkModul("Cerita Rakyat Nusantara", "Indonesian Folktales", 4, 3,
      "# Cerita Rakyat Nusantara 📚\n\n**Cerita rakyat** adalah cerita turun-temurun dari daerah. Contohnya:\n\n- **Malin Kundang** (Sumatra Barat) — anak durhaka yang dikutuk jadi batu\n- **Timun Mas** (Jawa Tengah) — gadis pemberani melawan raksasa\n- **Sangkuriang** (Jawa Barat) — asal-usul Gunung Tangkuban Perahu\n\nSetiap cerita punya pesan moral untuk kita teladani.",
      "# Indonesian Folktales 📚\n\n**Folktales** are stories passed down through generations:\n\n- **Malin Kundang** (West Sumatra) — an ungrateful son turned to stone\n- **Timun Mas** (Central Java) — a brave girl versus a giant\n- **Sangkuriang** (West Java) — the origin of Mount Tangkuban Perahu\n\nEvery folktale has a moral lesson for us.",
      [
        pgSoal("Malin Kundang dikutuk menjadi...", "Malin Kundang was cursed into...", ["batu", "pohon", "burung", "sungai"], ["stone", "a tree", "a bird", "a river"], 0),
        pgSoal("Cerita Malin Kundang berasal dari...", "Malin Kundang comes from...", ["Sumatra Barat", "Papua", "Bali", "Kalimantan"], ["West Sumatra", "Papua", "Bali", "Kalimantan"], 0),
        pgSoal("Timun Mas melawan...", "Timun Mas fought a...", ["raksasa", "naga", "harimau", "penyihir laut"], ["giant", "dragon", "tiger", "sea witch"], 0),
        pgSoal("Sangkuriang berkaitan dengan gunung...", "Sangkuriang relates to Mount...", ["Tangkuban Perahu", "Merapi", "Bromo", "Rinjani"], ["Tangkuban Perahu", "Merapi", "Bromo", "Rinjani"], 0),
        pgSoal("Pesan cerita Malin Kundang adalah...", "The moral of Malin Kundang is...", ["hormati orang tua", "kumpulkan harta", "jangan berlayar", "takut laut"], ["respect your parents", "hoard wealth", "never sail", "fear the sea"], 0),
        esaiSoal("Menjadi apa Malin Kundang di akhir cerita?", "What did Malin Kundang become?", "batu"),
        esaiSoal("Cerita rakyat apa yang paling kamu suka? Mengapa?", "Which folktale do you like most? Why?", ""),
      ]),
  ],
};

// ---------- KONTEN 11 GAME (≥10 item per game) ----------
const GAME_CONTENT = {
  tebak_huruf: { huruf: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u"] },
  susun_suku_kata: { kata: [
    { kata: "baju", suku: ["ba", "ju"], emoji: "👕" }, { kata: "buku", suku: ["bu", "ku"], emoji: "📚" },
    { kata: "meja", suku: ["me", "ja"], emoji: "🪑" }, { kata: "sapi", suku: ["sa", "pi"], emoji: "🐮" },
    { kata: "bola", suku: ["bo", "la"], emoji: "⚽" }, { kata: "topi", suku: ["to", "pi"], emoji: "🧢" },
    { kata: "sepatu", suku: ["se", "pa", "tu"], emoji: "👟" }, { kata: "kereta", suku: ["ke", "re", "ta"], emoji: "🚂" },
    { kata: "kelinci", suku: ["ke", "lin", "ci"], emoji: "🐰" }, { kata: "pelangi", suku: ["pe", "la", "ngi"], emoji: "🌈" },
  ] },
  cocokkan: { pasangan: [
    { emoji: "🍌", kata_id: "pisang", kata_en: "banana" }, { emoji: "🐘", kata_id: "gajah", kata_en: "elephant" },
    { emoji: "🌙", kata_id: "bulan", kata_en: "moon" }, { emoji: "🚗", kata_id: "mobil", kata_en: "car" },
    { emoji: "🌈", kata_id: "pelangi", kata_en: "rainbow" }, { emoji: "🦋", kata_id: "kupu-kupu", kata_en: "butterfly" },
    { emoji: "🏠", kata_id: "rumah", kata_en: "house" }, { emoji: "☂️", kata_id: "payung", kata_en: "umbrella" },
    { emoji: "🐟", kata_id: "ikan", kata_en: "fish" }, { emoji: "🌻", kata_id: "bunga matahari", kata_en: "sunflower" },
  ] },
  hitung_benda: { max: 12, emoji: ["🍎", "🐤", "⭐", "🎈", "🐠", "🍭", "🦆", "🌸", "🚙", "🍪", "⚽", "🧸"] },
  memory: { pasangan: [
    ["🐱", "🐱"], ["🐶", "🐶"], ["🐰", "🐰"], ["🦊", "🦊"], ["🐼", "🐼"],
    ["🐸", "🐸"], ["🦁", "🦁"], ["🐷", "🐷"], ["🐔", "🐔"], ["🦉", "🦉"],
  ] },
  baca_ucapkan: { items: [
    { teks_id: "Budi suka membaca buku", teks_en: "Budi likes to read books" },
    { teks_id: "Kucing itu tidur di atas meja", teks_en: "The cat sleeps on the table" },
    { teks_id: "Aku makan nasi goreng setiap pagi", teks_en: "I eat fried rice every morning" },
    { teks_id: "Bunga mawar berwarna merah", teks_en: "The rose is red" },
    { teks_id: "Ibu memasak sayur di dapur", teks_en: "Mother cooks vegetables in the kitchen" },
    { teks_id: "Adik bermain bola di halaman", teks_en: "My little brother plays ball in the yard" },
    { teks_id: "Matahari terbit di sebelah timur", teks_en: "The sun rises in the east" },
    { teks_id: "Kami belajar bersama di sekolah", teks_en: "We study together at school" },
    { teks_id: "Ayah menanam pohon mangga", teks_en: "Father plants a mango tree" },
    { teks_id: "Burung kecil bernyanyi di pagi hari", teks_en: "A little bird sings in the morning" },
  ] },
  tebak_kata_gambar: { items: [
    { emoji: "🍎", jawaban_id: "apel", jawaban_en: "apple" }, { emoji: "🐱", jawaban_id: "kucing", jawaban_en: "cat" },
    { emoji: "🏠", jawaban_id: "rumah", jawaban_en: "house" }, { emoji: "⚽", jawaban_id: "bola", jawaban_en: "ball" },
    { emoji: "🌙", jawaban_id: "bulan", jawaban_en: "moon" }, { emoji: "🐟", jawaban_id: "ikan", jawaban_en: "fish" },
    { emoji: "📚", jawaban_id: "buku", jawaban_en: "book" }, { emoji: "🌸", jawaban_id: "bunga", jawaban_en: "flower" },
    { emoji: "🚗", jawaban_id: "mobil", jawaban_en: "car" }, { emoji: "🐘", jawaban_id: "gajah", jawaban_en: "elephant" },
  ] },
  urutkan_angka: { jumlah: 5, min: 1, max: 30, arah: "campur", ronde: 10 },
  kuis_kilat: { waktu_per_soal: 10, items: [
    { soal_id: "3 + 4 = ?", soal_en: "3 + 4 = ?", opsi_id: ["6", "7", "8", "9"], opsi_en: ["6", "7", "8", "9"], benar: 1 },
    { soal_id: "10 - 6 = ?", soal_en: "10 - 6 = ?", opsi_id: ["2", "3", "4", "5"], opsi_en: ["2", "3", "4", "5"], benar: 2 },
    { soal_id: "5 × 2 = ?", soal_en: "5 × 2 = ?", opsi_id: ["10", "7", "12", "8"], opsi_en: ["10", "7", "12", "8"], benar: 0 },
    { soal_id: "Mana hewan?", soal_en: "Which is an animal?", opsi_id: ["🍎", "🐘", "🏠", "⚽"], opsi_en: ["🍎", "🐘", "🏠", "⚽"], benar: 1 },
    { soal_id: "Huruf pertama 'Ikan'?", soal_en: "First letter of 'Ikan'?", opsi_id: ["I", "K", "A", "N"], opsi_en: ["I", "K", "A", "N"], benar: 0 },
    { soal_id: "12 ÷ 3 = ?", soal_en: "12 ÷ 3 = ?", opsi_id: ["3", "4", "5", "6"], opsi_en: ["3", "4", "5", "6"], benar: 1 },
    { soal_id: "Warna langit cerah?", soal_en: "Color of a clear sky?", opsi_id: ["biru", "merah", "hitam", "ungu"], opsi_en: ["blue", "red", "black", "purple"], benar: 0 },
    { soal_id: "8 + 7 = ?", soal_en: "8 + 7 = ?", opsi_id: ["14", "15", "16", "13"], opsi_en: ["14", "15", "16", "13"], benar: 1 },
    { soal_id: "Banyak kaki ayam?", soal_en: "How many legs does a chicken have?", opsi_id: ["2", "4", "6", "8"], opsi_en: ["2", "4", "6", "8"], benar: 0 },
    { soal_id: "20 - 9 = ?", soal_en: "20 - 9 = ?", opsi_id: ["10", "11", "12", "9"], opsi_en: ["10", "11", "12", "9"], benar: 1 },
  ] },
  lengkapi_kalimat: { items: [
    { kalimat_id: "Adik ___ susu setiap pagi", kalimat_en: "My sibling ___ milk every morning", jawaban_id: "minum", jawaban_en: "drinks", pilihan_id: ["minum", "makan", "lari"], pilihan_en: ["drinks", "eats", "runs"] },
    { kalimat_id: "Matahari terbit di sebelah ___", kalimat_en: "The sun rises in the ___", jawaban_id: "timur", jawaban_en: "east", pilihan_id: ["timur", "barat", "atas"], pilihan_en: ["east", "west", "top"] },
    { kalimat_id: "Ibu memasak di ___", kalimat_en: "Mother cooks in the ___", jawaban_id: "dapur", jawaban_en: "kitchen", pilihan_id: ["dapur", "kamar", "halaman"], pilihan_en: ["kitchen", "bedroom", "yard"] },
    { kalimat_id: "Ikan hidup di dalam ___", kalimat_en: "Fish live in the ___", jawaban_id: "air", jawaban_en: "water", pilihan_id: ["air", "tanah", "udara"], pilihan_en: ["water", "soil", "sky"] },
    { kalimat_id: "Kita membaca buku di ___", kalimat_en: "We read books in the ___", jawaban_id: "perpustakaan", jawaban_en: "library", pilihan_id: ["perpustakaan", "kolam", "dapur"], pilihan_en: ["library", "pool", "kitchen"] },
    { kalimat_id: "Burung terbang di ___", kalimat_en: "Birds fly in the ___", jawaban_id: "udara", jawaban_en: "sky", pilihan_id: ["udara", "laut", "tanah"], pilihan_en: ["sky", "sea", "ground"] },
    { kalimat_id: "Sebelum makan kita cuci ___", kalimat_en: "Before eating we wash our ___", jawaban_id: "tangan", jawaban_en: "hands", pilihan_id: ["tangan", "sepatu", "tas"], pilihan_en: ["hands", "shoes", "bag"] },
    { kalimat_id: "Pada malam hari kita ___", kalimat_en: "At night we ___", jawaban_id: "tidur", jawaban_en: "sleep", pilihan_id: ["tidur", "berenang", "sekolah"], pilihan_en: ["sleep", "swim", "study at school"] },
    { kalimat_id: "Petani menanam padi di ___", kalimat_en: "Farmers plant rice in the ___", jawaban_id: "sawah", jawaban_en: "field", pilihan_id: ["sawah", "kamar", "jalan"], pilihan_en: ["field", "bedroom", "road"] },
    { kalimat_id: "Gigi disikat memakai ___", kalimat_en: "We brush teeth with a ___", jawaban_id: "sikat gigi", jawaban_en: "toothbrush", pilihan_id: ["sikat gigi", "sendok", "penggaris"], pilihan_en: ["toothbrush", "spoon", "ruler"] },
  ] },
  tebak_bunyi: { items: ["ba", "bu", "bi", "ma", "mi", "mu", "ka", "ku", "ki", "sa", "si", "su", "ta", "tu", "ti"] },
};

// ---------- 10 BADGE ----------
const BADGES = [
  { kode: "first_module", nama_id: "Langkah Pertama", nama_en: "First Step", ikon: "👣", d_id: "Selesaikan modul pertamamu", d_en: "Finish your first module", xp: 0 },
  { kode: "star_collector", nama_id: "Kolektor Bintang", nama_en: "Star Collector", ikon: "⭐", d_id: "Dapat 3 bintang di satu modul", d_en: "Get 3 stars in a module", xp: 0 },
  { kode: "streak_3", nama_id: "Api Semangat", nama_en: "On Fire", ikon: "🔥", d_id: "Belajar 3 hari beruntun", d_en: "Learn 3 days in a row", xp: 0 },
  { kode: "streak_7", nama_id: "Seminggu Penuh", nama_en: "Full Week", ikon: "🗓️", d_id: "Belajar 7 hari beruntun", d_en: "Learn 7 days in a row", xp: 0 },
  { kode: "level_5", nama_id: "Bintang Kelas", nama_en: "Class Star", ikon: "🌟", d_id: "Capai level 5", d_en: "Reach level 5", xp: 500 },
  { kode: "level_10", nama_id: "Juara Sejati", nama_en: "True Champion", ikon: "🏆", d_id: "Capai level 10", d_en: "Reach level 10", xp: 2250 },
  { kode: "game_master", nama_id: "Jagoan Game", nama_en: "Game Master", ikon: "🎮", d_id: "Mainkan semua game", d_en: "Play all the games", xp: 0 },
  { kode: "modul_10", nama_id: "Penjelajah Ilmu", nama_en: "Knowledge Explorer", ikon: "🧭", d_id: "Selesaikan 10 modul", d_en: "Finish 10 modules", xp: 0 },
  { kode: "skor_100", nama_id: "Nilai Sempurna", nama_en: "Perfect Score", ikon: "💯", d_id: "Dapat nilai 100 di satu modul", d_en: "Score 100 in a module", xp: 0 },
  { kode: "tiga_mapel", nama_id: "Serba Bisa", nama_en: "All-Rounder", ikon: "�require", d_id: "Belajar di 3 mapel berbeda", d_en: "Learn in 3 different subjects", xp: 0 },
];

// ---------- 10 SISWA AKTIF + 3 ALUMNI ARSIP ----------
const STUDENTS = [
  { nama: "Aisyah", kelas: 1, avatar: "🐰", xp: 180, streak: 4 },
  { nama: "Budi", kelas: 1, avatar: "🐱", xp: 120, streak: 2 },   // sudah ada dari seed awal
  { nama: "Citra", kelas: 2, avatar: "🦄", xp: 640, streak: 7 },
  { nama: "Dimas", kelas: 2, avatar: "🐸", xp: 90, streak: 1 },
  { nama: "Eka", kelas: 3, avatar: "🐼", xp: 1150, streak: 12 },
  { nama: "Fajar", kelas: 3, avatar: "🦊", xp: 420, streak: 3 },
  { nama: "Gita", kelas: 4, avatar: "🐨", xp: 2300, streak: 20 },
  { nama: "Hasan", kelas: 5, avatar: "🦁", xp: 60, streak: 0 },
  { nama: "Intan", kelas: 5, avatar: "🦉", xp: 1680, streak: 9 },
  { nama: "Joko", kelas: 6, avatar: "🐢", xp: 890, streak: 5 },
];
const ALUMNI = [
  { nama: "Rudi", kelas: 6, avatar: "🐧", xp: 2100 },
  { nama: "Wati", kelas: 6, avatar: "🐙", xp: 1750 },
  { nama: "Yusuf", kelas: 6, avatar: "🐦", xp: 950 },
];
const PASSWORD_SISWA = "belajar123";

// ============================================================
async function createUser(email, password, meta) {
  const { rows: ex } = await db.query("select id from auth.users where email=$1", [email]);
  if (ex[0]) return { id: ex[0].id, baru: false };
  const { rows } = await db.query(
    `insert into auth.users
       (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
        $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', $3::jsonb, now(), now(), '', '', '', '', '')
     returning id`,
    [email, password, JSON.stringify(meta)]
  );
  const uid = rows[0].id;
  await db.query(
    `insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values (gen_random_uuid(), $1::uuid, $1::uuid,
       jsonb_build_object('sub', $1, 'email', $2::text, 'email_verified', true), 'email', now(), now(), now())`,
    [String(uid), email]
  );
  return { id: uid, baru: true };
}

async function main() {
  await db.connect();

  // 1) mapel
  console.log("1) Mata pelajaran (10)...");
  const subjectId = {};
  for (const s of SUBJECTS) {
    const { rows } = await db.query("select id from public.subjects where nama_id=$1", [s.nama_id]);
    if (rows[0]) subjectId[s.nama_id] = rows[0].id;
    else {
      const ins = await db.query(
        "insert into public.subjects (nama_id,nama_en,ikon,warna,urutan) values ($1,$2,$3,$4,$5) returning id",
        [s.nama_id, s.nama_en, s.ikon, s.warna, s.urutan]
      );
      subjectId[s.nama_id] = ins.rows[0].id;
      console.log(`   + ${s.ikon} ${s.nama_id}`);
    }
  }

  // 2) modul + soal
  console.log("2) Modul & soal...");
  let modBaru = 0;
  for (const [mapel, mods] of Object.entries(MODULES)) {
    for (const m of mods) {
      const { rows } = await db.query(
        "select id from public.modules where subject_id=$1 and judul_id=$2",
        [subjectId[mapel], m.judul_id]
      );
      if (rows[0]) continue;
      const ins = await db.query(
        `insert into public.modules (subject_id,tingkat_kelas,judul_id,judul_en,materi_id,materi_en,urutan,status)
         values ($1,$2,$3,$4,$5,$6,$7,'published') returning id`,
        [subjectId[mapel], m.tingkat_kelas, m.judul_id, m.judul_en, m.materi_id, m.materi_en, m.urutan]
      );
      const mid = ins.rows[0].id;
      for (const [i, q] of m.soal.entries()) {
        await db.query(
          `insert into public.questions (module_id,tipe,pertanyaan_id,pertanyaan_en,opsi,jawaban_benar,poin,urutan)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [mid, q.tipe, q.pertanyaan_id, q.pertanyaan_en, q.opsi ? JSON.stringify(q.opsi) : null, q.jawaban_benar, q.poin, i + 1]
        );
      }
      modBaru++;
    }
  }
  console.log(`   + ${modBaru} modul baru (masing-masing 5 PG + 2 esai = bobot 100)`);

  // 3) konten 11 game global
  console.log("3) Konten 11 game (≥10 item)...");
  for (const [tipe, config] of Object.entries(GAME_CONTENT)) {
    const { rowCount } = await db.query(
      "update public.games set config=$1 where module_id is null and tipe_game=$2",
      [JSON.stringify(config), tipe]
    );
    if (rowCount === 0)
      await db.query("insert into public.games (module_id,tipe_game,config) values (null,$1,$2)", [tipe, JSON.stringify(config)]);
  }
  console.log("   ✓ 11 game diperbarui");

  // 4) badge (10)
  console.log("4) Badge (10)...");
  for (const b of BADGES) {
    await db.query(
      `insert into public.badges (kode,nama_id,nama_en,ikon,deskripsi_id,deskripsi_en,xp_syarat)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (kode) do update set nama_id=excluded.nama_id, nama_en=excluded.nama_en, ikon=excluded.ikon`,
      [b.kode, b.nama_id, b.nama_en, b.ikon === "�require" ? "🎒" : b.ikon, b.d_id, b.d_en, b.xp]
    );
  }

  // 5) tahun ajaran: aktif 2026/2027 + arsip 2025/2026
  console.log("5) Tahun ajaran...");
  await db.query("insert into public.tahun_ajaran (nama) values ('2026/2027') on conflict (nama) do nothing");
  await db.query(
    `insert into public.tahun_ajaran (nama, status, diarsipkan_pada)
     values ('2025/2026','diarsipkan', now() - interval '30 days')
     on conflict (nama) do nothing`
  );
  const { rows: taRows } = await db.query("select id, nama, status from public.tahun_ajaran");
  const taAktif = taRows.find((t) => t.status === "aktif")?.id;
  const taArsip = taRows.find((t) => t.nama === "2025/2026")?.id;

  // 6) siswa aktif (10) + alumni arsip (3) + 1 admin
  console.log("6) Akun (1 admin + 10 siswa + 3 alumni arsip)...");
  await createUser("admin@belajarceria.id", "admin123", { role: "admin", nama: "Bu Guru Admin", avatar: "🦉" });
  const studentIds = {};
  for (const s of STUDENTS) {
    const uname = s.nama.toLowerCase();
    const { id, baru } = await createUser(`${uname}@siswa.belajarceria.id`, PASSWORD_SISWA, {
      role: "student", nama: s.nama, kelas: String(s.kelas), avatar: s.avatar,
    });
    studentIds[s.nama] = id;
    await db.query(
      `update public.profiles set xp=$1, streak=$2, avatar=$3, kelas=$4, aktif=true, tahun_ajaran_id=$5,
        last_active = (now() - make_interval(days => $6))::date where id=$7::uuid`,
      [s.xp, s.streak, s.avatar, s.kelas, taAktif, rint(0, 2), id]
    );
    if (baru) console.log(`   + siswa ${s.nama} (kelas ${s.kelas})`);
  }
  for (const a of ALUMNI) {
    const { id, baru } = await createUser(`${a.nama.toLowerCase()}@siswa.belajarceria.id`, PASSWORD_SISWA, {
      role: "student", nama: a.nama, kelas: String(a.kelas), avatar: a.avatar,
    });
    studentIds[a.nama] = id;
    await db.query(
      "update public.profiles set xp=$1, aktif=false, tahun_ajaran_id=$2, kelas=$3 where id=$4::uuid",
      [a.xp, taArsip, a.kelas, id]
    );
    if (baru) console.log(`   + alumni ${a.nama} (arsip 2025/2026)`);
  }

  // 7) progress realistis
  console.log("7) Progress belajar realistis...");
  const { rows: allMods } = await db.query(
    "select id, tingkat_kelas, subject_id from public.modules where status='published'"
  );
  const { rows: allQs } = await db.query("select id, module_id, tipe, poin, jawaban_benar from public.questions");
  const totalPoinOf = (mid) => allQs.filter((q) => q.module_id === mid).reduce((s, q) => s + q.poin, 0) || 1;

  async function seedProgress(nama, tahunId, kemampuan) {
    const sid = studentIds[nama];
    const { rows: ex } = await db.query("select 1 from public.student_progress where student_id=$1::uuid limit 1", [sid]);
    if (ex[0]) return 0; // sudah punya progress → jangan duplikasi
    const kelasSiswa = [...STUDENTS, ...ALUMNI].find((x) => x.nama === nama)?.kelas ?? 1;
    const cocok = shuffle(allMods.filter((m) => m.tingkat_kelas <= kelasSiswa));
    const ambil = cocok.slice(0, rint(3, Math.min(9, cocok.length)));
    for (const m of ambil) {
      const skor = Math.min(100, Math.max(30, Math.round(kemampuan + (rnd() * 30 - 15))));
      const bintang = skor >= 90 ? 3 : skor >= 70 ? 2 : skor >= 40 ? 1 : 0;
      await db.query(
        `insert into public.student_progress
           (student_id,module_id,status,skor,bintang,poin_pg,jawaban,selesai_pada,tahun_ajaran_id,updated_at)
         values ($1::uuid,$2,'selesai',$3,$4,$5,'[]', now() - make_interval(days => $6), $7, now())
         on conflict (student_id,module_id) do nothing`,
        [sid, m.id, skor, bintang, Math.round((skor / 100) * totalPoinOf(m.id) * 0.7), rint(0, 20), tahunId]
      );
    }
    return ambil.length;
  }

  let progressBaru = 0;
  const kemampuanMap = { Aisyah: 70, Budi: 60, Citra: 82, Dimas: 50, Eka: 88, Fajar: 68, Gita: 95, Hasan: 45, Intan: 90, Joko: 75 };
  for (const s of STUDENTS) progressBaru += await seedProgress(s.nama, taAktif, kemampuanMap[s.nama] ?? 65);
  for (const a of ALUMNI) progressBaru += await seedProgress(a.nama, taArsip, 80);
  console.log(`   + ${progressBaru} baris progress`);

  // 8) esai: sebagian menunggu review, sebagian sudah dinilai
  console.log("8) Antrian review esai...");
  const { rows: esaiCount } = await db.query("select count(*)::int as n from public.essay_submissions");
  if (esaiCount[0].n < 4) {
    const contohJawab = ["bola", "empat", "hijau", "gotong royong", "buaya", "kelas dibersihkan bersama"];
    const targets = [
      { nama: "Aisyah", status: "menunggu_review" }, { nama: "Dimas", status: "menunggu_review" },
      { nama: "Citra", status: "menunggu_review" },
      { nama: "Eka", status: "sudah_dinilai", poin: 15, komentar: "Jawaban lengkap, hebat! 🌟" },
      { nama: "Gita", status: "sudah_dinilai", poin: 12, komentar: "Bagus, sedikit lagi sempurna!" },
      { nama: "Intan", status: "sudah_dinilai", poin: 15, komentar: "Sempurna! 💯" },
    ];
    let ke = 0;
    for (const tgt of targets) {
      const sid = studentIds[tgt.nama];
      const { rows: prog } = await db.query(
        "select module_id from public.student_progress where student_id=$1::uuid limit 5", [sid]);
      for (const p of prog) {
        const q = allQs.find((x) => x.module_id === p.module_id && x.tipe === "esai");
        if (!q) continue;
        await db.query(
          `insert into public.essay_submissions
             (student_id,module_id,question_id,jawaban,status_review,poin_diberikan,komentar_admin,direview_pada)
           values ($1::uuid,$2,$3,$4,$5,$6,$7,$8)
           on conflict (student_id,question_id) do nothing`,
          [sid, p.module_id, q.id, contohJawab[ke++ % contohJawab.length], tgt.status,
           tgt.poin ?? null, tgt.komentar ?? null, tgt.status === "sudah_dinilai" ? new Date() : null]
        );
        break;
      }
    }
    console.log("   + 3 menunggu review, 3 sudah dinilai");
  } else console.log("   = sudah ada, lewati");

  // 9) badge kepemilikan
  console.log("9) Badge siswa...");
  const { rows: badgeRows } = await db.query("select id, kode from public.badges");
  const bid = (k) => badgeRows.find((b) => b.kode === k)?.id;
  const award = { Gita: ["first_module", "star_collector", "streak_3", "streak_7", "level_5", "level_10", "modul_10"],
    Eka: ["first_module", "star_collector", "streak_3", "streak_7", "level_5"],
    Intan: ["first_module", "star_collector", "streak_3", "level_5", "skor_100"],
    Citra: ["first_module", "streak_3", "level_5", "tiga_mapel"],
    Joko: ["first_module", "star_collector", "level_5"],
    Aisyah: ["first_module", "streak_3"], Fajar: ["first_module", "tiga_mapel"],
    Budi: ["first_module"], Dimas: ["first_module"], Hasan: [] };
  for (const [nama, kodes] of Object.entries(award)) {
    for (const k of kodes) {
      if (!bid(k) || !studentIds[nama]) continue;
      await db.query(
        "insert into public.student_badges (student_id,badge_id) values ($1::uuid,$2) on conflict do nothing",
        [studentIds[nama], bid(k)]
      );
    }
  }

  // ringkasan
  const count = async (t, w = "") => (await db.query(`select count(*)::int n from public.${t} ${w}`)).rows[0].n;
  console.log("\n✅ SEED LENGKAP SELESAI!");
  console.log(`   Mapel   : ${await count("subjects")}`);
  console.log(`   Modul   : ${await count("modules")} (published: ${await count("modules", "where status='published'")})`);
  console.log(`   Soal    : ${await count("questions")}`);
  console.log(`   Game    : ${await count("games", "where module_id is null")} global`);
  console.log(`   Badge   : ${await count("badges")}`);
  console.log(`   Siswa   : ${await count("profiles", "where role='student' and aktif=true")} aktif + ${await count("profiles", "where role='student' and aktif=false")} arsip`);
  console.log(`   Progress: ${await count("student_progress")}`);
  console.log(`   Esai    : ${await count("essay_submissions", "where status_review='menunggu_review'")} menunggu review`);
  console.log("\n   🔑 Admin : admin@belajarceria.id / admin123");
  console.log(`   🔑 Siswa : <nama kecil> / ${PASSWORD_SISWA}  (mis. aisyah, gita, joko)`);
}

main()
  .catch((e) => { console.error("❌", e.message); process.exitCode = 1; })
  .finally(() => db.end());
