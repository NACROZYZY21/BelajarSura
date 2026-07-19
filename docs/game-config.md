# Struktur `config` (jsonb) per Tipe Game

Konten tiap game tersimpan di kolom `config` tabel `games`. Admin mengeditnya lewat
**editor terstruktur** di halaman edit modul (atau JSON mentah untuk lanjutan).
Arsitektur modular: satu komponen per game + skema editor, semuanya terdaftar di
[`components/games/registry.tsx`](../components/games/registry.tsx) — menambah game baru =
buat komponen + daftarkan di registry (+ perluas CHECK constraint di migration).

Semua teks yang dilihat siswa bilingual (`_id` / `_en`).

| # | tipe_game | Bentuk config |
|---|-----------|---------------|
| 1 | `tebak_huruf` | `{"huruf": ["a","b","c","d"]}` |
| 2 | `susun_suku_kata` | `{"kata": [{"kata":"baju","suku":["ba","ju"],"emoji":"👕"}]}` |
| 3 | `cocokkan` | `{"pasangan": [{"emoji":"🍎","kata_id":"apel","kata_en":"apple"}]}` |
| 4 | `hitung_benda` | `{"max":10,"emoji":["🍎","⭐","🎈"]}` |
| 5 | `memory` | `{"pasangan": [["A","a"],["B","b"]]}` |
| 6 | `baca_ucapkan` | `{"items": [{"teks_id":"Budi suka membaca","teks_en":"Budi likes reading"}]}` |
| 7 | `tebak_kata_gambar` | `{"items": [{"gambar_url":"https://... (opsional)","emoji":"🍎","jawaban_id":"apel","jawaban_en":"apple"}]}` |
| 8 | `urutkan_angka` | `{"jumlah":5,"min":1,"max":20,"arah":"campur\|naik\|turun","ronde":5}` |
| 9 | `kuis_kilat` | `{"waktu_per_soal":10,"items":[{"soal_id":"3+4=?","soal_en":"3+4=?","opsi_id":["6","7","8","9"],"opsi_en":["6","7","8","9"],"benar":1}]}` |
| 10 | `lengkapi_kalimat` | `{"items":[{"kalimat_id":"Adik ___ susu","kalimat_en":"Sister ___ milk","jawaban_id":"minum","jawaban_en":"drinks","pilihan_id":["minum","makan"],"pilihan_en":["drinks","eats"]}]}` — `___` = bagian rumpang |
| 11 | `tebak_bunyi` | `{"items": ["ba","bu","ma","mi"]}` |

Catatan per game:
- **baca_ucapkan** — pakai Web Speech API (speech-to-text); bahasa mengikuti toggle ID/EN.
  Penilaian longgar: lulus bila ≥70% kata cocok. Kata benar hijau, terlewat abu-abu.
  Bila browser tidak mendukung, game otomatis disembunyikan dari Zona Game (fungsi
  `isSupported` di registry) dan menampilkan pesan ramah bila dibuka langsung.
- **tebak_kata_gambar** — `gambar_url` diunggah admin ke bucket `media-belajar`
  (kompres otomatis); bila kosong dipakai `emoji`.
- **kuis_kilat** — `benar` = indeks opsi (0-3). Jawab saat sisa waktu >50% = +1 poin bonus.
- **urutkan_angka** — `arah: "campur"` memilih naik/turun acak tiap ronde.
- **AI mode Kreator** dapat mengisi `konten_game` pada draft modul; formatnya sama persis
  dengan tabel di atas, dan admin selalu bisa mengedit hasilnya lewat editor terstruktur.
