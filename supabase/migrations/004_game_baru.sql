-- ============================================================
-- FASE 2 TAHAP 4 — 6 tipe game baru (total 11) + seed Zona Game
-- Jalankan di Supabase SQL Editor (atau: node scripts/run-sql.mjs supabase/migrations/004_game_baru.sql)
-- ============================================================

alter table public.games drop constraint if exists games_tipe_game_check;
alter table public.games add constraint games_tipe_game_check check (tipe_game in (
  'tebak_huruf','susun_suku_kata','cocokkan','hitung_benda','memory',
  'baca_ucapkan','tebak_kata_gambar','urutkan_angka','kuis_kilat','lengkapi_kalimat','tebak_bunyi'
));

-- seed 6 game global baru untuk Zona Game (hanya bila tipenya belum ada)
insert into public.games (module_id, tipe_game, config)
select null, v.tipe, v.config::jsonb
from (values
  ('baca_ucapkan', '{"items":[
    {"teks_id":"Budi suka membaca buku","teks_en":"Budi likes to read books"},
    {"teks_id":"Kucing itu tidur di atas meja","teks_en":"The cat sleeps on the table"},
    {"teks_id":"Aku makan nasi goreng setiap pagi","teks_en":"I eat fried rice every morning"},
    {"teks_id":"Bunga mawar berwarna merah","teks_en":"The rose is red"}
  ]}'),
  ('tebak_kata_gambar', '{"items":[
    {"emoji":"🍎","jawaban_id":"apel","jawaban_en":"apple"},
    {"emoji":"🐱","jawaban_id":"kucing","jawaban_en":"cat"},
    {"emoji":"🏠","jawaban_id":"rumah","jawaban_en":"house"},
    {"emoji":"⚽","jawaban_id":"bola","jawaban_en":"ball"},
    {"emoji":"🌙","jawaban_id":"bulan","jawaban_en":"moon"}
  ]}'),
  ('urutkan_angka', '{"jumlah":5,"min":1,"max":20,"arah":"campur","ronde":5}'),
  ('kuis_kilat', '{"waktu_per_soal":10,"items":[
    {"soal_id":"3 + 4 = ?","soal_en":"3 + 4 = ?","opsi_id":["6","7","8","9"],"opsi_en":["6","7","8","9"],"benar":1},
    {"soal_id":"Huruf pertama kata Ikan?","soal_en":"First letter of Fish?","opsi_id":["I","K","A","N"],"opsi_en":["F","I","S","H"],"benar":0},
    {"soal_id":"10 - 6 = ?","soal_en":"10 - 6 = ?","opsi_id":["2","3","4","5"],"opsi_en":["2","3","4","5"],"benar":2},
    {"soal_id":"Mana hewan?","soal_en":"Which is an animal?","opsi_id":["🍎","🐘","🏠","⚽"],"opsi_en":["🍎","🐘","🏠","⚽"],"benar":1},
    {"soal_id":"5 + 5 = ?","soal_en":"5 + 5 = ?","opsi_id":["10","11","9","12"],"opsi_en":["10","11","9","12"],"benar":0}
  ]}'),
  ('lengkapi_kalimat', '{"items":[
    {"kalimat_id":"Adik ___ susu setiap pagi","kalimat_en":"My little sibling ___ milk every morning","jawaban_id":"minum","jawaban_en":"drinks","pilihan_id":["minum","makan","lari"],"pilihan_en":["drinks","eats","runs"]},
    {"kalimat_id":"Matahari terbit di sebelah ___","kalimat_en":"The sun rises in the ___","jawaban_id":"timur","jawaban_en":"east","pilihan_id":["timur","barat","atas"],"pilihan_en":["east","west","top"]},
    {"kalimat_id":"Ibu memasak di ___","kalimat_en":"Mother cooks in the ___","jawaban_id":"dapur","jawaban_en":"kitchen","pilihan_id":["dapur","kamar","halaman"],"pilihan_en":["kitchen","bedroom","yard"]},
    {"kalimat_id":"Ikan hidup di dalam ___","kalimat_en":"Fish live in the ___","jawaban_id":"air","jawaban_en":"water","pilihan_id":["air","tanah","udara"],"pilihan_en":["water","soil","air"]}
  ]}'),
  ('tebak_bunyi', '{"items":["ba","bu","bi","ma","mi","mu","ka","ku","sa","si","ta","tu"]}')
) as v(tipe, config)
where not exists (
  select 1 from public.games g where g.module_id is null and g.tipe_game = v.tipe
);
