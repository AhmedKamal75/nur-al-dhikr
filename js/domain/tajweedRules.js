/** Runtime mirror of data/tajweed-rules.json. Parity-tested. No detector cutover. */
export const TAJWEED_RULE_REGISTRY = deepFreeze({
  schemaVersion: 1,
  recitationProfile: {
    id: 'hafs-uthmani-ayah-final-v1',
    riwayah: 'hafs-an-asim',
    rasm: 'uthmani',
    pause: 'ayah-final',
  },
  conventions: {
    lpmq: {
      url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
      locator: 'Bab II',
      kind: 'published-rule-level',
      siteVerification: 'unknown',
    },
    'dar-al-maarifah': {
      url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
      locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
      kind: 'observation-only',
      siteVerification: 'partial',
    },
  },
  rules: [
    {
      id: 'hamzat_wasl',
      family: 'silent',
      labels: {
        en: 'Hamzat al-Wasl',
        ar: 'همزة الوصل',
      },
      sourceKeys: ['hamzat_wasl'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'lam_shamsiyyah',
      family: 'silent',
      labels: {
        en: 'Lam Shamsiyyah',
        ar: 'اللام الشمسية',
      },
      sourceKeys: ['lam_shamsiyyah'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'ghunnah',
      family: 'nasal',
      labels: {
        en: 'Ghunnah',
        ar: 'الغنة',
      },
      sourceKeys: ['ghunnah'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'ikhfa',
      family: 'nasal',
      labels: {
        en: 'Ikhfa',
        ar: 'الإخفاء',
      },
      sourceKeys: ['ikhfa'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'izhar',
      family: 'plain',
      labels: {
        en: 'Izhar (clear noon)',
        ar: 'الإظهار الحلقي والمطلق',
      },
      sourceKeys: ['izhar'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'iqlab',
      family: 'nasal',
      labels: {
        en: 'Iqlab',
        ar: 'الإقلاب',
      },
      sourceKeys: ['iqlab'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'idgham_ghunnah',
      family: 'nasal',
      labels: {
        en: 'Idgham (with Ghunnah)',
        ar: 'الإدغام بغنة',
      },
      sourceKeys: ['idgham_ghunnah'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'idgham_no_ghunnah',
      family: 'plain',
      labels: {
        en: 'Idgham (no Ghunnah)',
        ar: 'الإدغام بلا غنة',
      },
      sourceKeys: ['idgham_no_ghunnah'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'idgham_shafawi',
      family: 'nasal',
      labels: {
        en: 'Idgham Shafawi',
        ar: 'الإدغام الشفوي',
      },
      sourceKeys: ['idgham_shafawi'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'ikhfa_shafawi',
      family: 'nasal',
      labels: {
        en: 'Ikhfa Shafawi',
        ar: 'الإخفاء الشفوي',
      },
      sourceKeys: ['ikhfa_shafawi'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'izhar_shafawi',
      family: 'plain',
      labels: {
        en: 'Izhar Shafawi',
        ar: 'الإظهار الشفوي',
      },
      sourceKeys: ['izhar_shafawi'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'qalqalah',
      family: 'qalqalah',
      labels: {
        en: 'Qalqalah',
        ar: 'القلقلة',
      },
      sourceKeys: ['qalqalah'],
      scope: 'contested',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'tafkhim',
      family: 'heavy',
      labels: {
        en: 'Tafkhim (heavy)',
        ar: 'التفخيم',
      },
      sourceKeys: ['tafkhim'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'madd_2',
      family: 'madd',
      labels: {
        en: 'Madd (natural, 2 counts)',
        ar: 'المد الطبيعي',
      },
      sourceKeys: ['madd_2'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'madd_iwad',
      family: 'madd',
      labels: {
        en: "Madd 'Iwad (compensating, at a stop)",
        ar: 'مد العِوَض',
      },
      sourceKeys: ['madd_iwad'],
      scope: 'contested',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'madd_badal',
      family: 'madd',
      labels: {
        en: 'Madd Badal (2 counts)',
        ar: 'مد البدل',
      },
      sourceKeys: ['madd_badal'],
      scope: 'contested',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'madd_246',
      family: 'madd',
      labels: {
        en: "Madd 'Arid (at a stop, 2–6)",
        ar: 'المد العارض للسكون',
      },
      sourceKeys: ['madd_246'],
      scope: 'contested',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'madd_munfasil',
      family: 'madd',
      labels: {
        en: 'Madd Munfasil (separated, 2–4–6)',
        ar: 'المد المنفصل',
      },
      sourceKeys: ['madd_munfasil'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'madd_silah',
      family: 'madd',
      labels: {
        en: 'Madd as-Silah (ه pronoun, 2–4–6)',
        ar: 'مد الصلة',
      },
      sourceKeys: ['madd_silah'],
      scope: 'contested',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'madd_muttasil',
      family: 'madd',
      labels: {
        en: 'Madd Muttasil (connected, 4–5)',
        ar: 'المد المتصل',
      },
      sourceKeys: ['madd_muttasil'],
      scope: 'existing',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'madd_6',
      family: 'madd',
      labels: {
        en: 'Madd Lazim (necessary, 6)',
        ar: 'المد اللازم',
      },
      sourceKeys: ['madd_6'],
      scope: 'contested',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
    {
      id: 'madd_4_6',
      family: 'madd',
      labels: {
        en: 'Madd al-Līn of ʿAyn (4 or 6)',
        ar: 'مد اللين في حرف العين (أربع أو ست حركات)',
      },
      sourceKeys: ['madd_4_6'],
      scope: 'contested',
      predicate: 'existingClassifier',
      conventions: {
        lpmq: {
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
          status: 'existing-detection-unreviewed-convention',
        },
        'dar-al-maarifah': {
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
          status: 'existing-detection-unreviewed-convention',
        },
      },
    },
  ],
  pendingRules: [
    {
      id: 'idgham_mutajanisayn',
      predicate: 'verifiedSite',
      scope: 'pending-site-verification',
      conventions: {
        lpmq: {
          active: true,
          shippingEnabled: false,
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
        },
        'dar-al-maarifah': {
          active: false,
          shippingEnabled: false,
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
        },
      },
    },
    {
      id: 'idgham_mutaqaribayn',
      predicate: 'verifiedSite',
      scope: 'pending-site-verification',
      conventions: {
        lpmq: {
          active: true,
          shippingEnabled: false,
          citation: {
            url: 'https://tashih.kemenag.go.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf',
            locator: 'Bab II',
            kind: 'published-rule-level',
            siteVerification: 'unknown',
          },
        },
        'dar-al-maarifah': {
          active: false,
          shippingEnabled: false,
          citation: {
            url: 'https://archive.org/details/Tajweed-Quran-Arabic-114638',
            locator: 'Printed page key; per-site matrix v2 (2026-11-23)',
            kind: 'observation-only',
            siteVerification: 'partial',
          },
        },
      },
    },
  ],
  verification: {
    matrixVersion: 2,
    totalSites: 71,
    damVerified: 13,
    damPending: 58,
    lpmqSiteVerification: 'unknown',
    complete: false,
  },
});
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Closed predicate set. Unknown site evidence never returns a span. */
export const TAJWEED_PREDICATES = Object.freeze({
  existingClassifier: (spans, ruleId) =>
    Array.isArray(spans) ? spans.filter((s) => s.rule === ruleId) : [],
  verifiedSite: (site) =>
    site?.verification === 'verified' &&
    site?.source &&
    Number.isInteger(site.start) &&
    Number.isInteger(site.end) &&
    site.start >= 0 &&
    site.end > site.start
      ? [{ start: site.start, end: site.end, rule: site.rule }]
      : [],
});
