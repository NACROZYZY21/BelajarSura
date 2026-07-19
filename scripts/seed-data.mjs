// Data seed Belajar Ceria — dipakai oleh setup-db.mjs

export const SUBJECTS = [
  { nama_id: "Membaca & Bahasa", nama_en: "Reading & Language", ikon: "📖", warna: "#29b0f0", urutan: 1 },
  { nama_id: "Berhitung & Matematika", nama_en: "Counting & Math", ikon: "🔢", warna: "#22c55e", urutan: 2 },
];

export const USERS = [
  { email: "admin@belajarceria.id", password: "admin123", meta: { role: "admin", nama: "Bu Guru Admin", avatar: "🦉" } },
  { email: "budi@siswa.belajarceria.id", password: "belajar123", meta: { role: "student", nama: "Budi", kelas: "1", avatar: "🐱" } },
  { email: "sari@siswa.belajarceria.id", password: "belajar123", meta: { role: "student", nama: "Sari", kelas: "2", avatar: "🐰" } },
];

export const BADGES = [
  { kode: "first_module", nama_id: "Langkah Pertama", nama_en: "First Step", ikon: "👣", deskripsi_id: "Selesaikan modul pertamamu", deskripsi_en: "Finish your first module", xp_syarat: 0 },
  { kode: "star_collector", nama_id: "Kolektor Bintang", nama_en: "Star Collector", ikon: "⭐", deskripsi_id: "Dapat 3 bintang di satu modul", deskripsi_en: "Get 3 stars in a module", xp_syarat: 0 },
  { kode: "streak_3", nama_id: "Api Semangat", nama_en: "On Fire", ikon: "🔥", deskripsi_id: "Belajar 3 hari beruntun", deskripsi_en: "Learn 3 days in a row", xp_syarat: 0 },
  { kode: "level_5", nama_id: "Bintang Kelas", nama_en: "Class Star", ikon: "🌟", deskripsi_id: "Capai level 5", deskripsi_en: "Reach level 5", xp_syarat: 500 },
  { kode: "game_master", nama_id: "Jagoan Game", nama_en: "Game Master", ikon: "🎮", deskripsi_id: "Mainkan semua 5 game", deskripsi_en: "Play all 5 games", xp_syarat: 0 },
  { kode: "level_10", nama_id: "Juara Sejati", nama_en: "True Champion", ikon: "🏆", deskripsi_id: "Capai level 10", deskripsi_en: "Reach level 10", xp_syarat: 2250 },
];

export const GLOBAL_GAMES = [
  { tipe_game: "tebak_huruf", config: { huruf: ["a", "b", "c", "d", "e", "g", "i", "k", "m", "n", "o", "p", "s", "t", "u"] } },
  { tipe_game: "susun_suku_kata", config: { kata: [{ kata: "baju", suku: ["ba", "ju"], emoji: "👕" }, { kata: "buku", suku: ["bu", "ku"], emoji: "📚" }, { kata: "meja", suku: ["me", "ja"], emoji: "🪑" }, { kata: "sepatu", suku: ["se", "pa", "tu"], emoji: "👟" }, { kata: "kereta", suku: ["ke", "re", "ta"], emoji: "🚂" }] } },
  { tipe_game: "cocokkan", config: { pasangan: [{ emoji: "🍌", kata_id: "pisang", kata_en: "banana" }, { emoji: "🐘", kata_id: "gajah", kata_en: "elephant" }, { emoji: "🌙", kata_id: "bulan", kata_en: "moon" }, { emoji: "🚗", kata_id: "mobil", kata_en: "car" }, { emoji: "🌈", kata_id: "pelangi", kata_en: "rainbow" }, { emoji: "🦋", kata_id: "kupu-kupu", kata_en: "butterfly" }] } },
  { tipe_game: "hitung_benda", config: { max: 12, emoji: ["🍎", "🐤", "⭐", "🎈", "🐠", "🍭"] } },
  { tipe_game: "memory", config: { pasangan: [["🐱", "🐱"], ["🐶", "🐶"], ["🐰", "🐰"], ["🦊", "🦊"], ["🐼", "🐼"], ["🐸", "🐸"]] } },
];

/** subjectKey: "bahasa" | "mtk" — dipetakan ke id mapel saat seeding. */
export const MODULES = [
  {
    subjectKey: "bahasa", tingkat_kelas: 1, urutan: 1, status: "published",
    judul_id: "Mengenal Huruf A–Z", judul_en: "Learning Letters A–Z",
    materi_id: "# Ayo Kenali Huruf! 🔤\n\nHuruf adalah lambang bunyi. Ada **26 huruf** dari A sampai Z.\n\n**Huruf vokal:** A, I, U, E, O 🎵\n\n**Huruf konsonan:** huruf lainnya seperti B, C, D, K, M...\n\nContoh:\n- 🍎 **Apel** dimulai huruf **A**\n- 🐝 **Lebah** ada huruf **B**-nya\n- 🐱 **Kucing** dimulai huruf **K**",
    materi_en: "# Let's Learn Letters! 🔤\n\nLetters are symbols of sounds. There are **26 letters** from A to Z.\n\n**Vowels:** A, E, I, O, U 🎵\n\n**Consonants:** other letters like B, C, D, K, M...\n\nExamples:\n- 🍎 **Apple** starts with **A**\n- 🐝 **Bee** starts with **B**\n- 🐱 **Cat** starts with **C**",
    soal: [
      { tipe: "pg", pertanyaan_id: "Huruf apa yang pertama pada kata 'Apel' 🍎?", pertanyaan_en: "What is the first letter of 'Apple' 🍎?", opsi: { id: ["A", "B", "C", "D"], en: ["A", "B", "C", "D"] }, jawaban_benar: "0", poin: 10 },
      { tipe: "pg", pertanyaan_id: "Mana yang termasuk huruf vokal?", pertanyaan_en: "Which one is a vowel?", opsi: { id: ["K", "M", "U", "T"], en: ["K", "M", "U", "T"] }, jawaban_benar: "2", poin: 10 },
      { tipe: "pg", pertanyaan_id: "Kata 'Buku' 📚 dimulai dengan huruf...", pertanyaan_en: "The word 'Book' 📚 starts with...", opsi: { id: ["D", "B", "P", "K"], en: ["D", "B", "P", "K"] }, jawaban_benar: "1", poin: 10 },
      { tipe: "pg", pertanyaan_id: "Ada berapa huruf vokal?", pertanyaan_en: "How many vowels are there?", opsi: { id: ["3", "4", "5", "6"], en: ["3", "4", "5", "6"] }, jawaban_benar: "2", poin: 10 },
      { tipe: "esai", pertanyaan_id: "Tulis huruf pertama dari kata 'Ikan' 🐟", pertanyaan_en: "Write the first letter of 'Fish' 🐟 (in Indonesian: Ikan)", opsi: null, jawaban_benar: "i", poin: 15 },
    ],
    games: [
      { tipe_game: "tebak_huruf", config: { huruf: ["a", "b", "c", "d", "e", "i", "k", "m", "s", "u"] } },
      { tipe_game: "memory", config: { pasangan: [["A", "a"], ["B", "b"], ["C", "c"], ["D", "d"], ["E", "e"], ["F", "f"]] } },
    ],
  },
  {
    subjectKey: "bahasa", tingkat_kelas: 1, urutan: 2, status: "published",
    judul_id: "Suku Kata Seru", judul_en: "Fun Syllables",
    materi_id: "# Suku Kata 🧩\n\nKata terbentuk dari **suku kata**.\n\nContoh:\n- **bu + ku** = buku 📚\n- **ba + ju** = baju 👕\n- **sa + pi** = sapi 🐮\n\nCoba tepuk tangan tiap suku kata: bu 👏 ku 👏!",
    materi_en: "# Syllables 🧩\n\nWords are made of **syllables**.\n\nExamples:\n- **bu + ku** = buku (book) 📚\n- **ba + ju** = baju (shirt) 👕\n- **sa + pi** = sapi (cow) 🐮\n\nClap for each syllable: bu 👏 ku 👏!",
    soal: [
      { tipe: "pg", pertanyaan_id: "'ba' + 'ju' menjadi kata...", pertanyaan_en: "'ba' + 'ju' makes the word...", opsi: { id: ["buku", "baju", "batu", "bola"], en: ["buku", "baju", "batu", "bola"] }, jawaban_benar: "1", poin: 10 },
      { tipe: "pg", pertanyaan_id: "Kata 'sapi' 🐮 terdiri dari suku kata...", pertanyaan_en: "The word 'sapi' 🐮 is made of syllables...", opsi: { id: ["sa-pi", "sap-i", "s-api", "sapi"], en: ["sa-pi", "sap-i", "s-api", "sapi"] }, jawaban_benar: "0", poin: 10 },
      { tipe: "pg", pertanyaan_id: "Berapa suku kata pada kata 'kelinci' 🐰?", pertanyaan_en: "How many syllables in 'kelinci' 🐰?", opsi: { id: ["1", "2", "3", "4"], en: ["1", "2", "3", "4"] }, jawaban_benar: "2", poin: 10 },
      { tipe: "esai", pertanyaan_id: "Gabungkan: 'bo' + 'la' = ...", pertanyaan_en: "Combine: 'bo' + 'la' = ...", opsi: null, jawaban_benar: "bola", poin: 15 },
    ],
    games: [
      { tipe_game: "susun_suku_kata", config: { kata: [{ kata: "baju", suku: ["ba", "ju"], emoji: "👕" }, { kata: "buku", suku: ["bu", "ku"], emoji: "📚" }, { kata: "sapi", suku: ["sa", "pi"], emoji: "🐮" }, { kata: "bola", suku: ["bo", "la"], emoji: "⚽" }, { kata: "kelinci", suku: ["ke", "lin", "ci"], emoji: "🐰" }] } },
    ],
  },
  {
    subjectKey: "bahasa", tingkat_kelas: 1, urutan: 3, status: "published",
    judul_id: "Membaca Kata Pertamaku", judul_en: "My First Words",
    materi_id: "# Ayo Membaca! 📖\n\nSekarang kita baca kata utuh!\n\n- 🏠 **rumah**\n- 🌸 **bunga**\n- 🐟 **ikan**\n- ☀️ **matahari**\n\nBaca pelan-pelan, lalu makin cepat. Kamu pasti bisa!",
    materi_en: "# Let's Read! 📖\n\nNow we read whole words!\n\n- 🏠 **rumah** (house)\n- 🌸 **bunga** (flower)\n- 🐟 **ikan** (fish)\n- ☀️ **matahari** (sun)\n\nRead slowly, then faster. You can do it!",
    soal: [
      { tipe: "pg", pertanyaan_id: "Gambar 🏠 dibaca...", pertanyaan_en: "Picture 🏠 reads as...", opsi: { id: ["rumah", "sekolah", "kolam", "kebun"], en: ["house", "school", "pool", "garden"] }, jawaban_benar: "0", poin: 10 },
      { tipe: "pg", pertanyaan_id: "Kata 'ikan' cocok dengan gambar...", pertanyaan_en: "The word 'fish' matches picture...", opsi: { id: ["🐟", "🐦", "🐱", "🐰"], en: ["🐟", "🐦", "🐱", "🐰"] }, jawaban_benar: "0", poin: 10 },
      { tipe: "pg", pertanyaan_id: "☀️ adalah...", pertanyaan_en: "☀️ is...", opsi: { id: ["bulan", "bintang", "matahari", "awan"], en: ["moon", "star", "sun", "cloud"] }, jawaban_benar: "2", poin: 10 },
      { tipe: "esai", pertanyaan_id: "Tulis nama benda ini: 🌸", pertanyaan_en: "Write the Indonesian name of: 🌸", opsi: null, jawaban_benar: "bunga", poin: 15 },
    ],
    games: [
      { tipe_game: "cocokkan", config: { pasangan: [{ emoji: "🏠", kata_id: "rumah", kata_en: "house" }, { emoji: "🌸", kata_id: "bunga", kata_en: "flower" }, { emoji: "🐟", kata_id: "ikan", kata_en: "fish" }, { emoji: "☀️", kata_id: "matahari", kata_en: "sun" }, { emoji: "🐱", kata_id: "kucing", kata_en: "cat" }, { emoji: "📚", kata_id: "buku", kata_en: "book" }] } },
    ],
  },
  {
    subjectKey: "mtk", tingkat_kelas: 1, urutan: 1, status: "published",
    judul_id: "Mengenal Angka 1–10", judul_en: "Numbers 1–10",
    materi_id: "# Ayo Berhitung! 🔢\n\nAngka dipakai untuk menghitung.\n\n1️⃣ satu — 2️⃣ dua — 3️⃣ tiga — 4️⃣ empat — 5️⃣ lima\n\n6️⃣ enam — 7️⃣ tujuh — 8️⃣ delapan — 9️⃣ sembilan — 🔟 sepuluh\n\nHitung apelnya: 🍎🍎🍎 = **3 apel**!",
    materi_en: "# Let's Count! 🔢\n\nNumbers are used for counting.\n\n1️⃣ one — 2️⃣ two — 3️⃣ three — 4️⃣ four — 5️⃣ five\n\n6️⃣ six — 7️⃣ seven — 8️⃣ eight — 9️⃣ nine — 🔟 ten\n\nCount the apples: 🍎🍎🍎 = **3 apples**!",
    soal: [
      { tipe: "pg", pertanyaan_id: "Berapa banyak balon ini? 🎈🎈🎈🎈", pertanyaan_en: "How many balloons? 🎈🎈🎈🎈", opsi: { id: ["3", "4", "5", "6"], en: ["3", "4", "5", "6"] }, jawaban_benar: "1", poin: 10 },
      { tipe: "pg", pertanyaan_id: "Angka setelah 6 adalah...", pertanyaan_en: "The number after 6 is...", opsi: { id: ["5", "8", "7", "9"], en: ["5", "8", "7", "9"] }, jawaban_benar: "2", poin: 10 },
      { tipe: "pg", pertanyaan_id: "'Lima' ditulis dengan angka...", pertanyaan_en: "'Five' is written as...", opsi: { id: ["3", "4", "5", "6"], en: ["3", "4", "5", "6"] }, jawaban_benar: "2", poin: 10 },
      { tipe: "pg", pertanyaan_id: "Mana yang paling banyak?", pertanyaan_en: "Which has the most?", opsi: { id: ["🍎🍎", "🍎🍎🍎🍎🍎", "🍎", "🍎🍎🍎"], en: ["🍎🍎", "🍎🍎🍎🍎🍎", "🍎", "🍎🍎🍎"] }, jawaban_benar: "1", poin: 10 },
      { tipe: "esai", pertanyaan_id: "Hitung bintangnya: ⭐⭐⭐⭐⭐⭐ (tulis angkanya)", pertanyaan_en: "Count the stars: ⭐⭐⭐⭐⭐⭐ (write the number)", opsi: null, jawaban_benar: "6", poin: 15 },
    ],
    games: [
      { tipe_game: "hitung_benda", config: { max: 10, emoji: ["🍎", "🐤", "⭐", "🎈", "🐠"] } },
      { tipe_game: "memory", config: { pasangan: [["1", "1️⃣"], ["2", "2️⃣"], ["3", "3️⃣"], ["4", "4️⃣"], ["5", "5️⃣"], ["6", "6️⃣"]] } },
    ],
  },
  {
    subjectKey: "mtk", tingkat_kelas: 1, urutan: 2, status: "published",
    judul_id: "Penjumlahan Ceria", judul_en: "Happy Addition",
    materi_id: "# Penjumlahan ➕\n\nMenjumlah artinya **menggabungkan**.\n\n🍎🍎 + 🍎 = 🍎🍎🍎\n\n**2 + 1 = 3**\n\nContoh lain:\n- 3 + 2 = 5\n- 4 + 4 = 8\n\nAyo coba sendiri!",
    materi_en: "# Addition ➕\n\nAdding means **putting together**.\n\n🍎🍎 + 🍎 = 🍎🍎🍎\n\n**2 + 1 = 3**\n\nMore examples:\n- 3 + 2 = 5\n- 4 + 4 = 8\n\nNow you try!",
    soal: [
      { tipe: "pg", pertanyaan_id: "2 + 3 = ...", pertanyaan_en: "2 + 3 = ...", opsi: { id: ["4", "5", "6", "7"], en: ["4", "5", "6", "7"] }, jawaban_benar: "1", poin: 10 },
      { tipe: "pg", pertanyaan_id: "🐤🐤 + 🐤🐤🐤 = berapa anak ayam?", pertanyaan_en: "🐤🐤 + 🐤🐤🐤 = how many chicks?", opsi: { id: ["4", "5", "6", "3"], en: ["4", "5", "6", "3"] }, jawaban_benar: "1", poin: 10 },
      { tipe: "pg", pertanyaan_id: "4 + 4 = ...", pertanyaan_en: "4 + 4 = ...", opsi: { id: ["6", "7", "8", "9"], en: ["6", "7", "8", "9"] }, jawaban_benar: "2", poin: 10 },
      { tipe: "pg", pertanyaan_id: "1 + 6 = ...", pertanyaan_en: "1 + 6 = ...", opsi: { id: ["7", "8", "6", "5"], en: ["7", "8", "6", "5"] }, jawaban_benar: "0", poin: 10 },
      { tipe: "esai", pertanyaan_id: "5 + 3 = ... (tulis angkanya)", pertanyaan_en: "5 + 3 = ... (write the number)", opsi: null, jawaban_benar: "8", poin: 15 },
    ],
    games: [
      { tipe_game: "hitung_benda", config: { max: 10, mode: "tambah", emoji: ["🍓", "🐞", "🌼"] } },
    ],
  },
  {
    subjectKey: "mtk", tingkat_kelas: 1, urutan: 3, status: "published",
    judul_id: "Pengurangan Seru", judul_en: "Fun Subtraction",
    materi_id: "# Pengurangan ➖\n\nMengurang artinya **mengambil**.\n\nAda 🍪🍪🍪🍪, dimakan 1 🍪... sisa 🍪🍪🍪!\n\n**4 − 1 = 3**\n\nContoh lain:\n- 5 − 2 = 3\n- 8 − 4 = 4",
    materi_en: "# Subtraction ➖\n\nSubtracting means **taking away**.\n\nThere are 🍪🍪🍪🍪, eat 1 🍪... 🍪🍪🍪 left!\n\n**4 − 1 = 3**\n\nMore examples:\n- 5 − 2 = 3\n- 8 − 4 = 4",
    soal: [
      { tipe: "pg", pertanyaan_id: "5 − 2 = ...", pertanyaan_en: "5 − 2 = ...", opsi: { id: ["2", "3", "4", "5"], en: ["2", "3", "4", "5"] }, jawaban_benar: "1", poin: 10 },
      { tipe: "pg", pertanyaan_id: "Ada 6 balon 🎈, meletus 2. Sisa berapa?", pertanyaan_en: "There are 6 balloons 🎈, 2 popped. How many left?", opsi: { id: ["3", "4", "5", "2"], en: ["3", "4", "5", "2"] }, jawaban_benar: "1", poin: 10 },
      { tipe: "pg", pertanyaan_id: "8 − 4 = ...", pertanyaan_en: "8 − 4 = ...", opsi: { id: ["2", "3", "4", "5"], en: ["2", "3", "4", "5"] }, jawaban_benar: "2", poin: 10 },
      { tipe: "pg", pertanyaan_id: "10 − 5 = ...", pertanyaan_en: "10 − 5 = ...", opsi: { id: ["5", "6", "4", "10"], en: ["5", "6", "4", "10"] }, jawaban_benar: "0", poin: 10 },
      { tipe: "esai", pertanyaan_id: "7 − 3 = ... (tulis angkanya)", pertanyaan_en: "7 − 3 = ... (write the number)", opsi: null, jawaban_benar: "4", poin: 15 },
    ],
    games: [
      { tipe_game: "hitung_benda", config: { max: 10, mode: "kurang", emoji: ["🍪", "🎈", "🦋"] } },
    ],
  },
];
