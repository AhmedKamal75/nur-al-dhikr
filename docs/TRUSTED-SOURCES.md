# Trusted sources for the scholarly handoffs

Role of this file: **collection only**. Engineering gathered candidate
sources; a qualified scholar rules on content (TAJ-01), identity
(SCH-01/SYM-01), grades, and Quran-content fidelity. Nothing here is a
religious verdict, and no Academy lesson, grade, or icon decision may
cite this file as its authority — only the scholar's written sign-off.

Searched 2026-09-23. Links are references; verify editions before use.

## 1. Tajweed curriculum (TAJ-01)

### 1a. Primary matn — al-Muqaddima al-Jazariyya

- **Matn al-Jazariyya**, Imam Shams al-Din Muhammad ibn Muhammad ibn
  al-Jazari (d. 833/1429): 107-verse rajaz poem covering makharij,
  sifaat, noon/meem rules, madd, waqf/ibtida, rasm notes. Universally
  recognized foundation in the literature), but deliberately terse — **requires a sharh for teaching**.
  - Arabic text: https://www.islam.ms/ar/جزريية-قواعد-تجويد
  - English translation + explanation (abouttajweed.com):
    https://www.abouttajweed.com/downloads/2-al-jazariyyah-poem?download=5%3Aal-jazariyyah-poem-translated-with-some-explanation
  - Text + metadata: https://usul.ai/ps/t/al-jazariyya
  - Scanned edition: https://archive.org/details/MatanAlJazariyyahTajwidAlQuran
- **Commentaries (needed before lessons)**: _Siraj al-Qari fi Sharh
  al-Muqaddima_ (chapter-by-chapter: makharij dispute, sifaat, ghunna,
  qalqalah, waqf): https://quranonlinelibrary.com/kutub-library/Siraaj-al-qaari-fi-sharah-al-muqadimah ;
  _al-Hawashi al-Mufhima_ (Ibn al-Nazim); _al-Minah al-Fikriyya_
  (Mulla Ali al-Qari).
- Academic backing: Bostan (2023), content/method analysis, DOI
  https://doi.org/10.17120/omuifd.1274261 ; Cakir (2025) on maqtu`/mawsul,
  DOI https://doi.org/10.54893/vanid.1740851.

### 1b. Introductory matn — Tuhfat al-Atfal

- **Tuhfat al-Atfal wal-Ghilman**, Sulayman al-Jamzuri (~61 verses):
  noon sakinah/tanween (4 rules), meem/noon mushaddad, meem sakinah
  (3 rules), madd categories. The standard _first_ text for beginners.
  - Arabic vowelled text: https://surahquran.com/Tajweed/tohfat-alatfal.html
  - Shamela text: https://al-maktaba.org/book/31616maktaba.org/10731
  - Verse-by-verse English: https://www.quranmyway.com/tuhfat-al-atfal-matn-part-4-meem-mushadadh-saakinah/
  - Course outline: https://www.noor-alilm.com/en/course/tuhfat-al-atfal

### 1c. Makharij (TAJ-09 input — scholar must pick the madhhab)

- Majority (Khalil ibn Ahmad → Ibn al-Jazari): **17** (jawf 1, halq 3,
  lisan 10, shafatan 2, khayshum 1). Sibawayh/al-Shatibi: **16** (drop
  jawf). Al-Farra/Qutrub: **14** (also merge ل/ن/ر). Present all three
  with attribution; default to 17 only after scholarly sign-off.
- References: JIIC systematic review (2025),
  https://jicnusantara.com/index.php/jiic/article/download/6290/6341/35676 ;
  Amidi risala edition (2019), DOI https://doi.org/10.21608/bfag.2019.63397 ;
  Hocine (2025) on makhraj terminology, DOI
  https://doi.org/10.56177/eon.6.2.2025.art.12 ; taught summary
  https://bayanlquran.com/tajwid-warch/ ; English table
  https://recitewithlove.com/wp-content/uploads/2015/12/chapter-3-makharij-ul-huroof-with-logo.pdf
- Modern: Ayman Rushdi Suwayd, _al-Tajwid al-Musawwar_ (illustrated).

### 1d. Institutional anchor

- King Fahd Glorious Quran Printing Complex (KFGQPC):
  mushaf text + _Tafsir al-Muyassar_ data for developers (Hafs, Unicode,
  JSON/SQL), _al-Tajweed al-Muyassar_ book, ijazah Tajweed courses,
  scholarly committee headed by Shaykh Dr. Ali al-Hudhaifi:
  https://qurancomplex.gov.sa/en/ , developer platform
  https://qurancomplex.gov.sa/quran-dev/ , desktop-publishing mushaf
  https://nashr.qurancomplex.gov.sa/en/

## 2. Identity ruling (SCH-01 / SYM-01)

Present **both** positions to the scholar; engineering takes no side:

- islamqa.info #1528 — no shari'ah basis for crescent/star as a Muslim
  symbol; better to avoid:
  https://islamqa.info/en/answers/1528
- islamqa.info #79141 — same ruling restated for Ramadan decorations:
  https://islamqa.info/en/answers/79141
- islamqa.info #4045 — group banners; quoted scholars discourage the
  crescent, suggest the Ka'bah image or no symbol at all:
  https://islamqa.info/en/answers/4045
- islamweb.net fatwa #91620 — nuanced counter-position: using the
  crescent as a logo is not worship, hence not innovation; no harm:
  https://www.islamweb.net/en/fatwa/91620/taking-the-crescent-as-a-logo-for-islamic-sites
- Quranic lunar references both sides cite: 2:189 (Ibn Kathir,
  al-Qurtubi on mawaqit), 17:12, 10:5, 6:97, 67:5.

## 3. Hadith grades (content handoff)

- sunnah.com: Sahihain (Bukhari ~7500, Muslim ~7500) plus Albani and
  Darussalam (Zubair Ali Zai) grades outside the Sahihain; more
  muhaddithun (al-Arna'ut, Ahmad Shakir, Abu Ghuddah) planned:
  https://beta.sunnah.com/about , https://sunnah.com/bukhari ,
  https://sunnah.com/muslim/about
- Rule for the app (unchanged): display only source-attached grades;
  `Unknown`/missing stays visibly uncertain (DATA-01, already shipped).

## 4. Quran content fidelity (content handoff)

- KFGQPC developer content above (Hafs Uthmani text + Muyassar tafsir).
- Tafsir authorities already cited by the fatwa sources above: Ibn
  Kathir, al-Qurtubi (for 2:189 and lunar verses).

---

# Part 2 — Wave 2 organization & learning evidence (ORG / TAJ-10-11)

Same rule: collection only. These are design-science references for
measuring against — they do not authorize any redesign by themselves.
ORG-02's five-tab proposal stays **a hypothesis to validate**.

## 5. Navigation & disclosure (ORG-02, ORG-03, ORG-06, ORG-07)

- NN/g mobile navigation patterns (tabs vs hamburger vs hub; 4–5 item
  tab limit; hidden navigation degrades discovery):
  https://www.nngroup.com/articles/mobile-navigation-patterns/
- NN/g navigation discoverability study (179 users; visible/combination
  navigation beats hidden; salience + scent + sticky):
  https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/
- Smashing Magazine / Hoober thumb-zone research (49% one-thumb,
  75% thumb-driven; frequent actions bottom-anchored):
  https://www.smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/ ,
  https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/
- NN/g progressive disclosure (show few important options first;
  strong-scented progression; max ~2 levels or chunk + card-sort):
  https://www.nngroup.com/articles/progressive-disclosure/
- NN/g heuristics for complex applications (staged disclosure for
  rarely-used settings):
  https://www.nngroup.com/articles/usability-heuristics-complex-applications/
- Microsoft Win32 progressive-disclosure controls (More/Fewer vs
  Show/Hide labeling; discoverability/stability risks):
  https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-progressive-disclosure-controls
- NN/g mobile usability research program (eyetracking, diaries,
  8 countries):
  https://www.nngroup.com/reports/mobile-website-and-application-usability/

## 6. Target size & Grandmother lens (ORG-04, ORG-05, ORG-06)

- WCAG 2.2 SC 2.5.5 Target Size Enhanced (AAA): 44×44 CSS px —
  the normative anchor for the app's 44px policy:
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced
- WCAG 2.2 SC 2.5.8 Target Size Minimum (AA): 24×24 floor, spacing
  exception — the release floor below the policy:
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG2Mobile guidance (Reflow 320px ⇒ the BIF-01 no-horizontal-scroll
  rule; target size on mobile):
  https://www.w3.org/TR/wcag2mobile-22/
- Older-adult app guidelines, systematic review of 40 usability-tested
  studies (simplify navigation, enlarge + space controls, large fonts,
  plain language — the evidence base for the Grandmother lens):
  https://doi.org/10.2196/43186
- Older-adult review 2014–2025, 132 articles (linear navigation,
  readable interfaces, touch-friendly elements, co-design):
  https://link.springer.com/article/10.1007/s40520-025-03157-7
- AIS older-user UI checklist (flat one-level navigation, labeled
  buttons, text-over-icons, back-button safeguard):
  https://aisel.aisnet.org/cgi/viewcontent.cgi?article=1238&context=thci
- Singapore SS 618 (icons must not stand alone without text; simple
  navigation; deep hierarchies undesirable):
  https://www.singaporestandardseshop.sg/Product/GetPdf?fileName=180402090428SS+618-2016_Preview.pdf&pdtid=28b094be-a282-4c85-bdab-95d0afa6c4d8
- ACM 2025 validated older-adult recommendations incl. labeled icons
  (user study, n=60):
  https://dl.acm.org/doi/10.1145/3726986.3727000

## 7. Icon language (ORG-05)

- NN/g icon usability (text label mandatory beside every icon;
  5-second rule; test recognition + memorability):
  https://www.nngroup.com/articles/icon-usability/
- NN/g icon evaluation methods (recognition vs interpretation vs
  findability; in-context click/time-to-locate tests):
  https://www.nngroup.com/articles/how-to-test-digital-icons/ ,
  https://www.nngroup.com/articles/icon-testing/
- NN/g bad icons (inconsistent-quality sets waste time; label
  everything, keep targets large):
  https://www.nngroup.com/articles/bad-icons/

## 8. Spaced review science (TAJ-11)

- Spacing/distributed-practice effect (robust phenomenon; spaced >
  massed, esp. with retrieval + feedback; L2 vocabulary):
  https://journals.sagepub.com/doi/10.1177/0267658320927764
- Bahrick 9-year longitudinal retention (longer intervals ⇒ higher
  retention; 13×56-day ≈ 26×14-day):
  https://doi.org/10.1111/j.1467-9280.1993.tb00571.x
- Adaptive forgetting curves / half-life regression (Duolingo data;
  word complexity predicts recall):
  https://link.springer.com/content/pdf/10.1007/978-3-030-52240-7_65.pdf
- Computer-based spaced repetition double-blind study (Leitner/SuperMemo;
  schedule shape matters less than spacing itself; retrieval effort):
  https://files.eric.ed.gov/fulltext/EJ1143520.pdf
- Expanding vs equal spacing (Nakata 2015; Karpicke & Bauernschmidt
  2011 — absolute spacing dominates):
  https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/abs/effects-of-expanding-and-equal-spacing-on-second-language-vocabulary-learning/D1D796306985C52F9BE7A1200AC50DB9
- Design rule derived for TAJ-11: review Tajweed rules on expanding
  intervals as a **study aid** (never a worship streak); algorithm
  choice is secondary to spacing + retrieval.
