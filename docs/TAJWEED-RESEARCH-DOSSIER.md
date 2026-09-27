# TAJWEED-RESEARCH-DOSSIER.md — sourced material for the tajweed teaching layer

**Status:** research output. Collection only, exactly like `docs/TRUSTED-SOURCES.md`.
Nothing here is a religious verdict. No lesson, definition, count or colour in
this file may ship as the app's own authority — it ships as a _quote with a
named source_, and stays `review`-state until a scholar signs off.

**Compiled:** 2026-09-27. **Method:** web research, live-crawled, primary
sources preferred over commentary.

**Confidence vocabulary used throughout:**

| Mark           | Meaning                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **VERIFIED**   | Found in a primary or institutional source, quoted or closely paraphrased, with a locatable URL. |
| **CONTESTED**  | Multiple named sources disagree; both positions recorded.                                        |
| **UNVERIFIED** | Could not confirm. Treated as absent. Not shipped.                                               |

---

## 0. Two findings that change the plan

### 0.1 There is no official KFGQPC rule→colour legend. The Q5 premise is false.

This is the single most important result, because the app is currently
**inventing a colour mapping** and describing it as "the standard chart".

- The King Fahd Glorious Qur'an Printing Complex publishes the al-Madinah
  mushaf and computer fonts. It does **not** publish a per-rule tajweed colour
  table. The only colour in the printed Madinah-mushaf tradition is historical
  red for certain small letters — from the mushaf committee's own report as
  quoted by Dar al-Maarifah: _«وكان علماء الضبط يُلحقون هذه الأحرف حمراء بقدر
  حروف الكتابة الأصلية ولكن تعسّر ذلك في المطابع فاكتُفي بتصغيرها»_
  (https://easyquranstore.com/ar/عن-مصحف-التجويد/).
- The **"QPC V4 Tajweed" colour font is third-party, not a KFGQPC publication.**
  Its own developer states it plainly in the quran.com issue thread: _"I have
  developed these Color fonts … based on KFGQPC Mushaf Fonts, I would not say
  exactly from scratch but yes the coloring thing from scratch"_, and that he
  licences them separately (https://github.com/quran/quran.com-frontend-next/issues/2322).
  The repo consuming it is https://github.com/NedaaDevs/quran-image-generator,
  which stores the palette as an opaque `tajweed_palette` table with a note:
  _"Use `tajweed_palette` only if you need the font's native color"_ — i.e. the
  slot→rule mapping is explicitly left to the implementer.
- At least one commercial product markets a "tajweed mushaf using the KFGQPC
  font" while separately stating _"There is no single universal color standard —
  schemes vary by publisher"_ (https://recitid.ai/guides/tajweed-for-beginners).
  That concession is the accurate position.

**Consequence for the app.** `js/domain/tajweed.js:174` (`TAJWEED_FAMILIES`)
currently says the family colours are "the standard chart's" and that two rules
are "shown here the way the reference chart groups them". No such chart exists.
That comment is an unattributed claim and must be rewritten before the legend
ships. See §5 and the NOT SAFE list.

### 0.2 The app's 20 rule IDs are inherited from an open dataset with soft provenance

`data/tajweed-practice.json` keys are: `hamzat_wasl, lam_shamsiyyah, ghunnah,
ikhfa, iqlab, idgham_ghunnah, idgham_no_ghunnah, idgham_shafawi,
ikhfa_shafawi, izhar_shafawi, qalqalah, tafkhim, madd_2, madd_iwad,
madd_badal, madd_246, madd_munfasil, madd_silah, madd_muttasil, madd_6`.

Nineteen of those twenty are **verbatim the rule ids of `cpfair/quran-tajweed`**
(https://github.com/cpfair/quran-tajweed), the dataset behind the alquran.cloud
and quran.com tajweed annotation. Only `tafkhim` is the app's own addition.
That project's own README states its provenance as _"built using information
from ReciteQuran.com, the Dar al-Maarifah tajweed masaahif, and others"_, and
the predecessor `quran/tajweed` README says _"it is still a work in progress…
does not perfectly match the tajweed mus7af yet."_

This is not a defect — re-deriving the rules from the app's own text
(`js/domain/tajweed.js` header comment) was the right call and dodges the
character-index drift problem. But the **taxonomy** (which rules exist and what
they are called) is inherited, and it is inherited from a WIP transcription of a
printed mushaf rather than from a matn. That is a provenance debt.

**Mitigation, and it is unusually good:** `ghunna` (https://ghunna.com, MIT
licence) has independently built a derivation engine from the two classical
matns and publishes a **rule-id crosswalk and per-rule corpus counts** against
the cpfair ids, in `docs/SPEC.md`
(https://github.com/mwiederrecht/ghunna/blob/main/docs/SPEC.md). That gives the
app a line-citable bridge from its own ids to the matns. Excerpt:

| cpfair id              | count  | ghunna id(s)                                       |
| ---------------------- | ------ | -------------------------------------------------- |
| `hamzat_wasl`          | 13,252 | `hamzat-wasl`                                      |
| `madd_2`               | 9,028  | `madd-tabii` (+`madd-badal`? empirical)            |
| `ikhfa`                | 5,301  | `ikhfa-haqiqi`                                     |
| `ghunnah`              | 4,946  | `ghunnah-mushaddadah` (scope verified empirically) |
| `madd_246`             | 4,543  | `madd-arid-lissukun`, `madd-lin`                   |
| `silent`               | 4,174  | `silent`                                           |
| `idghaam_ghunnah`      | 3,933  | `idgham-bighunnah`                                 |
| `qalqalah`             | 3,834  | `qalqalah-sughra` (+kubrā at verse ends)           |
| `madd_munfasil`        | 3,172  | `madd-munfasil`                                    |
| `lam_shamsiyyah`       | 2,733  | `lam-shamsiyyah`                                   |
| `madd_muttasil`        | 1,997  | `madd-muttasil`                                    |
| `idghaam_no_ghunnah`   | 1,035  | `idgham-bila-ghunnah`                              |
| `idghaam_shafawi`      | 832    | `idgham-shafawi`                                   |
| `iqlab`                | 562    | `iqlab`                                            |
| `ikhfa_shafawi`        | 496    | `ikhfa-shafawi`                                    |
| `madd_6`               | 148    | `madd-lazim-*`                                     |
| `idghaam_mutajanisayn` | 58     | `idgham-mutajanisayn`                              |
| `idghaam_mutaqaribayn` | 13     | `idgham-mutaqaribayn`                              |

Two useful facts fall out: the app carries **no** `mutajanisayn`/`mutaqaribayn`
rules even though they are classical and corpus-attested (58 and 13 sites), and
`ghunna` had to widen `qalqalah` into two classes to match, because qalqalah
depends on waqf (§2.6). Both are live questions for the scholar.

---

## 1. Q1 — The canonical chapter taxonomy, from independent published sources

The brief hypothesised "five/six classical sections". **That is not what the
sources show.** The real matn-based taxonomy is 9–16 sections, and the two
canonical texts disagree with each other. Recorded below as found.

### 1.1 Ibn al-Jazari, _al-Muqaddimah al-Jazariyyah_ — 16 sections, by verse

**VERIFIED.** Ibn al-Jazari (d. 833/1429), _al-Muqaddimah fi ma yajibu 'ala
qaari' al-Qur'an an ya'lamuh_. 107 verses (some editions 119), rajaz, composed
c. 798 AH. Ibn al-Jazari supplied **no** sub-headings; the section titles are
later editorial. Source: https://ar.wikipedia.org/wiki/المقدمة_الجزرية,
corroborated verbatim at https://areq.net/m/المقدمة_الجزرية.html

| §   | Section (Arabic)                      | Verses  |
| --- | ------------------------------------- | ------- |
| 1   | مقدمة المصنف                          | 1–8     |
| 2   | باب مخارج الحروف                      | 9–19    |
| 3   | باب صفات الحروف                       | 20–26   |
| 4   | باب معرفة التجويد                     | 27–33   |
| 5   | باب الترقيق                           | 34–40   |
| 6   | باب أحكام الراءات                     | 41–43   |
| 7   | باب التفخيم                           | 44–49   |
| 8   | باب أحكام الإدغام                     | 50–51   |
| 9   | باب الضاد والظاء                      | 52–61   |
| 10  | باب النون والميم المشددتين والساكنتين | 62–68   |
| 11  | باب أحكام المد                        | 69–72   |
| 12  | باب الوقف والابتداء                   | 73–78   |
| 13  | باب المقصوع والموصول في الرسم         | 79–92   |
| 14  | باب هاءات التأنيث                     | 93–99   |
| 15  | باب الابتداء بهمزة الوصل              | 100–103 |
| 16  | باب الوقف على أواخر الكلم             | 104–105 |
| —   | خاتمة                                 | 106–107 |

Note the al-Jazariyya has **no standalone lam-shamsiyyah section** and **no
standalone makhraj-vs-sifat split** beyond §2–3. Its tafkhim/tarqiq and dad/dha'
chapters are its own idiosyncrasy.

### 1.2 Ibn al-Jazari, _al-Tamhid fi 'ilm al-Tajwid_ — 10 chapters, self-declared

**VERIFIED, and this is the best citation in the dossier** because the author
states the structure in his own introduction: _«وجعلته عشرة أبواب»_.
Ibn al-Jazari, _al-Tamhid fi 'ilm al-Tajwid_, ed. ʿAli Husayn al-Bawwab,
Maktabat al-Maʿarif, Riyadh, 1405/1985, 224 pp. Sources:
https://shamela.ws/book/8194 and https://www.islamweb.net/ar/library/content/230

| Ch. | Chapter (Arabic)                               | English                                       |
| --- | ---------------------------------------------- | --------------------------------------------- |
| 1   | في ذكر قراءة هؤلاء القراء في هذا الزمان        | On the reading of the reciters of this age    |
| 2   | في معنى التجويد والتحقيق والترتيل              | On the meaning of tajweed, tahqiq and tartil  |
| 3   | في أصول القراءة الدائرة على اختلاف القراءات    | On the principles of the circulating readings |
| 4   | في ذكر معنى اللحن وأقسامه                      | On the meaning of lahān and its divisions     |
| 5   | في ذكر ألفات الوصل والقطع                      | On the connective and cutting alifs           |
| 6   | في الكلام على الحروف والحركات                  | On letters and vowels                         |
| 7   | في ذكر ألقاب الحروف وعللها                     | On the epithets of letters and their causes   |
| 8   | في ذكر مخارج الحروف… والكلام على كل حرف        | On the articulation points, letter by letter  |
| 9   | في أحكام النون الساكنة والتنوين ثم المد والقصر | On sākinah nūn/tanwīn, then madd and qasr     |
| 10  | في ذكر الوقف والابتداء                         | On stopping and beginning                     |
| +   | باب في معرفة الظاء وتمييزها من الضاد           | appendix: distinguishing ẓāʾ from ḍād         |

Chapter 7 contains **both** the 10 _alqāb_ (epithets) and the _ṣifāt_
(characteristics). Chapter 8 is the longest, letter-by-letter. Chapter 9 fuses
noon-rules and madd — which is why the two are hard to separate in most
derivative texts.

### 1.3 Sulayman al-Jamzuri, _Tuhfat al-Atfal_ — 10 sections, 61 verses

**VERIFIED.** Sulayman al-Jamzuri (composed 1198 AH), 61 verses. Source
structure: https://shamela.ws/book/9632/2 ; verse text and numbering:
https://ar.wikisource.org/wiki/تحفة_الأطفال

| §   | Section                            | Verses |
| --- | ---------------------------------- | ------ |
| 1   | مقدمة                              | 1–5    |
| 2   | أحكام النون الساكنة والتنوين       | 6–16   |
| 3   | أحكام النون والميم المشددتين       | 17     |
| 4   | أحكام الميم الساكنة                | 18–23  |
| 5   | حكم لام أل ولام الفعل              | 24–29  |
| 6   | في المثلين والمتقاربين والمتجانسين | 30–34  |
| 7   | أقسام المد                         | 35–41  |
| 8   | أحكام المد                         | 42–47  |
| 9   | أقسام المد اللازم                  | 48–58  |
| 10  | الخاتمة                            | 59–61  |

**Tuhfat al-Atfal contains no makharij, no sifat, and no qalqalah at all.** It
is a rules-only beginner text. This matters pedagogically and is the honest
reason it cannot be the app's sole spine.

### 1.4 Where the sources actually disagree

| Dimension    | al-Jazariyya              | al-Tamhid   | Tuhfat al-Atfal            |
| ------------ | ------------------------- | ----------- | -------------------------- |
| Sections     | 16                        | 10          | 10                         |
| Makharij     | yes (v. 9–19)             | yes (ch. 8) | **absent**                 |
| Sifat        | yes (v. 20–26)            | yes (ch. 7) | **absent**                 |
| Noon sakinah | yes (v. 64–67)            | yes (ch. 9) | yes (v. 6–16)              |
| Meem sakinah | yes (v. 62–63)            | yes (ch. 9) | yes (v. 18–23)             |
| Lam rules    | only tafkhim (v. 34, 43)  | ch. 6       | yes (v. 24–29)             |
| Madd         | yes (v. 68–72)            | yes (ch. 9) | yes, most of it (v. 35–58) |
| Waqf/ibtida  | yes (v. 72–78, 104–105)   | ch. 10      | **absent**                 |
| Rasm notes   | yes (v. 79–92)            | ch. 3, 6    | **absent**                 |
| Qalqalah     | inside sifat only (v. 23) | ch. 7       | **absent**                 |

A modern work following the al-Jazariyya shape closely: _al-Rawḍa al-Nadīyya fī
Sharḥ Matn al-Jazariyya_ (https://quranonlinelibrary.com/kutub-library/alrawdat-alnadiat-sharah-matn-aljizria).

**Implication for a staged course:** the 5–6 section structure in the brief is a
_pedagogical_ compression, not a scholarly taxonomy. It is defensible as a
teaching scaffold, but it must be labelled as the app's own scaffold, never
cited to a matn.

---

## 2. Q2 — Per-rule definitions, with sources

Every claim here is anchored to a matn line. Line numbers are the `ghunna`
canonical targets (https://ghunna.com/sources), which transcribe Arabic
Wikisource (CC BY-SA) — so they are citable _and_ openly licensed.

### 2.1 The ahkām of nūn sākinah / tanwīn — **CONTESTED: 3, 4, 5, or 6**

The count dispute is not folklore. It appears **in a footnote to the matn
itself**, in a published edition of Tuhfat al-Atfal:

> _«يعنى أن النون الساكنة والتنوين لهما بالنسبة لما يقع بعدهما من الحروف أربعة
> أحوال: الإظهار والإدغام والإقلاب والإخفاء بجعل قسمي الإدغام قسمًا واحدًا
> وإلا فهي خمسة وجعلها الجعبري ثلاثة فأسقط الإقلاب وأدخله في الإخفاء…»_

— footnote (2) to verse 6, in the Shamela edition of _Tuhfat al-Atfal_
(https://shamela.ws/book/9632/2), also at https://read.shamela.ws/book/9632/2

The full map of the dispute, from **Ghanim Quduri al-Hamad, _al-Dirāsāt
al-Ṣawtiyya 'inda 'ulamā' al-Tajwid_** (a modern academic study), p. 361
(https://ablibrary.net/book_content/b/8309/361), citing al-Baqri (d. 1111/1699):

| Count | Who                                                                             | How the count is arrived at                                                           |
| ----- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **6** | **Makki ibn Abi Talib** (d. 437/1045)                                           | idgham split three ways: into lām/rāʾ, into nūn/mīm, into yāʾ/wāw                     |
| **5** | (unnamed; via Ibn al-Jazari, _al-Tamhid_ 52–53)                                 | idgham split two ways: _kāmil_ bi-lā ghunnah (lām, rāʾ) and _nāqiṣ_ bi-ghunnah (rest) |
| **4** | **the majority**; al-Dani, Ibn al-Badhish, al-ʿAṭṭar, Ibn al-Jazari             | idgham left as one, covering both                                                     |
| **3** | **al-Jaʿbarī** (d. 732/1331), per Zakariyya al-Ansari, _Taḥfat Nijābā' al-ʿAṣr_ | iqlab dropped and folded into ikhfāʾ                                                  |

al-Baqri's own summary, quoted in that study: _«إن بعض العلماء جعل للنون
والتنوين أحكاما خمسة، وبعضهم جعلها أربعة، وبعضهم جعلها ثلاثة، والأمر في ذلك
سهل»_ — "some made them five, some four, some three, and the matter in that is
easy."

> **Tuhfat al-Atfal's own position:** **4**, stated in the verse itself —
> v. 6, _لِلْـنُّـونِ إِنْ تَسْـكُـنْ وَلِلتَّنْـوِيـنِ / أَرْبَـعُ أَحْكَـامٍ فَـخُذْ تَبْيِيـنِي_
> ("for nūn sākinah and tanwīn there are **four** rulings — take them clearly").

**Scope of the four, from Tuhfat al-Atfal (lines 7–16):**

| #   | Rule                          | Arabic  | Letters                                                                             | Lines |
| --- | ----------------------------- | ------- | ----------------------------------------------------------------------------------- | ----- |
| 1   | izhār (ṣifawī / ḥalqī)        | الإظهار | 6: ء هـ ع ح غ خ (throat letters)                                                    | 7–8   |
| 2   | idghām, **two** sub-divisions | الإدغام | 6: ي ر م ل و ن (يرملون) — bi-ghunnah in ينمو (ي ن م و), bi-lā ghunnah in ل ر        | 9–12  |
| 3   | iqlāb                         | الإقلاب | 1: ب                                                                                | 13    |
| 4   | ikhfāʾ                        | الإخفاء | **15**, mnemonic line 16: صف ذا ثنا كم جاد شخص قد سما · دم طيباً زد في تقى ضع ظالما | 14–16 |

Notes that matter for the app:

- Line 11, _إِلَّا إِذَا كَانَا بِكَلْمَةٍ فَلَا تُدْغَمْ كَدُنْيَا ثُمَّ صِنْوَانٍ تَلَا_
  — the exception for **دنيا / صنوان**: no idghām across a word boundary when
  the letters are dāl-nūn / ṣād-wāw-nūn. The app's classifier handles dunya-type
  boundaries; this line is the citation for it.
- The izhār set is contested at the margin: al-Jazari's note records Abū Jaʿfar
  reading **غ and خ** as ikhfāʾ, the rest as izhār
  (https://exa.ai/library/publication/s4ydzqyk1cv, summarising _al-Tashīl_).

**2-vs-4 split as the app currently models it.** The app has `idgham_ghunnah`,
`idgham_no_ghunnah`, `idgham_shafawi` — i.e. the **5-rule** taxonomy, and adds
`izhar_shafawi` and `ikhfa_shafawi` as separately-coloured rules. That is a
**6-rule-in-practice** hybrid: 4 noon + 3 meem, with idgham already split. This
is a defensible pedagogical choice but it is the app's own, and must be labelled
as such — it matches no single matn.

### 2.2 The three ahkām of mīm sākinah — **VERIFIED, no dispute found**

Tuhfat al-Atfal v. 19, _أَحْكَامُهَا ثَلاَثَةٌ لِمَنْ ضَبْطْ / إِخْفَاءٌ ادْغَامٌ
وَإِظْهَارٌ فَقَطْ_ — **three**: ikhfāʾ, idghām, izhār.

| Rule                             | Arabic                  | Trigger                             | Line |
| -------------------------------- | ----------------------- | ----------------------------------- | ---- |
| ikhfāʾ shafawī                   | الإخفاء الشفوي          | mīm sākinah + ب                     | 20   |
| idghām shafawī (mithlayn ṣaghīr) | إدغام صغير / مثلين صغير | mīm sākinah + mīm                   | 21   |
| izhār shafawī                    | الإظهار الشفوي          | mīm sākinah + all remaining letters | 22   |

The "trap" pair is explicit at line 23: _وَاحْذَرْ لَدَى وَاوٍ وَفَا أَنْ تَخْتَفِي
/ لِقُرْبِهَا وَلَا تَحَادِ فَاعْرِفِ_ — beware mīm sākinah before **wāw** and
**fā**; because of their proximity it may be hidden (_ikhfāʾ mushākilih_).
Both are izhār by the letter set but are the classic error sites — ideal drill
material, and already in the app's pool.

### 2.3 Lām rules — **VERIFIED**

Tuhfat al-Atfal lines 24–29 gives both, and it is the reason the beginner matn
carries a lām chapter at all:

| Rule            | Arabic        | Trigger                                                                                                                                                                | Lines     |
| --------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| lām shamsiyyah  | اللام الشمسية | lām of _al-_ before a **sun** letter (line 25: 14 letters, mnemonic line 27: طِبْ ثُمَّ صِلْ رُحْمًا تَفُزْ ضِفْ ذَا نِعْمَ دَعْ سُوءَ ظَنٍّ زُرْ شَرِيفًا لِلْكَرَمِ) | 25, 27–28 |
| lām of the verb | لام الفعل     | lām not preceded by _al-_, shown: قُلْ نَعَمْ وَقُلْنَا وَالْتَقَى                                                                                                     | 29        |
| lām qamariyyah  | اللام القمرية | the lām of _al-_ before a **moon** letter — named but not separately ruled (line 28)                                                                                   | 28        |

Tafkhīm of the lām of the divine name is **not** in Tuhfat al-Atfal. It is in
al-Jazariyya v. 43, _وَفَخِّمِ اللَّامَ مِنِ اسْمِ «اللَّهِ» / عَنْ فَتْحٍ أَوْ ضَمٍّ
كَـ «عَبْدُ اللَّهِ»_. That is the citation for the app's `tafkhim` rule.

### 2.4 Madd — **the count is genuinely unstable. Treat with care.**

Tuhfat al-Atfal's framework (v. 42): _لِلْمَدِّ أَحْكَامٌ ثَلاَثَةٌ تَدُومْ / وَهْيَ
الْوُجُوبُ وَالْجَوَازُ وَاللُّزُومْ_ — three ahkām: **wājib, jāʾiz, lāzim**.

| Rule                     | Arabic                  | Tuhfat lines                                           | al-Jazariyya lines |
| ------------------------ | ----------------------- | ------------------------------------------------------ | ------------------ |
| madd ṭabīʿī / aṣlī       | المد الطبيعي/الأصلي     | 35–40 (letter set and conditions; _الين_ line 41)      | 68                 |
| madd wājib muttaṣil      | المد الواجب المتصل      | 43 (same word, hamzah after)                           | 70                 |
| madd jāʾiz munfaṣil      | المد الجائز المنفصل     | 44 (word boundary, hamzah after)                       | 71                 |
| madd ʿāriḍ li-l-sukūn    | المد العارض للسكون      | 45 (sukun from waqf)                                   | 71                 |
| madd badal               | مد البدل                | 46 (hamzah before the madd letter: آمَنُوا، إِيمَاناً) | —                  |
| madd lāzim               | المد اللازم             | 47–55                                                  | 69                 |
| madd ʿiwāḍ               | مد العوض                | **absent from Tuhfat al-Atfal**                        | **absent**         |
| madd ṣilah / ṣilah kubrā | مد الصلة / الصلة الكبرى | **absent from Tuhfat al-Atfal**                        | **absent**         |

**madd lāzim: 4, not 6.** Tuhfat al-Atfal v. 48, _أَقْسَامُ لاَزِمٍ لَدَيهم أَرْبَـعَـةْ
/ وَتِلْـكَ كِـلْمِـيُّ وَحَرْفِـيٌّ مَعَـهْ_ — **four**, from two binary splits:

| Type                   | Arabic         | Split                                 | Lines        |
| ---------------------- | -------------- | ------------------------------------- | ------------ |
| lāzim kalīmī muthaqqal | لازم كلمي مثقل | in a word · shaddah follows           | 50, 52       |
| lāzim kalīmī mukhaffaf | لازم كلمي مخفف | in a word · plain sukun               | 49–50, 52    |
| lāzim ḥarfī muthaqqal  | لازم حرفي مثقل | in a muqaṭṭaʿ letter · idghām follows | 51–52, 53–54 |
| lāzim ḥarfī mukhaffaf  | لازم حرفي مخفف | in a muqaṭṭaʿ letter · no idghām      | 51–52, 53–54 |

The eight ḥarfī letters are given at line 54, _يَجْمَعُهَا حُرُوفُ كَمْ عَسَلْ نَقَصْ_
→ **ك م ع س ل ق ص ن** (_naqasa ʿasalukum_). Line 55 excludes alif (natural madd
only). Lines 56–57 add the **five** letters read with only natural madd,
_لَفْظِ حَيٍّ طَاهِرٍ قَدِ انْحَصَـرْ_ → **ح ي ط ه ر** (_ḥayy ṭāhir_), and collect all
**14** muqaṭṭaʿ letters as _سَحْيْراً مَنْ قَطَعْكَ ذَا اشْـتَهَـرْ_.

The **6-type** figure in the brief is a modern aggregation: the four lāzim
types **plus** madd ʿiwāḍ **plus** madd ṣilah. I found **no matn** presenting six
lāzim types. `madd_iwad` and `madd_silah` are therefore in the app as separate
rule-slot citizens without a matn citation. Honest options: (a) cite a modern
textbook that counts six and name it; (b) present them as an extension, flagged.
**Do not silently present "6" as classical.**

**Durations — CONTESTED and app-critical.** The app's `madd_246` rule name
encodes 2/4/6.

- _ʿāriḍ li-l-sukūn_ = 2, 4 or 6 (mukhtār).
- _muttaṣil_ and _munfaṣil_ = "4/5 counts" in Hāfiʿ ʿan ʿĀṣim — **not** 4 or 6.
  Source: https://alajran.wordpress.com/mudood/ and corroborated by
  _Children's tajweed curriculum part 1_ (McNet Schools, Ontario),
  https://schools.macnet.ca/alotrojah/wp-content/uploads/sites/10/2019/10/11-Madd-L2A-E.pdf
  which states plainly: _"A- Compulsory madd: it is applied only to the Madd
  Muttasil… B- Permissible madd: this pertains to madd munfasil, madd ʿarid
  lil-ukun… and madd badal… C- Absolutely necessary madd: this only concerns the
  madd lazim."_
  → **lāzim = 6; muttaṣil = 4/5; munfaṣil = 4/5 (wasl) or 2 (waqf); ʿāriḍ =
  2/4/6; badal = 2.** The app's `madd_246` label appears to mean the _ʿāriḍ_-
  family 2/4/6, which is right, but it sits next to `madd_6` for lāzim in a way
  that invites misreading. **Flag for review.**
- Rank order strongest→weakest: lāzim > muttaṣil > ʿāriḍ > munfaṣil > badal
  (https://surahquran.com/Tajweed/almodood-en.html).
- **Two named exceptions inside lāzim** — critical, and a perfect drill set:
  - **ʿayn** in _كهيعص_ (Maryam 19:1) and _عسق_ (Shura 42:2): 4 or 6, six
    preferred. Tuhfat al-Atfal v. 54, _وَعَيْنُ ذُو وَجْهَـيْنِ وَالطُّولُ أَخَصْ_
    — "ʿayn has two faces, and the longer is more specific."
  - **mīm** in _الْم_ at Āl ʿImrān 3:1, in wasl: 6 or 2. See the McNet curriculum
    PDF above.
  - **madd lāzim kalīmī mukhaffaf** occurs in the whole Qurʾān in **one** word,
    **آلْآنَ** in Yūnus 10:51, **twice** (same source).

### 2.5 Madd 'iwāḍ and madd ṣilah — **UNVERIFIED in any matn**

Neither appears in Tuhfat al-Atfal or al-Jazariyya. They are transmitted in
commentary and in later manuals. One enumerating manual I did verify:
_Maḥkām al-Madd wa-l-Qaṣr ʿinda al-Qurrāʾ al-Sabʿa_ (via
https://www.islamarchive.cc/ketab_content/96527/p-5), which lists under
**al-madd al-farʿī**: مد البدل، المد اللازم، المد العارض للسكون، مد اللين
العارض للسكون، مد التعظيم — and under **al-jawāz** (eight types): المد المنفصل،
والمد العارض للإدغام، والمد العارض للوقف، ونقل حركة الهمزة، ومد البدل، ومد
اللين، **مد الصلة**، **مد الروم**.

That manual also uses a _different_ top-level split: **al-wājib** = muttaṣil
only; **al-jawāz** = eight types; **al-lazūm** = kalīmī/ḥarfī ×
muthaqqal/mukhaffaf. Under that taxonomy, muttaṣil is _wājib_ and
lāzim is _lazūm_ — the opposite of al-Jazariyya's own placement, where v. 68–69
lists _لازم وواجب وجائز وقصر_ in one breath and v. 69 defines lāzim
(_فَلَازِمٌ إِنْ جَاءَ بَعْدَ حَرْفِ مَدٍ سَاكِنٍ حَالَيْنِ وَبِالطُّولِ يُمَدُّ_).
**This is a real taxonomy conflict and the app must not pick a side silently.**

### 2.6 Qalqalah — **5 letters, near-unanimous. The "6" is traceable.**

**VERIFIED: 5 letters**, the mnemonic **قُطْبُ جَدٍ** (_quṭba jad_), al-Jazariyya
v. 23. Source: https://surahquran.com/Tajweed/qalqalah.html

| #   | Letter | Name |
| --- | ------ | ---- |
| 1   | ق      | qāf  |
| 2   | ط      | ṭāʾ  |
| 3   | ب      | bāʾ  |
| 4   | ج      | jīm  |
| 5   | د      | dāl  |

Cause, stated consistently: qalqalah letters are the only ones that combine
**jahr** + **shiddah** — jahr blocks the breath, shiddah blocks the voice, so
an audible "naqra" is needed (https://mawdoo3.com/تعريف_القلقلة;
https://www.ksaency.com/article/ما-هي-حروف-القلقلة).

**The 6-letter claim is traceable to specific named additions.** The Saudi
Encyclopedia (Ministry of Awqaf) states: _«اتفق أغلب العلماء على أن حروف
القلقلة خمسة حروف مجموعة في قول: "قُطْبُ جَدٍ"، وأضاف بعض أهل العلم الهمزة إلى
هذه الحروف الخمسة… ولكن جمهور أهل العلم لم يذكر الهمزة من حروف القلقة لأنَّ
الهمزة تُخفَّف عند السكون. وقد ذكر سيبويه أيضًا أنَّ حرف التاء يعتبر حرف
قلقلة… وأضاف المبرد حرف الكاف وجعله حرف قلقلة»_
(https://www.ksaency.com/article/ما-هي-حروف-القلقلة).

So the expansion history is: **al-Jaʿbarī add hamzah; al-Sibawayh add tāʾ;
al-Mubarrad add kāf** — and the majority refuse all three. **A 6-letter list
exists and is attributable; 5 is the standard.** Ship 5, name the others.

**Marātib (grades): CONFLICTED 2 / 3 / 4.**

| Scheme | Grades                                                                                                   | Source                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 2      | kubrā (waqf) / sughrā (mid-word)                                                                         | current Levantine practice; argued from al-Jazariyya v. 38 by one camp — https://mtafsir.net/threads/5049/ |
| 3      | kubrā / wuṣṭā / sughrā                                                                                   | https://mawdoo3.com/القلقلة_الكبرى_والصغرى ; https://masba7a.com/b/حكم-القلقلة                             |
| 4      | kubrā (waqf + shaddah) / wuṣṭā (waqf, no shaddah) / sughrā (mid-word sukūn) / aṣghar (**moving** letter) | al-Marʿashī / _Nihāyat al-Qawl al-Mufīd_, per https://www.noormags.ir/view/fa/articlepage/2516361          |

The 4-grade scheme's claim — that qalqalah is a _lāzimah_ (inalienable) ṣifah
present even on a moving letter, only weaker — is argued from
https://mtafsir.net/threads/5049/ citing al-Marʿashī, _Jahr al-Muqlaʿ_ p. 149 and
Muḥammad Makkī Naṣr, _Nihāyat al-Qawl al-Mufīd_ p. 55. The arguing party is
explicit that the disagreement _"لا يترتب عليه تغييرٌ في الصوت القرآني"_ — it does
not change the recited sound. **That is why this is safe to teach as a
difference of opinion.**

**Intensity order — CONTESTED.** https://mawdoo3.com gives ṭāʾ highest, **jīm**
middle, qāf/bāʾ/dāl lowest. https://mumenah.com citing al-Marʿashī gives ṭāʾ
highest, **qāf** middle, jīm/bāʾ/dāl lowest. Jīm and qāf are swapped.
**Unresolved; do not ship an intensity ranking.**

### 2.7 Hamzat al-waṣl / al-qaṭʿ — **VERIFIED, from Ibn al-Jazari's own chapter**

al-Jazariyya v. 100–103, his dedicated chapter _باب الابتداء بهمزة الوصل_:

> **100** وَابْدَأْ بِهِمْزِ الوَصْلِ مِنْ فَعْلٍ بِضَمٍّ / إِنْ كَانَ ثَالِثُ مِنَ الْفِعْلِ يَضُمُّ
> **101** وَاكْسِرْهُ حَالَ الْكَسْرِ وَالْفَتْحِ وَفِي / ابْنِ مَعَ ابْنَةِ امْرِئٍ وَاثْنَيْنِ
> **102** وَامْرَأَةٍ وَاسْمٍ مَعَ اثْنَتَيْنِ
> **103** وَحَاذِرِ الْوَقْفَ بِكُلِّ الْحَرَكَةِ / إِلَّا إِذَا رُمْتَ فَبَعْضُ حَرَكَةٍ

Plus al-Jazariyya v. 8, which states the _reason_ for the rule — the
orthographic one, and the most useful teaching sentence in the whole chapter:
_مِنْ كُلِّ مَقْطُوعٍ وَمَوْصُولٍ بِهَا / وَتَاءِ أُنْثَى لَمْ تَكُنْ تُكْتَبْ بِـ «هَا»_
— the letter is written because the scribes set a stop at every letter, and it is
pronounced because you begin with it.

The prose rules, from _al-Tamhid_ ch. 5 (https://shamela.ws/book/8194) and
Ibn Jinni's _Sirr Ṣanʿat al-Iʿrāb_ (via https://shamela.ws/book/18273/560):

| Class                                                  | Arabic                | Note                                       |
| ------------------------------------------------------ | --------------------- | ------------------------------------------ |
| lām of _al-_                                           | لام التعريف           | all                                        |
| verbal nouns of 5th/6th-**radical** verbs              | مصدر الخماسي والسداسي | —                                          |
| imperative of 3-radical verbs with sākin middle letter | أمر الثلاثي           | —                                          |
| proper nouns                                           | الأسماء السماعية      | **10**, of which **7** occur in the Qurʾān |
| 5th/6th-radical past & imperative                      | الماضي والأمر         | —                                          |
| **not** in: any mudāriʿ verb, or a 3-radical past verb | —                     | —                                          |

The **ten** proper nouns, and the **seven** that occur in the Qurʾān — exact and
checkable, and a first-rate drill set:

| #   | Noun               | Arabic          | In Qurʾān | Example                                     |
| --- | ------------------ | --------------- | --------- | ------------------------------------------- |
| 1   | ism                | اسم             | ✔         | Al-Aʿlā 96:1 وَاذْكُرُوا اسْمَ اللَّهِ      |
| 2   | ist                | است             | ✘         | —                                           |
| 3   | ibn                | ابن             | ✔         | Maryam 34:6 إِيسَى ابْنَ مَرْيَمَ           |
| 4   | ibna               | ابنة            | ✔         | Āl ʿImrān 3:45 وَمَرْيَمَ ابْنَتَ عِمْرَانَ |
| 5   | ibnim              | ابنم            | ✘         | —                                           |
| 6   | amr                | امرؤ            | ✔         | An-Nisāʾ 4:176 إِنَّ امْرُؤًا هَلَكَ        |
| 7   | imraʾa             | امرأة           | ✔         | Yusuf 30:30 وَإِنْ أَمْرَأَةً خَافَتْ       |
| 8   | ithnān             | اثنان           | ✔         | An-Naḥl 16:144 ثَانِيَ اثْنَيْنِ            |
| 9   | ithnatān           | اثنتان          | ✔         | Al-Baqarah 2:60 لَدَوَابَّتٍ أَثْنَتَيْنِ   |
| 10  | ayyimun / īm Allāh | ايمن / ايم الله | ✘         | —                                           |

Source for the ten/seven: _al-Tashīl_ commentary in
https://ftp.shamela.ws/book/22869/438 (باب الخامس عشر في همزتي الوصل والقطع) —
"الأسماء السبعة التي في القرآن الكريم…" with all seven quoted; and
https://alsunniah.com/book/6371/14 (_al-Wajīz fī ʿilm al-Tajwid_) which states
_"ولم يرد منها في القرآن الكريم إلا سبعة"_.

**The ārif-khanīyya complication (and a real trap).** _Ism_ is a connective
proper noun, yet at 49:11 _بِئْسَ الْاسْمُ الْفُسُوقُ_ it is read as
**qaṭʿ** (_al-ismu_) or as **waṣl** (_al-smu_).
Source: https://surahquran.com/Tajweed/hamzat-alwasl.html — _"يجوز الابتداء
بالهمزة فتقرأ (أَلِسْمُ) ويجوز الابتداء باللام فتُقرأ (لِسْمُ)"_. The same page
notes the istifhāma/ittisāl pair: _قُلْ آللَّهُ أَذِنَ_ (Yūnus 10:59) and
_أَأَعْجَمِيٌّ وَعَرَبِيٌّ_ (Fusṭilat 44:44). This is exactly the kind of thing a
classifier gets wrong and a lesson should catch.

**Definitions, cleanly:**

- **hamzat al-waṣl** — the hamzah that is _pronounced_ when you begin the word
  and _dropped_ when you connect it to what precedes. _«هي التي تثبت في
  الابتداء وتسقط في حالة الوصل»_ (https://alukah.net/sharia/0/71507).
  Four notes on the name's etymology are collected at
  https://shamela.ws/book/16826/3718: _«قيل: اتساعًا، وقيل: لأنها تسقط فيتصل ما
  قبلها بما بعدها وهذا قول الكوفيين، وقيل: لوصول المتكلم بها إلى النطق بالساكن،
  وهذا قول البصريين وكان الخليل يسميها: سُلَّم اللسان»_.
- **hamzat al-qaṭʿ** — the hamzah pronounced in both positions, cutting the
  word from what precedes. _«هي التي ينقطع باللفظ بها ما قبلها عما بعدها»_
  (Ibn Jinni, via https://shamela.ws/book/18273/560).

---

## 3. Q3 — Makharij: how 17 / 16 / 14 arise

### 3.1 The division of labour — **VERIFIED**

Primary source, in Ibn al-Jazari's own words, _al-Tamhid_ ch. 8
(https://alsunniah.com/book/2678/22):

> _«مخارج الحروف عند الخليل سبعة عشر مخرجاً. وعند سيبويه وأصحابه ستة عشر،
> لإسقاطهم الجوفية. وعند الفراء وتابعيه أربعة عشر، لجعلهم مخرج الذلقية واحداً.»_

Independently corroborated by **Ibn Jinni**, _Sirr Ṣanʿat al-Iʿrāb_, in a
scholarly footnote that spells out the redistribution mechanism
(https://ablibrary.net/book_content/b/11490/61):

> _«قال سيبويه: إنها ستة عشر، فأسقط مخرج الجوف، ووزع حروفه على بقية
> المخارج، فجعل الألف من الحلق، والياء من وسط اللسان، والواو من الشفتين،
> وتابعه على ذلك كثير منهم الشاطبي. وذهب قطرب والجرمي والفراء ومن تبعهم إلى
> أنها أربعة عشر مخرجا، فأسقطوا الجوف كما فعل سيبويه، وجعلوا مخارج اللسان
> ثمانية، لأنهم جعلوا اللام والنون والراء من مخرج واحد.»_

| Count  | Attributed to                                                                | Mechanism                                         | What changes                                                  |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| **17** | **Khalīl ibn Aḥmad al-Farāhīdī** (d. 170/786) → adopted by **Ibn al-Jazārī** | _al-jawf_ kept as a real makhraj                  | lisan 10, ḥalq 3, shafatān 2, khaysum 1, jawf 1               |
| **16** | **al-Sibawayh** (d. 180/796) and **al-Shāṭibī**, with followers              | _al-jawf_ deleted, its 3 letters redistributed    | alif → ḥalq; yā → mid-tongue; wāw → shafatān. Tongue stays 10 |
| **14** | **al-Farrāʾ**, **Qutrub**, **al-Jarmī**, **Ibn Kayyān**                      | _al-jawf_ deleted **and** the _dhulqiyyah_ merged | **lām, nūn, rāʾ share one makhraj**; tongue drops 10 → 8      |

Al-Jazariyya v. 9 states his own choice: _مَخَارِجُ الْحُرُوفِ سَبْعَةَ عَشَرْ /
عَلَى الَّذِي يَخْتَارُهُ مَنِ اخْتَبَرْ_ — "seventeen, on the view of whoever has
tested it," i.e. following al-Khalīl. A commentary glosses the criterion: _«أهل
المعرفة بالأحكام والمخارج كالخليل بن أحمد»_
(https://alsunniah.com/book/6359/100).

### 3.2 The 17-point table — **VERIFIED**, Egyptian Ministry of Awqaf

Source: https://awkafonline.gov.eg/content-sections/116/4991/مخارج-الحروف
(_«والمختار ما ذهب إليه الجمهور، وهو أن المخارج سبعة عشر مخرجًا، منحصرة في
خمسة مخارج عامة»_). Corroborated by an English teaching table at
https://recitewithlove.com/wp-content/uploads/2015/12/chapter-3-makharij-ul-huroof-with-logo.pdf

| General                 | #   | Specific                                          | Letters                             |
| ----------------------- | --- | ------------------------------------------------- | ----------------------------------- |
| **al-jawf** الجوف       | 1   | the cavity                                        | ا و ي (the three _hurūf al-maddah_) |
| **al-ḥalq** الحلق       | 2   | furthest (aqṣā)                                   | ء ه                                 |
|                         | 3   | middle (wasiṭ)                                    | ع ح                                 |
|                         | 4   | nearest (adnā)                                    | غ خ                                 |
| **al-lisān** اللسان     | 5   | tip, with the soft palate                         | ق                                   |
|                         | 6   | just below, with the hard palate                  | ك                                   |
|                         | 7   | middle, with the hard palate                      | ج ش ي                               |
|                         | 8   | one side of the tip, against the upper molars     | ض                                   |
|                         | 9   | nearest point of the tip to its end               | ل                                   |
|                         | 10  | tip, under the lām's makhraj, with the upper gums | ن                                   |
|                         | 11  | tip drawn in, with the upper gums                 | ر                                   |
|                         | 12  | tip with the roots of the upper incisors          | ط د ت                               |
|                         | 13  | tip with the lower incisors                       | ص س ز                               |
|                         | 14  | tip with the ends of the upper incisors           | ظ ذ ث                               |
| **al-shafatān** الشفتان | 15  | inner lower lip with the upper incisors           | ف                                   |
|                         | 16  | both lips                                         | ب م و (non-maddah)                  |
| **al-khaysum** الخيشوم  | 17  | the nasal cavity                                  | the ghunnah of ن and م              |

Note the Egyptian Ministry of Awqaf adds a nuance the standard lists omit: the
lām of the divine name is also a maddah, out of the cavity, _as an ease in
pronouncing it_.

An alphabetical letter-by-letter table (29 rows) is at
https://www.qurankarim.org/books/contentsimages/htmlfiles/kafi(3)-tajweed/kafi(3)-02.html
(_الميسر لأحكام التجويد_, Jamʿiyyat al-Qurʾān al-Karīm, Beirut, 1st ed. 1432/2011).

**The 10 epithets (al-aqlāb)** — Ibn al-Jazari, _al-Tamhid_ ch. 7, quoted at
https://zdnyilma.com/2015/11/34.html from _al-Tamhid_ 1/83–86. Include these;
they are the cleanest memory device and are the nearest verified thing to the
"al-muhall / al-muthaqilah / al-mudhafah" terms in the brief:

1. ḥalqiyyah (6) ء هـ ح ع غ خ · 2. lahwiyyah (2) ق ك · 3. shajariyyah (3) ج ش ض ·
2. asliyyah (3) ص س ز · 5. naṭʿiyyah (3) ط د ت · 6. lithawiyyah (3) ظ ذ ث ·
3. dhulqiyyah (3) ر ل ن · 8. shafawiyyah (3) ف ب م · 9. jawfiyyah (3) و ا ي ·
4. hawāʾiyyah = the jawfiyyah, repeated.

That same page carries a scholarly caveat worth shipping: the attribution of
these terms to al-Khalīl is disputed — _«قطع الدكتور إبراهيم أنيس أن نسبة هذه
المصطلحات (ذلقية وأسلية… إلخ) إلى الخليل نسبة غير صحيحة…[citing] أصولية علم
الأصوات عند الخليل من خلال كتاب العين، أحمد محمد قدور»_, and they are more
likely Ibn Jinnī's. **Surface it; do not resolve it.**

### 3.3 Ghunnah articulation points — **the 15/16 premise needs correcting**

- **Ghunnah has exactly ONE articulation point: al-khaysum.** Not 15, not 16.
  al-Jazariyya v. 19, the last line of the makharij chapter:
  _وَغُنَّةٌ: مَخْرَجُهَا الخَيْشُومُ_ — "and ghunnah: its articulation point is the
  nasal cavity." Al-Tamhid ch. 8 numbers it: _«والغنة من الخيشوم من داخل الأنف،
  **هذا السادس عشر**. وأحرف المد من جو الفم وهو السابع عشر»_.
- **Where 15 comes from:** the number of **ikhfāʾ** letters. Tuhfat al-Atfal
  v. 15, _فِي خَمْسَةٍ مِنْ بَعْدِ عَشْرٍ رَمْزُهَا_ — "in five after ten," = 15,
  with the mnemonic at v. 16. And Ibn al-Jazari's _al-Tamhid_:
  _«أن مخرج النون والتنوين مع حروف الإخفاء الخمسة عشر من الخيشوم فقط ولا حظ
  لهما معه في الفم»_ — the makhraj of nūn/tanwīn _with the 15 ikhfāʾ letters_ is
  al-khaysum alone, and they have no share in the mouth with them. Collected with
  sources at https://saaid.org/daeyat/omjalal/1.htm
- **Where 16 plausibly comes from:** the al-Tamhid enumeration above, which
  numbers al-khaysum the 16th and al-jawf the 17th. **This is my inference from
  the numbering, not a sourced claim that "ghunnah has 16 points."** Mark
  UNVERIFIED.
- **Ghunnah's actual disputed count — marātib, 3 or 5**, not 15/16. Per
  https://exa.ai/library/publication/dgpct3sxsjp: _«فقال فريق منهم: إنها ثلاث
  مراتب: المشدد، والمدغم بالغنة الناقص، والمخفي. وقال جمهور العلماء إنها خمس
  مراتب: المشددة، الساكن المظهر، المتحرك المخفيف. وهذا هو العمل عليه»_ —
  3 (mushaddad / idghām bi-ghunnah nāqiṣ / mukhfī) or 5 (adding the
  mushaddadah / sākin muẓhar / mutaharrik mukhaffaf). **The majority is 5.**
- **A genuine open question worth flagging:** whether the nasal _quality_ belongs
  to the _ṣifah_ ghunnah or to the _ḥarf_. The _al-Tashīl_ commentary
  (https://saaid.org/daeyat/omjalal/1.htm) lays out both positions with sources
  and reconciles them: al-Marʿashī, _«الخيشوم..يخرج منه النون المخفاة»_; al-Ḍabbāʿ,
  _Minḥat Dhī al-Jalāl_: _«منه النون والميم الساكنتان حالة الإخفاء، أو ما في
  حكمه من الإدغام بالغنة، وهي أيضًا مقر الغنة»_. This is precisely the
  distinction that decides whether the app colours _nūn_ or _ghunnah_ — and the
  answer is that the printed mushaf colours the **letter carrying** the ghunnah.
  That is a real design decision, currently unrecorded in the app.

---

## 4. Q4 — Sifaat

### 4.1 The four-way division in the brief is not a standard taxonomy — correcting it

**`sifat al-muhall` / `al-muthaqilah` / `al-mudhafah` are UNVERIFIED.** I found
no published tajweed taxonomy using those terms. What I _did_ verify, as the
standard divisions of ṣifāt:

| Division                        | Arabic             | Contents                                                                                                 | Source                                                                                   |
| ------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **inalienable vs accidental**   | ذاتية / عرضية      | dhātīyah: never leave the letter (hams, shiddah…). ʿarḍiyyah: come and go — **tafkhīm / tarqīq** for rāʾ | _al-ʿAmīd fī ʿilm al-Tajwid_, https://alsunniah.com/book/4355/143                        |
| **with an opposite / without**  | لها ضد / لا ضد لها | 10 + 7 = **17**                                                                                          | _al-Jazariyya_ v. 19–26; _Fatḥ al-Aqāl_, https://alsunniah.com/book/21572/4              |
| **strong / weak / middling**    | قوة / ضعف / توسُّط | 12 / 12 / 5 (see the wiki table)                                                                         | _Tārīkh Ādāb al-ʿArab_, Hindawi Foundation, https://www.hindawi.org/books/70629206/1.14/ |
| **epithets vs characteristics** | ألقاب / صفات       | Ibn al-Jazari treats these as **two different chapters** (7 and 7)                                       | _al-Tamhid_ ch. 7                                                                        |

The nearest thing to what may have been meant is the **10 ألقاب** in §3.2 above
— which are _epithets_, not characteristics, and which Ibn al-Jazari keeps
separate. If "al-muhall / al-muthaqilah / al-mudhafah" came from a specific
teacher or book, that citation is needed before the terms can go near the app.
**Until then they are UNVERIFIED and must not appear.**

`ṣifāt al-manṭiq` **is** a real term (the 17-characteristic table is the
instrument used to _construct_ rules), but I found no published source using it
as a fourth parallel division alongside the three terms above.

### 4.2 The count: 14 / 15 / 17 / 18 / 20 / 44 — **CONTESTED**

| Count  | Who                                                | How                                                           | Source                                          |
| ------ | -------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| **14** | **al-Barkawī**                                     | drops idhlāq, ḍhalāqah, layyin, inhirāf; **adds ghunnah**     | _al-Wajīz_, https://shamela.ws/book/5464/11     |
| **15** | (some)                                             | drops al-iṣmāt, al-idhlāq, al-layyin                          | _al-ʿAmīd_, https://alsunniah.com/book/4355/143 |
| **17** | **Ibn al-Jazārī** (as counted by _al-Wajīz_)       | 10 + 7                                                        | https://shamela.ws/book/5464/11                 |
| **18** | **Ibn al-Jazārī and the majority**, per _al-ʿAmīd_ | 18, counting **al-tawassuṭ** (بَيْنَ بَيْنَ) as its own ṣifah | https://alsunniah.com/book/4355/143             |
| **20** | _Ghāyat al-Murīd_                                  | 18 + **al-khafāʾ** + **al-ghunnah** (adds two ṣifāt)          | https://alsunniah.com/book/21025/118            |
| **44** | **Makkī ibn Abī Ṭālib al-Qaysī** (d. 437/1045)     | adds many more                                                | https://shamela.ws/book/5464/11                 |

The 17-vs-18 crux, stated plainly in _Fatḥ al-Aqāl_ (https://alsunniah.com/book/21572/4):

> _«والحقيقة أن صفتي الإذلاق والإصمات لغويتان لا علاقة لهما بالنطق، وربّما
> ذكرهما الناظم هنا ضمن الصفات حتى يكون عدد الصفات سبع عشرة صفةً، مثل عدد
> مخارج الحروف التي هي سبعة عشر.»_

— "the two ṣifāt idhlāq and iṣmāt are linguistic, not articulatory; the poet
probably listed them among the ṣifāt so that the number of ṣifāt would be
seventeen, like the number of makharij." **Ibn al-Jazari chose 17 to mirror
the 17 makharij.** That is a numerological reason, and it is the honest
explanation to give a learner.

Both _al-Wajīz_ and _Ghāyat al-Murīd_ add **al-khafāʾ** and **al-ghunnah** as
genuine ṣifāt: _«الخفاء صفة لأربعة أحرف: حروف المد الثلاثة والهاء»_ (al-khafāʾ
is a ṣifah of the 3 madd letters and hāʾ), and ghunnah is a ṣifah inherent in
nūn and mīm in all states (https://ftp.shamela.ws/book/8633/114,
_Madkhal fī ʿUlūm al-Qirāʾāt_). **Adding those two gets you 19; adding
tawassuṭ gets you 20.**

### 4.3 The 17 ṣifāt, with letter counts — **VERIFIED**

Al-Jazariyya v. 19–26; tables at https://ar.wikipedia.org/wiki/صفة_حرف_(العربية)
and https://awkafonline.gov.eg/content-sections/116/4993/صفات-الحروف

**A. Ten with opposites (5 pairs):**

| Ṣifah        | Opposite             | Mnemonic                | Letters              | n                      |
| ------------ | -------------------- | ----------------------- | -------------------- | ---------------------- |
| **jahr**     | hams                 | —                       | all but the hams set | **19**                 |
| hams         | jahr                 | فَحَثَّهُ شَخْصٌ سَكَتْ | ف ح ث ه ش خ ص س ك ت  | **10**                 |
| **shiddah**  | rakhawah (+tawassuṭ) | أَجِدْ قُطٍ بَكَتْ      | ء ج د ق ط ب ك ت      | **8**                  |
| tawassuṭ     | —                    | لِنْ عُمَرْ             | ل ن ع م ر            | **5**                  |
| rakhawah     | shiddah              | (complement)            | —                    | **16**                 |
| **istiʿlāʾ** | istifāl              | خُصَّ ضَغْطٍ قِظْ       | خ ص ض غ ط ق ظ        | **7**                  |
| **iṭṭifāq**  | infiṭāḥ              | صَادَ ضَادَ طَاءَ ظَاء  | ص ض ط ظ              | **4**                  |
| **iṣmāt**    | idhlāq               | فَرَّ مِنْ لُبٍّ        | ف ر م ن ل ب          | **6** (the idhlāq set) |
| idhlāq       | iṣmāt                | —                       | remainder            | **23**                 |

**Count traps — read these before writing lesson copy:**

- **jahr is 19 or 18 depending on whether alif is counted.** The Ministry of Awqaf
  says _«عددها تسعة عشر حرفًا، وهي الباقية من حروف الهجاء بعد حروف الهمس
  العشرة»_ (10+19=29). _al-Wajīz_ says 18 and explains why:
  _«ولم نعد الألف من حروف الجهر؛ لأن حروف المد الثلاثة لا تتصف إلا بالخفاء»_
  — alif is excluded because the three madd letters are described only as
  _khafāʾ_, never _jahr_.
  **So: 28 letters → 10 hams + 18 jahr; 29 letters → 10 + 19.** The classic
  "how many letters are there" dispute (28 vs 29) is entangled with this one.
- **istiʿlāʾ's 7 letters are the tafkhīm letters** (خ ص ض غ ط ق ظ) — and
  _iṭṭifāq_'s 4 (ص ض ط ظ) are the strongest of them. This is the citation
  chain for the app's `tafkhim` rule, and it is the direct route from
  makharij+ṣifāt to the rule, which is pedagogically the right order.
- **shiddah is the _only_ ṣifah with two opposites** (shiddah / tawassuṭ /
  rakhawah) — flag it, it confuses learners.

**B. Seven without opposites:**

| Ṣifah                        | Mnemonic                            | Letters                     | Line  |
| ---------------------------- | ----------------------------------- | --------------------------- | ----- |
| **ṣifīr** (whistle)          | صَادٌ وَزَايٌ سِينُ                 | ص ز س                       | 24    |
| **qalqalah**                 | قُطْبُ جَدٍ                         | ق ط ب ج د                   | 23    |
| **layyin** (flexible)        | وَاوٌ وَيَاءٌ سُكِّنَا وَانْفَتَحَا | و ي (when sākinah + fatḥah) | 24–25 |
| **inḥirāf** (deflection)     | صُحِّحَا فِي اللَّامِ وَالرَّا      | ل ر                         | 25–26 |
| **takrīr** (doubling)        | بِتَكْرِيرٍ جُعِلْ                  | ر                           | 26    |
| **tafshī** (diffusion)       | لِلْتَّفَشِّي: الشِّينُ             | ش                           | 26    |
| **istiṭālah** (prolongation) | ضَاداً: اسْتَطِلْ                   | ض                           | 26    |

**Rāʾ is the only letter with seven ṣifāt** — result: _«صفاتُه سبع: الجهر،
التوسط، الاستفال، الانفتاح، الإذلاق، الانحراف، التكرير»_
(https://alsunniah.com/book/21572/4; https://alsunniah.com/book/3625/26
(_al-Rawḍa al-Nadīyya_)). Also: _«كل حرف له عدة صفات لا تقل عن خمس ولا تزيد
عن سبع»_ — **5 to 7, and rāʾ alone hits 7.** That is a lovely, checkable
invariant for a lesson exercise.

**Strong/weak, and 12 "strong" ṣifāt** — _Madkhal fī ʿUlūm al-Qirāʾāt_
(https://ftp.shamela.ws/book/8633/114): the 12 strong are jahr, shiddah,
istiʿlāʾ, iṭṭifāq, iṣmāt, ṣifīr, qalqalah, inḥirāf, takrīr, tafshī,
istiṭālah, **ghunnah**, ranked _أقواها: القلقلة، فالشدة، فالجهر، فالإطباق،
فالاستعلاء، فالباقي_. Note **qalqalah is the strongest ṣifah** — a striking and
citable teaching point that also connects back to §2.6.

### 4.4 The shaddah/fathah rule for counting ṣifāt — **VERIFIED, and it is a testable algorithm**

From _Fatḥ al-Aqāl_ (https://alsunniah.com/book/21572/4):

> _«اعلم أن كل حرف له عدة صفات لا تقل عن خمس ولا تزيد عن سبع… فإذا تصفحه في
> صفة الشدة فلم يجدها فيه ولا في صفة البينية، فحكم عليه بأنه رخو.»_

Run every letter through the 5 opposed ṣifāt (5 guaranteed), then through the 7
non-opposed ones (0–2 more). Worked example given there: bāʾ → **jahr, shiddah,
istifāl, infiṭāḥ, idhlāq, qalqalah** = 6. This is a deterministic procedure the
app could ship as a quiz with a cited answer key. It is the single best
"teaching layer" idea in this dossier.

---

## 5. Q5 — Colour: what is actually citable

Four distinct systems exist. **None of them is KFGQPC's.** Ranked by how
defensibly you can cite them:

### 5.1 LPMQ _Pedoman Tajwid Sistem Warna_ (2011) — **the best citable authority**

**Publisher:** Lajnah Pentashihan Mushaf al-Qurʾān (LPMQ), Badan Litbang dan
Diklat, Kementerian Agama Republik Indonesia. **Year:** 2011. **Full PDF:**
https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf
**Corroborating scholarship:** Harits Fadlly, _"Tajwid Warna dalam Mushaf
Al-Qur'an Standar Indonesia"_, SUHUF vol. 13 no. 2 (2020), LPMQ —
https://jurnalsuhuf.kemenag.go.id/suhuf/article/view/587 (PDF:
https://jurnalsuhuf.kemenag.go.id/suhuf/article/download/587/219)

Why this one is citable where others are not: it is an **official government
standard**, it is a **downloadable PDF**, it states exact **CMYK** values, and it
is **binding on publishers** in its jurisdiction. Its own preface (§1D, p. 4)
lists the drafting committee — 10 named members including Shaykh
Ahmad Jaeni, S.Th.I and Imam Mutaqien, S.Th.I — so the authority is a body, not
an anonymous blog.

**The mapping, verbatim (Bab II):**

| Group                                    | Colour         | CMYK                | Rules                                                                  |
| ---------------------------------------- | -------------- | ------------------- | ---------------------------------------------------------------------- |
| **A. hukum bacaan huruf** (letter rules) | merah (red)    | C:0 M:100 Y:100 K:0 | idgham bi-lā ghunnah, idgham mutamāthilayn, mutajānisayn, mutaqāribayn |
|                                          | magenta        | C:0 M:100 Y:0 K:0   | idgham bi-ghunnah, idgham mīmī (shafawī), **gunnah**                   |
|                                          | cyan           | C:100 M:0 Y:0 K:0   | **iqlāb**                                                              |
|                                          | hijau (green)  | C:100 M:0 Y:100 K:0 | **ikhfāʾ**, **ikhfāʾ shafawī**                                         |
|                                          | biru (blue)    | C:100 M:100 Y:0 K:0 | **qalqalah**                                                           |
| **B. hukum bacaan panjang** (madd)       | magenta        |                     | **madd lāzim**, **madd fāriq** (al-ʿiwāḍ) — 6 counts                   |
|                                          | cyan           |                     | **madd wājib muttaṣil** — 5 counts                                     |
|                                          | hijau          |                     | **madd jāʾiz munfaṣil**, **ṣilah ṣawiyyah** — 2 or 5 counts            |
| **C. tanda waqf** (pause signs)          | merah          |                     | waqf lāzim (م), al-waqf awwla (لا)                                     |
|                                          | biru           |                     | waqf muʿānaqah (قلى), waqf jāʾiz (ج)                                   |
|                                          | hijau          |                     | lā waqfa fīh (س), al-waṣl awwla (صلى)                                  |
| **D. huruf tidak dilafalkan**            | abu-abu (grey) | C:0 M:0 Y:0 K:30    | all unpronounced letters                                               |

**Three application models**, §1F item 6 — the app must pick one and say which:

- **model akademik** — colour the letters/vowels that _produce_ a rule
- **model fonetik** — colour the letters/vowels that are _pronounced_ with a rule
- **model praktis** — colour the diacritics that _indicate_ a rule

**Binding status**, §1E: groups **1 and 2 are mandatory** in every _Pedoman_
edition; groups **3 and 4 are optional**, and if a publisher uses them the
_Pedoman_ binds them.

**Four things recorded honestly:**

1. **The source PDF contradicts itself.** Bab I §E.1a says _merah_ covers
   _«idgām bi-ghunnah»_, which would put bi-ghunnah and bi-lā-ghunnah in the
   same colour as the magenta group. Bab II §A.a says _«Warna merah; dipakai
   untuk semua bacaan idgām, **tanpa adanya gunnah**»_ — red = idgham _without_
   ghunnah. Every secondary restatement follows **Bab II**, i.e. magenta =
   bi-lā ghunnah. **Bab II is internally consistent and Bab I appears to contain a
   typo. Do not ship the Bab I reading.**
2. **Two OCR/encoding artefacts in the Arabic.** Bab II §A.a renders
   _mutamāthilayn_ as `☺#ilain`; §A.c renders _mutajānisayn_ as `☺nisain`.
   Read as mutamāthilayn / mutajānisayn. Not doctrinal.
3. **LPMQ's madd durations differ from the matn commentarial consensus.** LPMQ
   says muttaṣil = 5 counts and munfaṣil/ṣilah = 2 **or 5**. The sources in §2.4
   give muttaṣil 4/5 and munfaṣil 4/5-in-wasl / 2-in-waqf. **Genuine
   disagreement — surface it.**
4. **LPMQ carries an explicit anti-reliance clause**, §1A: a reader seeking
   mastery must still study under a teacher, _«secara musyāfahah dan talaqqī»_;
   the colour system is only a complement. That sentence belongs in the app's
   own "not a substitute for a teacher" disclosure.

### 5.2 Dar al-Maarifah (Damascus) 3-colour system — **VERIFIED, well documented**

Source: Dar al-Maarifah's own explanatory page, reproduced at
https://easyquranstore.com/ar/عن-مصحف-التجويد/ . Archive scan of the mushaf
itself: https://archive.org/details/mushaf-tajweed-darul-marifa

Three base colours with **intensity gradations** encoding duration — an
elegant idea: colour _intensity_ = madd _length_.

| Colour                    | Rules                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **أحمر غامق** dark red    | madd lāzim (6) — both kalīmī muthaqqal/mukhaffaf and ḥarfī muthaqqal/mukhaffaf                                                                                                                             |
| **أحمر قاني** pure red    | madd wājib — muttaṣil, munfaṣil, ṣilah kubrā (5)                                                                                                                                                           |
| **برتقالي** orange        | madd jāʾiz — 2, 4 or 6 in waqf on verse-ends                                                                                                                                                               |
| **أخضر** green            | ghunnah (2) — ikhfāʾ, ikhfāʾ shafawī, mushaddad nūn/mīm, **plus** idghām bi-ghunnah and iqlāb _assisted by_ green                                                                                          |
| **أزرق غامق** dark blue   | **tafkhīm of rāʾ only** — explicitly _not_ the full istiʿlāʾ letters, «دون التعرض لحروف الاستعلاء ذات المراتب المختلفة للتفخيم دفعاً للتشويش عن القارئ»                                                    |
| **أزرق سماوي** light blue | qalqalah, with the sukūn sign; at waqf on verse-ends, plain blue                                                                                                                                           |
| **رمادي** grey            | lam shamsiyyah, alif al-farq, rasm≠lafz, hamzat al-waṣl internal, _al-khanjarīyya_, **idghām mutajānisayn**, **idghām mutaqāribayn**, iqlāb (with the green small mīm), idghām bi-ghunnah (with the green) |
| **كمّوني**                | short signals and natural madd, esp. the deleted alif of Uthmani rasm                                                                                                                                      |

Total: **28 ahkām** over red/green/blue (+gradations). Registered as a
**patent** to protect the colour scheme, which is itself the cleanest evidence
that the mapping is a private publisher's invention, not a scholarly standard.

Note the grey assignment of **mutajānisayn and mutaqāribayn** — a real source
for the fact that these two rules are conventionally _not_ separately coloured,
which corroborates the app's choice to omit them. The same page records the
KFGQPC committee's historical red for small letters, quoted in §0.1.

### 5.3 The alquran.cloud / quran.com API table — **VERIFIED as _their_ table, not KFGQPC**

Source: https://legacy.alquran.cloud/tajweed-guide

| Identifier | Hex       | Rule                              |
| ---------- | --------- | --------------------------------- |
| `[h`       | `#AAAAAA` | Hamzat ul Wasl                    |
| `[s`       | `#AAAAAA` | Silent                            |
| `[l`       | `#AAAAAA` | Lam Shamsiyyah                    |
| `[n`       | `#537FFF` | Normal prolongation: 2            |
| `[p`       | `#4050FF` | Permissible prolongation: 2, 4, 6 |
| `[m`       | `#000EBC` | Necessary prolongation: 6         |
| `[q`       | `#DD0008` | Qalaqah                           |
| `[o`       | `#2144C1` | Obligatory prolongation: 4–5      |
| `[c`       | `#D500B7` | Ikhafa' shafawi                   |
| `[f`       | `#9400A8` | Ikhfa'                            |
| `[w`       | `#58B800` | Idgham shafawi                    |
| `[i`       | `#26BFFD` | Iqlab                             |
| `[a`       | `#169777` | Idgham with ghunnah               |
| `[u`       | `#169200` | Idgham without ghunnah            |
| `[d`       | `#A1A1A1` | Idgham mutajanisayn               |
| `[b`       | `#A1A1A1` | Idgham mutaqaribayn               |
| `[g`       | `#FF7E1E` | Ghunnah: 2                        |

Citable as _"the alquran.cloud API tajweed annotation"_, which is what it is.
It encodes the **cpfair** dataset's own rule inventory, and its madd durations
(2 / 2,4,6 / 6 / 4-5) match the §2.4 consensus. Its mutajānisayn/mutaqāribayn
grey `#A1A1A1` matches Dar al-Maarifah's grey — these two datasets share
ancestry, which is consistent with cpfair's stated sources.

### 5.4 How the app's current 6 families compare

`js/domain/tajweed.js:174` — `silent #9E9E9E`, `nasal #4CAF50`,
`qalqalah #00BCD4`, `heavy #2196F3`, `madd #D32F2F`, `plain null`.

| App family                                 | App hex | Nearest citable standard                                                                                                                                                                                                      | Match?                                              |
| ------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| silent                                     | #9E9E9E | LPMQ grey (K:30); alquran.cloud `#AAAAAA`; Dar al-Maarifah grey                                                                                                                                                               | **shape yes, hex invented**                         |
| nasal (ghunnah+ikhfa+iqlab+idgham-ghunnah) | #4CAF50 | LPMQ splits these across **3** colours (magenta / cyan / hijau); alquran.cloud splits across **3** (`#169777`/`#9400A8`/`#26BFFD`); Dar al-Maarifah puts ikhfāʾ and ghunnah both green but iqlāb/idghām only _assisted_ green | **NO — the app merges what every source separates** |
| qalqalah                                   | #00BCD4 | LPMQ biru (C:100 M:100 Y:0 K:0); alquran.cloud `#DD0008`; Dar al-Maarifah light blue                                                                                                                                          | **cyan is defensible; the standard's is blue**      |
| heavy (tafkhim)                            | #2196F3 | Dar al-Maarifah dark blue = **rāʾ only**; LPMQ does not colour tafkhīm at all                                                                                                                                                 | **partially**                                       |
| madd (one red)                             | #D32F2F | all three sources use **3–4 graded** reds                                                                                                                                                                                     | **NO — the app flattens a graded scale**            |
| plain (uncoloured)                         | null    | Dar al-Maarifah greys mutajānisayn/mutaqāribayn; the app drops those rules entirely                                                                                                                                           | **consequence differs**                             |

**Honest summary:** the app's palette is a _reasonable pedagogical invention_
that is **not** traceable to any published standard, and in three places
(single nasal colour, single madd colour, invented hexes) actively contradicts
all three real standards. Two defensible options:

- **(A) Declare it.** Label the legend "Nūr al-Dhikr pedagogical palette —
  colours chosen for legibility, not an official mushaf convention," and offer
  the LPMQ and Dar al-Maarifah mappings as separately-attributed,
  separately-labelled presets. This is honest, offline-friendly, and needs no
  permission.
- **(B) Adopt LPMQ as the default** with full CMYK→sRGB conversion and citation.
  Costs a colour-legibility pass and a madhhab question (is an Indonesian
  government standard binding on your users? no — but it _is_ citable, which is
  what the brief asked for).

Recommend **(A) + ship LPMQ as an attributable preset**, and delete the
"standard chart" language either way.

---

## 6. Q6 — Curriculum

### 6.1 Arabic101's published structure — **VERIFIED, quotable**

Two distinct products. **Their content is copyrighted — see §6.3.**

**Beginner — "Tajweed of the Qur'an from A-Z"**
https://courses.arabic101.org/courses/tajweed-of-the-quran-from-a-z/
(last updated 2022-07-06; 5,253 enrolled; 3h50m; **free access**)

Prerequisites, stated: can read and link Arabic letters; completed "How to read
Arabic" ≥75%; completed "Arabic vowel system" ≥75%; completed "Arabic
pronunciation"; average English. Their own scoping sentence is the citable
pedagogy line: _"This course is for beginners level only, so you will learn the
basics of each skill, but NOT everything there is to learn about each Tajweed
skill."_

| #   | Module                            | Sessions                            |
| --- | --------------------------------- | ----------------------------------- |
| 1   | INTRO                             | ONE (their method)                  |
| 2   | Stopping & Continuation           | 1–3 + quiz on Quran symbols, then 4 |
| 3   | Madd – Elongation                 | 5–6                                 |
| 4   | Alif & Hamza                      | 7                                   |
| 5   | Nun Sakinah                       | 8–10                                |
| 6   | Mim Sakinah                       | 11                                  |
| 7   | Qalqalah – Echoing Sounds         | 12                                  |
| 8   | Qur'anic /r/ — full & empty mouth | 13                                  |
| 9   | Letter Fusion                     | 14                                  |
| 10  | Separated letters                 | 15                                  |

**Intermediate — "The BEST 30-day Tajweed Program"**
https://courses.arabic101.org/courses/intermediate-tajweed/ and
https://academy.arabic101.org/courses/intermediate-tajweed/
(last updated 2021-10-21; 2,050 enrolled; 6h40m; **free access**)

Their own description, verbatim: _"This course is made up of SIX stages and 30
lessons, and it is recommended to follow one lesson per day, so that you can give
yourself the chance to practice and understand the courses completely."_

| Stage | Name                      | Lessons | Sessions as listed                                                                                                                               |
| ----- | ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Madd in the Quran         | 7       | One, Two, Three, Four, Five, Six, Seven (REVISION)                                                                                               |
| 2     | Noon Sakinah              | 9       | One … Nine, incl. Eight (REVISION) and Nine (Q&A)                                                                                                |
| 3     | Meem Sakinah              | 4       | One, Two, Three, Four (Q&A)                                                                                                                      |
| 4     | Qalqalah                  | 4       | One, Two, Three, Four (Q&A)                                                                                                                      |
| 5     | Empty-/Full-mouth Letters | 3       | One, Two, Three                                                                                                                                  |
| 6     | MISC                      | 7       | _How to pronounce ى in the Quran_; _How to pronounce words starting with 'shaddah'_; _What is تخفيف?_; + 4 more in the extended 33-item playlist |

**The stage → session → skill third level, from the Day 1 transcript** — this is
the part the brief asked for and it is citable to the video itself.
https://www.youtube.com/watch?v=oC_LBcbNCPM, published 2021-04-13 by Arabic 101:

> _"DAY 1: STAGE ONE - SESSION ONE… this stage will be dedicated to the quranic
> madd and **it will be divided into six skills and therefore stage one will be
> divided into six sessions** and this is session one so first we'll be focusing
> on the one skill…"_

So the hierarchy is confirmed: **Course → Stage → Session = Skill**, with
revision and Q&A sessions reserved inside each stage. The extended 33-item
playlist (https://elforqaan.com/en/tajweed/arabic101/intermediate/;
https://www.youtube.com/playlist?list=PL6TlMIZ5ylgoA27YCmZYMCQCX7EUkfyHp)
shows the tail beyond 30: iltiqāʾ sāqinayn (noon qaṭnī), the "four actions of
recitation," the "seven alifs," letters with no tashkeel, hamzah/alif, and ى.

Their longer "Quran Mastery" course adds the level framing you may want for a
staged ladder (https://academy.arabic101.org/course-2-quran-mastery/):
Level 1 Beginner 60 lessons/30h; Level 2 Intermediate 70/35h, whose stated
outcomes include _"The students has acquired the basics of (Makharij) and
characteristics (Sifaat) of all letters"_; Level 3 Advanced Itqān 50/25h.

**What is citable:** the _shape_ — stage/session/skill, revision + Q&A inside
each stage, madd first, then noon → meem → qalqalah → istiʿlāʾ/istiṭālāʾ → misc,
with waqf introduced early in the beginner course rather than late. Their
sequence happens to match the difficulty gradient that al-Jazariyya and
Tuhfat al-Atfal also imply. **Cite the structure; do not copy the words.**

### 6.2 Open / licensable alternatives — so the app is not dependent on one commercial curriculum

**Tier 1 — genuinely open, no permission needed:**

| Resource                                                                                    | Licence           | What it gives you                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`ghunna`** — https://ghunna.com · https://github.com/mwiederrecht/ghunna · `npm i ghunna` | **MIT**           | 41 rules derived from the two matns, _*each carrying a derivation in English *and* Arabic* plus a `tuhfah:N` / `jazariyyah:N` line citation_*. Scope Ḥafṣ ʿan ʿĀṣim by ṭarīq al-Shāṭibiyyah. 0 runtime deps, ESM+CJS, browser-identical. 99.80% agreement vs two independent datasets over 6,236 verses; 108 divergences each documented in `/residue`. |
| **Tuhfat al-Aṭfāl** — https://ar.wikisource.org/wiki/تحفة_الأطفال                           | **CC BY-SA**      | The full 61-verse matn, transcription cited by `ghunna` as fetched 2026-07-11.                                                                                                                                                                                                                                                                          |
| **al-Muqaddimah al-Jazariyyah** — same Wikisource corpus                                    | **CC BY-SA**      | The full 107/108-verse matn, likewise.                                                                                                                                                                                                                                                                                                                  |
| **quran-tajweed** — https://github.com/quran/tajweed                                        | open              | The rule-id inventory and colour-span format the app's ids came from.                                                                                                                                                                                                                                                                                   |
| **Tanzil** text                                                                             | free, attribution | The Uthmani text `ghunna` reads. Already the app's pipeline shape.                                                                                                                                                                                                                                                                                      |

`ghunna` is the important one. Its `/sources` page publishes **both matns in
full, line-numbered**, and its rule API returns a derivation string per span:

```js
{ rule: "iqlab",
  name: { arabic: "الإقلاب", transliteration: "iqlāb", english: "conversion to mīm" },
  range: [17, 22],
  derivation: "nūn sākinah/tanwīn followed by ب → the nūn is converted to a concealed mīm with ghunnah",
  citation: { text: "tuhfah", lines: [13] } }
```

That is _exactly_ the teaching layer the brief describes, already built, openly
licensed, and line-citable. Its `/residue` (108 documented divergence sites) is
also a ready-made scholar hand-off list.

**Tier 2 — institutional, free to read, citable but NOT open-licensed:**

| Resource                                             | Institution                                                                    | Note                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| _Pedoman Tajwid Sistem Warna_ (2011)                 | LPMQ, Kementerian Agama RI                                                     | Free PDF; colour standard (§5.1)                                                                                              |
| _al-Mushaf al-Muyassar_                              | King Fahd Complex                                                              | KFGQPC publishes it; **check its terms before quoting**                                                                       |
| TARTĪL: Learning Tajweed with a Simple Method (2023) | CELPAD, International Islamic University Malaysia                              | ISBN 978-629-98742-0-1, Tilawah Division TQTD 1001/1002/2002. **All rights reserved** — citable, not copyable.                |
| _Principles of Tajwīd_ (Dr Ismail Muhammad Hadi)     | institutional open-access copy, https://exa.ai/library/publication/hyflbkkb8wx | 3 chapters: intro to tajweed / articulation points / recitation rules. **Check the repository's licence terms before reuse.** |
| Egyptian Ministry of Awqaf portal                    | وزارة الأوقاف                                                                  | https://awkafonline.gov.eg — makharij + ṣifāt chapters, citable as a government ministry page                                 |

**Tier 3 — public domain classical, freely quotable (the _matns_, not the
sharahs):** the matns of al-Jazariyya, Tuhfat al-Atfal, al-Shāṭibiyyah, and
Ibn al-Jazari's _al-Tamhid_ are all pre-modern and free of copyright. Their
**commentaries** (_Fatḥ al-Aqāl_, _al-Rawḍa al-Nadīyya_, _Fath al-Mulūq_,
_Minḥat Dhī al-Jalāl_, _al-Tashīl_) are modern — quote them by name and short
extract with attribution; do not reproduce them wholesale.

### 6.3 Structure you can cite vs content you must not copy

|                   |                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SAFE to reuse** | The _stage/session/skill architecture_; the module _ordering_; the prerequisite-list shape; the revision+Q&A pattern. Cite Arabic101 by name and URL.                                                                                                                                                                                             |
| **NOT SAFE**      | The video scripts, the exact explanatory prose, the challenge-question wording, the colour-highlighting convention used inside their recitations (_"you will see in each instance that the natural med will be highlighted with a different color"_), their illustrations, their worksheets, and their **"Arabic101" branding and course names**. |
| **Also not safe** | Reproducing Tuhfat al-Atfal or al-Jazariyya _commentaries_ wholesale. The **matns themselves** are fine (pre-modern / CC BY-SA transcription with attribution).                                                                                                                                                                                   |
| **Watch out**     | `elforqaan.com` and similar rehosts of the Arabic101 playlists are **third-party mirrors**. Cite `courses.arabic101.org` / the Arabic101 YouTube channel, not the mirror.                                                                                                                                                                         |

### 6.4 A staged curriculum derived from the citations above

Not Arabic101's. Built from the matn difficulty gradient, with every stage's
citation named. Offered as a **proposal** for the owner and the scholar, per
AGENTS.md §1.5.

| Stage | Topic                                                            | Grounded in                                                     | Why here                         |
| ----- | ---------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------- |
| 0     | What tajweed is; how to test a makhraj (_aku_ / _abu_ trick)     | al-Tamhid ch. 2; al-Akhdari, https://alsunniah.com/book/6145/58 | —                                |
| 1     | **Makharij** (17)                                                | al-Jazariyya v. 9–19; _al-Tamhid_ ch. 8; Awqaf                  | the alphabet before rules        |
| 2     | **Ṣifāt** (17) + the 5–7 invariant + the 10 ألقاب                | al-Jazariyya v. 20–26; _Fatḥ al-Aqāl_                           | builds the 5-letter audit        |
| 3     | **Qalqalah** — from ṣifāt, before any noon rule                  | al-Jazariyya v. 23, 37–39                                       | it is a ṣifah; earliest payoff   |
| 4     | **Madd ṭabīʿī**                                                  | Tuhfat v. 35–41                                                 | the foundation of all other madd |
| 5     | **Madd wājib/muttaṣil, jāʾiz/munfaṣil, ʿāriḍ, badal**            | Tuhfat v. 42–47; al-Jazariyya v. 68–71                          | the wājib/jawāz split            |
| 6     | **Madd lāzim** + the ʿayn and Āl ʿImrān exceptions               | Tuhfat v. 47–58                                                 | hardest, most-queried            |
| 7     | **Ikhfāʾ** + ghunnah, its ranks, its makhraj                     | Tuhfat v. 14–17; _al-Tamhid_ on khaysum                         | ghunnah before idghām            |
| 8     | **Nūn sākinah**: izhār, idghām (2 sub-rules), iqlāb              | Tuhfat v. 6–13                                                  | one page, four rulings           |
| 9     | **Mīm sākinah** + the wāw/fā trap                                | Tuhfat v. 18–23                                                 | short, high-error                |
| 10    | **Lām**: shamsiyyah, qamariyyah, al-fiʿl, jalālah tafkhīm        | Tuhfat v. 24–29; al-Jazariyya v. 28, 43                         |                                  |
| 11    | **Tafkhīm / tarqīq**, rāʾ, ḍād/ẓāʾ                               | al-Jazariyya v. 34–56                                           | al-Jazariyya-only, so later      |
| 12    | **Ithāmāt**: mutamāthilayn, mutaqāribayn, mutajānisayn, mithlayn | Tuhfat v. 30–34                                                 | needs 1–2 behind it              |
| 13    | **Hamzat al-waṣl / al-qaṭʿ**, incl. ārif-khaniyyah               | al-Jazariyya v. 100–103; _al-Tamhid_ ch. 5                      | orthographic, belongs late       |
| 14    | **Waqf / ibtidāʾ**, incl. the ʿayn in _firq_                     | al-Jazariyya v. 72–78, 104–105                                  | needs rules 1–13                 |
| 15    | **Rasm notes: maqṭūʿ / mauṣūl**                                  | al-Jazariyya v. 79–92                                           | optional track                   |

Two structural arguments for this order, both citable: (i) Arabic101 also puts
madd first and noon/meem/qalqalah after, independently converging; (ii) the
matn order puts makharij and ṣifāt first for the same reason — you cannot
classify قُطْبُ جَدٍ as a qalqalah letter until Stage 2. Stages 11–15 are the
al-Jazariyya-specific tail; stages 0–10 are common to both matns.

---

## 7. Q7 — Public-domain / open worked-examples text

### 7.1 Best answer: `ghunna` — MIT, line-cited, per-verse derivations

https://ghunna.com · https://github.com/mwiederrecht/ghunna · `npm i ghunna`

This satisfies the brief better than any classical option because it is
**worked examples at the span level, for every verse, with a citation**:

- MIT licence; the **Qurʾān text is Tanzil**, carried intact with attribution.
- `annotateVerse(2, 255)` returns spans with `rule`, Arabic/English names,
  `range` as codepoint offsets, a `derivation` sentence in EN and AR, and
  `citation: { text: "tuhfah", lines: [13] }`.
- `/residue` documents **108 divergence sites** against independent datasets,
  each researched against the published literature — a pre-written scholar
  hand-off.
- `/waqf` exposes waqf as a **parameter** rather than a baked-in assumption.
- It derives rule families no digital dataset carries at all — the
  **tafkhīm/tarqīq** family, which is this app's `tafkhim` rule and the one
  LPMQ does not colour.

**The compatibility warning is important, and the app already solved it.** Both
`ghunna` and the cpfair dataset index into the **Tanzil Uthmani with pause
marks and sajdah, without rub-el-hizb and without Me_Quran tanween shapes**;
`cpfair`'s README warns the Tanzil encoding has since changed and supplies a
pinned April-2017 text, and ghunna's SPEC.md flags the same codepoints. The app
deliberately re-derives from its own text for exactly this reason
(`js/domain/tajweed.js` header). **So: take ghunna's rule definitions, mnemonics
and citations; do not take its offsets.** That is a clean division and it is
the right architecture.

### 7.2 Classical, free of copyright, genuinely quotable

| Work                                          | Author / date                | What you get                                                                                                                                                                                  |
| --------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tuhfat al-Atfāl** (61 vv.)                  | Sulayman al-Jamzuri, 1198 AH | The beginner matn. **The closest thing to a "walkthrough":** every rule is stated _with its letter sets and a mnemonic line_, in order, in 61 lines. CC BY-SA transcription at ar.wikisource. |
| **al-Muqaddimah al-Jazariyyah** (107/108 vv.) | Ibn al-Jazari, d. 833 AH     | The reference matn. Contains the 10-ring rasm memorisation (v. 79–92), the ārif-khaniyyah, the ḍād/ẓāʾ disambiguation, and the mutaqāṭiʿ letters.                                             |
| **Ibn al-Jazari, al-Tamhid**                  | d. 833 AH                    | 10 chapters of _prose_. This is the one to cite for **definitions** — it defines rather than versifies, and ch. 8 is a letter-by-letter reference. Public domain.                             |
| scanned _Matan al-Jazariyyah_                 | —                            | https://archive.org/details/MatanAlJazariyyahTajwidAlQuran                                                                                                                                    |

**The mnemonic lines are the worked examples.** Tuhfat v. 16, v. 27, v. 39,
v. 56–57 are memorisation verses that _are_ the letter lists; al-Jazariyya
v. 20–26 are the ṣifah lists. Shipping those lines **with attribution** is both
legally clean and pedagogically the strongest thing available: it converts a
table the user must memorise into a rhyme they can recite.

### 7.3 What is **NOT** public domain — do not ship

| Item                                                                                     | Status                  | Why it looks open but isn't                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _**al-Musassir al-Mufeed fi 'ilm al-Tajwid**_, ʿAbd Allāh ʿAbd al-Qādir Hiluz, 1431/2010 | **All rights reserved** | The publisher listings say _«الحقوق محفوظة للمؤلف»_ (https://quranpedia.net/book/20526). It is genuinely the best fit for the brief — Ḥafṣ ʿan ʿĀṣim by ṭarīq al-Shāṭibiyyah, definition tables, and **a solved worked exercise extracting every tajweed ruling from Surah al-Balad** (https://islamhouse.com/ar/books/320902/) — **but it is a 2010 copyrighted work.** Cite it; do not copy its tables, its examples or its al-Balad exercise.                   |
| _archive.org_ "Creative Commons" tags on uploaded PDFs                                   | **Not a licence**       | The Noor-Library listing for the same book carries the boilerplate _«This book was brought from archive.org as under a Creative Commons license, or the author or publishing house agrees to publish the book»_. That is a **disjunction** — an uploader's assertion, not a grant. Archive.org user uploads carry no rights clearance. **Treat any archive.org PDF as all-rights-reserved unless the author is deceased and the work is demonstrably pre-modern.** |
| TARTĪL (IIUM/CELPAD)                                                                     | **All rights reserved** | Explicit on its title page.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Arabic101 videos/scripts                                                                 | **Copyrighted**         | Free-to-watch ≠ free to copy.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| _al-Tajwid al-Muyassar_ (KFGQPC)                                                         | **Check terms**         | KFGQPC publishes it as a Complex publication. Do not assume free reuse the way the KFGQPC _fonts_ are (those have their own explicit free-use grant: https://fonts.qurancomplex.gov.sa/en/).                                                                                                                                                                                                                                                                       |
| Dar al-Maarifah tajweed mushaf                                                           | **Patent + copyright**  | The publisher states the colour scheme is patent-registered.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Indonesian tajweed mushafs                                                               | **Copyrighted**         | LPMQ _licenses_ the scheme; individual mushafs are commercial products.                                                                                                                                                                                                                                                                                                                                                                                            |

---

## 8. Findings about _this app_, for the owner

Not part of the brief; found while researching, flagged because they are
attribution defects under AGENTS.md §1.

1. **`js/domain/tajweed.js` rule `desc` fields have no source attribution at
   all.** They are the app's own English/Arabic paraphrases. E.g. `hamzat_wasl`:
   _"A connecting hamza — dropped in pronunciation when preceded by another
   word."_ That is a _correct_ paraphrase, and it is now citable — to
   al-Jazariyya v. 100–103 and _al-Tamhid_ ch. 5. The fix is to attach
   `source: { text: 'al-Tamhid', chapter: 5 }` (or `tuhfah:N`) per rule, not to
   rewrite the prose. That satisfies AGENTS.md §1.1a in one pass.
2. **The `TAJWEED_FAMILIES` doc comment claims "the standard chart's" colours.**
   No such chart exists (§0.1, §5.4). This is a false attribution in a
   user-visible surface and should be corrected before v5.18.
3. **`docs/OPEN-ISSUES.md` already lists "qalqalah colour convention" as
   scholar-gated** — correct call, and this dossier gives it a citation instead
   of leaving it open-ended.
4. **`docs/TRUSTED-SOURCES.md` §1c is accurate and should be left alone**; its
   17/16/14 breakdown matches §3 exactly. Worth adding that the 14-count
   merging is specifically **lām+nūn+rāʾ** and that Qutrub/al-Jarmī/Ibn Kayyān
   belong in the "14" attribution alongside al-Farrāʾ.
5. **Missing rules worth a scholar decision:** `mutajanisayn` (58 sites) and
   `mutaqaribayn` (13 sites) are classical, corpus-attested, and currently
   absent. Both LPMQ and Dar al-Maarifah colour/grey them, so the omission is a
   visible divergence from every published chart.
6. **`ghunna` widens `qalqalah` into two classes** to match the datasets,
   because qalqalah is waqf-dependent. A single `qalqalah` rule id in a PWA is
   defensible, but the legend should say the colour marks the _sughrā_ case.
7. `madd_iwad` and `madd_silah` have no matn citation (§2.4). They are real and
   widely taught, but the app should either cite a named modern manual or
   present them as an extension.
8. `madd_246` reads as "2/4/6", which is the **ʿāriḍ**-family range; but its
   siblings are `madd_muttasil` (4/**5**) and `madd_munfasil` (4/5, or 2 in
   waqf). If the legend shows "2/4/6" next to muttaṣil without the 5, it is
   wrong. **Check the rendered copy.**

---

## 9. SAFE TO SHIP

Attributed, sourced, and defensible as written. Each item carries its citation
into the app.

| #   | What                                                                                                                                      | Attribution string to ship                                                                                                                                                                                            | Source     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | **al-Jazariyya verse/section map** (16 sections) as the app's "reference structure" panel                                                 | "Imam Ibn al-Jazārī (d. 833/1429), _al-Muqaddimah al-Jazariyyah_, 107 vv. — section titles are later editorial, not Ibn al-Jazārī's"                                                                                  | §1.1       |
| 2   | **al-Tamhid's 10-chapter map** as the "how a classical reference is organised" panel                                                      | "Ibn al-Jazārī, _al-Tamhid fi ʿilm al-Tajwid_, ed. ʿAlī Ḥusayn al-Bawwāb, Riyadh 1405/1985"                                                                                                                           | §1.2       |
| 3   | **Tuhfat al-Atfal's section map** as the "beginner spine"                                                                                 | "Sulaymān al-Jamzūrī (1198 AH), _Tuḥfat al-Aṭfāl_, 61 vv."                                                                                                                                                            | §1.3       |
| 4   | **Makharij: all three counts, with the mechanism for each**                                                                               | "17: al-Khalīl → Ibn al-Jazārī. 16: al-Sibawayh, al-Shāṭibī — _al-jawf_ deleted, alif→ḥalq, yā→mid-tongue, wāw→shafatān. 14: al-Farrāʾ, Qutrub, al-Jarmī, Ibn Kayyān — _al-jawf_ deleted **and** lām+nūn+rāʾ merged." | §3.1       |
| 5   | **The 17-point makhraj table** as the 17 default, with the other two as selectable alternatives                                           | same, + Egyptian Ministry of Awqaf for the table                                                                                                                                                                      | §3.2       |
| 6   | **The 10 ألقاب** as a memory device, **with** the attribution caveat                                                                      | "…epithets whose attribution to al-Khalīl is disputed (Ibrāhīm Anīs; Aḥmad Muḥammad Qudūr, _Uṣūlat al-Ṣawt ʿinda al-Khalīl_)"                                                                                         | §3.2       |
| 7   | **Ghunnah = ONE makhraj, al-khaysum**                                                                                                     | al-Jazariyya v. 19: _«وَغُنَّةٌ: مَخْرَجُهَا الخَيْشُومُ»_                                                                                                                                                            | §3.3       |
| 8   | **Ikhfāʾ = 15 letters** with the mnemonic line, as a _letter count_                                                                       | Tuhfat v. 15–16                                                                                                                                                                                                       | §2.1       |
| 9   | **Ghunnah ranks: 3 or 5, majority 5**                                                                                                     | cite the study, present both                                                                                                                                                                                          | §3.3       |
| 10  | **Ṣifāt: 17 / 18 / 20 / 44 with the mechanism for each**, and Ibn al-Jazārī's own reason for 17                                           | "…so the number of ṣifāt is seventeen, like the number of makharij" — _Fatḥ al-Aqāl_                                                                                                                                  | §4.2       |
| 11  | **The 17 ṣifāt with letter sets and mnemonics**                                                                                           | al-Jazariyya v. 19–26 + Awqaf                                                                                                                                                                                         | §4.3       |
| 12  | **The 5–7 ṣifāt-per-letter invariant + the audit algorithm** as a quiz                                                                    | _Fatḥ al-Aqāl_                                                                                                                                                                                                        | §4.4       |
| 13  | **The 5-vs-6 qalqalah dispute, with the three named expansions**                                                                          | "al-Jaʿbarī added hamzah; al-Sibawayh added tāʾ; al-Mubarrad added kāf; the majority refuse all three" — _al-Mawsūʿa al-Saʿūdiyya_                                                                                    | §2.6       |
| 14  | **Qalqalah marātib as a 2/3/4 disagreement, explicitly noted not to change the recited sound**                                            | cite the four-grade position's own caveat                                                                                                                                                                             | §2.6       |
| 15  | **Nūn sākinah: present all of 3/4/5/6**                                                                                                   | al-Baqri via _al-Dirāsāt al-Ṣawtiyya_; **and the matn's own footnote**                                                                                                                                                | §2.1       |
| 16  | **The four noon rulings with letter sets, mnemonics, and the دنيا/صنوان exception**                                                       | Tuhfat v. 6–16                                                                                                                                                                                                        | §2.1       |
| 17  | **Mīm sākinah: three, with the wāw/fā trap**                                                                                              | Tuhfat v. 18–23                                                                                                                                                                                                       | §2.2       |
| 18  | **Lām: shamsiyyah (14 letters + mnemonic), qamariyyah, al-fiʿl, jalālah**                                                                 | Tuhfat v. 24–29; al-Jazariyya v. 28, 43                                                                                                                                                                               | §2.3       |
| 19  | **Madd: 3 ahkām, with durations and the strongest→weakest order**                                                                         | Tuhfat v. 42–47; al-Jazariyya v. 68–71                                                                                                                                                                                | §2.4       |
| 20  | **Madd lāzim = FOUR, with the 8 ḥarfī letters, the 5 natural-madd letters, and the 14 muqaṭṭaʿ letters**                                  | Tuhfat v. 48–57                                                                                                                                                                                                       | §2.4       |
| 21  | **The two lāzim exceptions** (ʿayn 4-or-6; Āl ʿImrān mīm 6-or-2) and the fact that kalīmī mukhaffaf occurs in exactly one word, twice     | Tuhfat v. 54 + commentators                                                                                                                                                                                           | §2.4       |
| 22  | **Hamzat al-waṣl: the 10 proper nouns, which 7 are in the Qurʾān, and the ārif-khaniyyah exception**                                      | al-Jazariyya v. 100–103; _al-Tashīl_                                                                                                                                                                                  | §2.7       |
| 23  | **Hamzat al-waṣl's _reason_** (written because scribes stopped at every letter) as the teaching sentence                                  | al-Jazariyya v. 8                                                                                                                                                                                                     | §2.7       |
| 24  | **LPMQ colour mapping as an attributed preset**, with CMYK values and the three application models                                        | LPMQ, _Pedoman Tajwid Sistem Warna_, 2011, with the PDF URL                                                                                                                                                           | §5.1       |
| 25  | **Dar al-Maarifah 3-colour graded-red system as a second attributed preset**                                                              | Dar al-Maarifah, Damascus                                                                                                                                                                                             | §5.2       |
| 26  | **A curriculum _shape_** (stage/session/skill, revision+Q&A) credited to Arabic101 **and** independently justified from the matn gradient | §6.1 + §6.4                                                                                                                                                                                                           | §6         |
| 27  | **"Colours are a modern printing aid, not scripture"** as user-facing copy                                                                | cite the commercial-source concession _and_ LPMQ's own _musyāfahah_ clause                                                                                                                                            | §5.1, §5.4 |
| 28  | **Per-rule `source` fields** on all 20 rules, pointing at Tuhfat lines or al-Jazariyya lines                                              | §2 throughout                                                                                                                                                                                                         | —          |

**Also safe, and worth doing first:** take `ghunna`'s **definitions, mnemonics
and line citations** (MIT, per-rule EN+AR derivations) as the text of the
teaching layer. You get a sourced, bilingual, line-citable definition set
without writing religious prose, and you avoid the index-drift problem by
keeping your own classifier. Attribute the library by name and link.

---

## 10. NOT SAFE — needs a named scholar's sign-off

| #   | Item                                                                                | Why it is blocked                                                                                                                                                     | What unblocks it                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The app's colour palette as "the standard"**                                      | No such standard exists. The current `TAJWEED_FAMILIES` comment is a false attribution in a user-visible surface.                                                     | Rewrite the comment to "Nūr al-Dhikr pedagogical palette" **now** (no scholar needed — it's a truthfulness fix). Shipping _any_ palette as _the_ mushaf convention needs sign-off. |
| 2   | **Defaulting to 17 makharij**                                                       | Legitimate majority view, but a real madhhab choice.                                                                                                                  | TAJ-09 ruling. Until then ship all three.                                                                                                                                          |
| 3   | **Defaulting to 17 ṣifāt**                                                          | Genuinely 14/15/17/18/20/44.                                                                                                                                          | Ruling; the _reason_ Ibn al-Jazārī gave (parity with 17 makharij) should be shown either way.                                                                                      |
| 4   | **"Ghunnah has 15/16 articulation points"**                                         | Unverified and probably a conflation of the 15 ikhfāʾ letters with khaysum.                                                                                           | Do not ship. Ship "one: al-khaysum" + "ikhfāʾ has 15 letters" as two separate facts.                                                                                               |
| 5   | **`sifat al-muhall / al-muthaqilah / al-mudhafah`**                                 | Could not be traced to any published taxonomy.                                                                                                                        | The originating citation, or permanent deletion.                                                                                                                                   |
| 6   | **"Madd lāzim has 6 types"**                                                        | The matns say **four**. Six is a modern aggregation.                                                                                                                  | Either cite a named modern manual, or present 4 + label ʿiwāḍ/ṣilah as an extension.                                                                                               |
| 7   | **Madd durations for muttaṣil/munfaṣil**                                            | 4/5 vs LPMQ's flat 5. And 2 vs 4/5 for munfaṣil.                                                                                                                      | Ruling, per-riwāyah.                                                                                                                                                               |
| 8   | **Qalqalah intensity ranking**                                                      | ṭāʾ > **jīm** > qāf vs ṭāʾ > **qāf** > jīm. Unresolved.                                                                                                               | Ruling, or omit the ranking.                                                                                                                                                       |
| 9   | **Which ṣifah the mushaf colours** — the _ḥarf_ carrying ghunnah, or ghunnah itself | Two positions, both sourced, both reconcilable; it changes what the app highlights.                                                                                   | Ruling.                                                                                                                                                                            |
| 10  | **`mutajanisayn` / `mutaqaribayn` inclusion**                                       | 58 and 13 corpus sites; coloured by LPMQ, greyed by Dar al-Maarifah. The app has neither.                                                                             | Ruling on inclusion.                                                                                                                                                               |
| 11  | **`tafkhim` scope**                                                                 | LPMQ does not colour tafkhīm at all; Dar al-Maarifah colours **rāʾ only** and explicitly declines the other istiʿlāʾ letters; the 7 letters are standard in the matn. | Ruling on the app's single `tafkhim` rule's scope.                                                                                                                                 |
| 12  | **Whether `madd_iwad` / `madd_silah` are classical enough to present as peers**     | Absent from both matns.                                                                                                                                               | Ruling, or an explicit "extension" label.                                                                                                                                          |
| 13  | **Any rule definition written from memory rather than quoted**                      | AGENTS.md §1.1. The current `desc` fields are paraphrases; they are _correct_, but until each carries a `source` they are the app's unauthenticated word.             | Add `source` per rule (§9 #28). The text itself need not change.                                                                                                                   |
| 14  | **Any worked example, verse choice, or "this ayah shows rule X"**                   | Not attempted here, by design.                                                                                                                                        | Derive from the app's own classifier output, then have a scholar check a sample. `ghunna`'s `/residue` is a ready-made starting list.                                              |
| 15  | **Reproducing any modern sharah's tables or examples**                              | Copyright. Includes Hiluz's al-Balad exercise, IIUM TARTĪL, Arabic101 scripts.                                                                                        | Don't. Quote short extracts with attribution; or use `ghunna`.                                                                                                                     |
| 16  | **Treating any archive.org PDF as CC-licensed**                                     | The Noor-Library CC blurb is a disjunction, not a grant.                                                                                                              | Check the author's death date and the work's age. Pre-modern only.                                                                                                                 |
| 17  | **The exact wording of the LPMQ mapping**                                           | The source PDF contains an internal contradiction (Bab I says red = bi-ghunnah, Bab II says red = _without_ ghunnah).                                                 | Use Bab II (consistent with all restatements) **and** disclose the discrepancy, or get LPMQ to confirm.                                                                            |
| 18  | **Any claim that KFGQPC endorses a colour scheme**                                  | It does not. Would be a fabricated institutional endorsement.                                                                                                         | Never.                                                                                                                                                                             |

---

## 11. Source index

**Institutional / government**

| Source                                                                                    | URL                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LPMQ, _Pedoman Tajwid Sistem Warna_ (2011) — full PDF                                     | https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf                                                                                     |
| Harits Fadlly, "Tajwid Warna dalam Mushaf Al-Qur'an Standar Indonesia", SUHUF 13:2 (2020) | https://jurnalsuhuf.kemenag.go.id/suhuf/article/view/587                                                                                                                |
| Egyptian Ministry of Awqaf, _Makharij al-Ḥuruf_                                           | https://awkafonline.gov.eg/content-sections/116/4991/مخارج-الحروف                                                                                                       |
| Egyptian Ministry of Awqaf, _Ṣifāt al-Ḥuruf_                                              | https://awkafonline.gov.eg/content-sections/116/4993/صفات-الحروف                                                                                                        |
| _al-Mawsūʿa al-Saʿūdiyya_, "mā hiya ḥurūf al-qalqalah"                                    | https://www.ksaency.com/article/ما-هي-حروف-القلقلة                                                                                                                      |
| KFGQPC — main / dev platform / fonts / structure                                          | https://qurancomplex.gov.sa/en/ · https://qurancomplex.gov.sa/quran-dev/ · https://fonts.qurancomplex.gov.sa/en/ · https://qurancomplex.gov.sa/en/kfgqpc/kfq-structure/ |

**Primary matns (public domain; CC BY-SA transcriptions)**

| Source                                                | URL                                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tuhfat al-Atfal — text                                | https://ar.wikisource.org/wiki/تحفة_الأطفال                                                              |
| Tuhfat al-Atfal — edition with commentary footnotes   | https://shamela.ws/book/9632/2                                                                           |
| al-Muqaddimah al-Jazariyyah — text                    | https://ar.wikipedia.org/wiki/المقدمة_الجزرية · vocalised https://surahquran.com/Tajweed/aljazariah.html |
| Ibn al-Jazari, _al-Tamhid_ (ed. al-Bawwab, 1405/1985) | https://shamela.ws/book/8194                                                                             |
| Ibn al-Jazari, _al-Tamhid_ — author's own preface     | https://www.islamweb.net/ar/library/content/230                                                          |
| _al-Tamhid_ ch. 8 (makharij 17/16/14)                 | https://alsunniah.com/book/2678/22                                                                       |
| _al-Tamhid_ ch. 7 (10 ألقاب)                          | https://zdnyilma.com/2015/11/34.html                                                                     |
| scanned _Matan al-Jazariyyah_                         | https://archive.org/details/MatanAlJazariyyahTajwidAlQuran                                               |

**Modern sharah-works (cite; do not copy)**

| Source                                                                 | URL                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| _Fatḥ al-Aqāl_ — ṣifāt count, qalqalah, the 5–7 algorithm              | https://alsunniah.com/book/21572/4                                                                                       |
| _al-Rawḍa al-Nadīyya_ — chapter list, per-letter ṣifāt                 | https://alsunniah.com/book/3625/26 · https://quranonlinelibrary.com/kutub-library/alrawdat-alnadiat-sharah-matn-aljizria |
| _al-Wajīz_ — ṣifāt 14/17, alif excluded from jahr, hamzat al-waṣl      | https://shamela.ws/book/5464/11 · https://alsunniah.com/book/6371/14                                                     |
| _al-ʿAmīd_ — ṣifāt 15/18, dhātīyah/ʿarḍiyyah                           | https://alsunniah.com/book/4355/143                                                                                      |
| _Ghāyat al-Murīd_ — ṣifāt 20, khafāʾ + ghunnah                         | https://alsunniah.com/book/21025/118                                                                                     |
| _Madkhal fī ʿUlūm al-Qirāʾāt_ — 12 strong ṣifāt, khafāʾ of 4 letters   | https://ftp.shamela.ws/book/8633/114                                                                                     |
| Ibn Jinni, _Sirr Ṣanʿat al-Iʿrāb_ — makharij footnote                  | https://ablibrary.net/book_content/b/11490/61                                                                            |
| _al-Tashīl_ commentary, bāb hamzat al-waṣl — the 10 nouns, 7 in Qurʾān | https://ftp.shamela.ws/book/22869/438                                                                                    |
| Ibn Jinni, _Sirr Ṣanʿat al-Iʿrāb_ — hamzat al-waṣl/qaṭʿ definitions    | https://shamela.ws/book/18273/560                                                                                        |
| _Tashīl_ commentary, bāb 56 — etymology of "waṣl"                      | https://shamela.ws/book/16826/3718                                                                                       |
| _al-Muyassar li-Aḥkām al-Tajwīd_ — 29-letter makhraj table, ṣifāt      | https://www.qurankarim.org/books/contentsimages/htmlfiles/kafi(3)-tajweed/kafi(3)-02.html                                |
| _al-Miṣbāḥ_ / _Maḥkām al-Madd_ — madd taxonomy conflict                | https://www.islamarchive.cc/ketab_content/96527/p-5                                                                      |
| al-Akhdari, _al-Mīzān_ — the makhraj test (_aku_/_abu_)                | https://alsunniah.com/book/6145/58                                                                                       |
| _Tajwid Guide_ — qalqalah, madd, order of strength                     | https://surahquran.com/Tajweed/qalqalah.html · https://surahquran.com/Tajweed/almodood-en.html                           |
| _Tajwid Guide_ — hamzat al-waṣl, ārif-khaniyyah                        | https://surahquran.com/Tajweed/hamzat-alwasl.html                                                                        |
| _al-Miṣbāḥ_ — 7 vs 3 ṣifāt of al-murād                                 | https://www.hindawi.org/books/70629206/1.14/                                                                             |

**Studies & documented disagreements**

| Subject                                                               | URL                                                                                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Noon-rule counts 3/4/5/6 (al-Baqri via al-Dirāsāt al-Ṣawtiyya)        | https://ablibrary.net/book_content/b/8309/361                                                                                     |
| Ghunnah ranks 3 vs 5                                                  | https://exa.ai/library/publication/dgpct3sxsjp                                                                                    |
| Ghunnah makhraj: ṣifah vs ḥarf, both sourced                          | https://saaid.org/daeyat/omjalal/1.htm                                                                                            |
| Ghunnah/waqf model                                                    | https://www.noormags.ir/view/fa/articlepage/2516361                                                                               |
| Qalqalah grades 2 vs 4 (argued, with the "no change in sound" caveat) | https://mtafsir.net/threads/5049/                                                                                                 |
| Qalqalah grades 3/4, intensity order                                  | https://mawdoo3.com/القلقلة_الكبرى_والصغرى · https://mawdoo3.com/تعريف_القلقلة                                                    |
| Qalqalah intensity order — **conflicting**                            | https://mumenah.com/alqalqalat-fi-altajwid (ṭāʾ>qāf>jīm) vs mawdoo3 (ṭāʾ>jīm>qāf)                                                 |
| Madd lāzim types, Hāfiʿ durations, the two exceptions                 | https://alajran.wordpress.com/mudood/ · https://schools.macnet.ca/alotrojah/wp-content/uploads/sites/10/2019/10/11-Madd-L2A-E.pdf |
| Hamzat al-waṣl definitions and the five differences                   | https://alukah.net/sharia/0/71507                                                                                                 |
| Qalqalah 5-letter origin and the three expansions                     | https://www.ksaency.com/article/ما-هي-حروف-القلقلة                                                                                |
| Ṣifāt per-letter full table                                           | https://ar.wikipedia.org/wiki/صفة_حرف_(العربية)                                                                                   |

**Open software & data**

| Source                                         | URL                                                         | Note                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **`ghunna`**                                   | https://ghunna.com · https://github.com/mwiederrecht/ghunna | MIT; `/sources` both matns line-numbered; `docs/SPEC.md` id crosswalk; `/residue` 108 divergences |
| **quran-tajweed** (cpfair)                     | https://github.com/cpfair/quran-tajweed                     | the app's rule-id ancestor                                                                        |
| **quran/tajweed**                              | https://github.com/quran/tajweed                            | predecessor; self-described WIP                                                                   |
| **alquran.cloud** tajweed guide + colour table | https://legacy.alquran.cloud/tajweed-guide                  | their own convention, not KFGQPC                                                                  |
| Dar al-Maarifah colour-system explanation      | https://easyquranstore.com/ar/عن-مصحف-التجويد/              | 3-colour graded system, 28 ahkām                                                                  |
| Dar al-Maarifah mushaf scan                    | https://archive.org/details/mushaf-tajweed-darul-marifa     | scan; **not** a CC grant                                                                          |

**Curriculum**

| Source                                             | URL                                                                      | Note                              |
| -------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------- |
| Arabic101 — beginner                               | https://courses.arabic101.org/courses/tajweed-of-the-quran-from-a-z/     | free to view, copyrighted         |
| Arabic101 — intermediate                           | https://courses.arabic101.org/courses/intermediate-tajweed/              | 6 stages / 30 lessons             |
| Arabic101 — Day 1 transcript (stage/session/skill) | https://www.youtube.com/watch?v=oC_LBcbNCPM                              | 2021-04-13                        |
| Arabic101 — extended 33-item playlist              | https://www.youtube.com/playlist?list=PL6TlMIZ5ylgoA27YCmZYMCQCX7EUkfyHp | third-party mirror: elforqaan.com |
| Arabic101 — Quran Mastery levels                   | https://academy.arabic101.org/course-2-quran-mastery/                    | 60/70/50 lessons                  |

**Works investigated and ruled out**

| Work                                          | Verdict                                                                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| _al-Musassir al-Mufeed_ (Hiluz, 2010)         | All rights reserved. Best brief-fit, but copyrighted. Cite only. https://islamhouse.com/ar/books/320902/ · https://quranpedia.net/book/20526 |
| TARTĪL (IIUM/CELPAD, 2023)                    | All rights reserved, explicit on title page                                                                                                  |
| _Principles of Tajwīd_ (Ismail Muhammad Hadi) | Open-access copy exists; **check repository licence before reuse**                                                                           |
| archive.org PDF "CC" tags                     | Uploader assertion, not a licence grant                                                                                                      |
| "QPC V4 Tajweed" colour font                  | Third-party, not a KFGQPC publication                                                                                                        |
| KFGQPC tajweed colour legend                  | **Does not exist**                                                                                                                           |
