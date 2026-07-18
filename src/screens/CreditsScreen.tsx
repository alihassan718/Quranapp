import React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Divider } from '../components/ui/Divider';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { AppText } from '../components/ui/Text';
import { LicenseStatus } from '../domain/models';
import { useTheme } from '../theme/ThemeProvider';

export function CreditsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Philosophy */}
        <Card surface="surface" elevation="sm" style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
          <AppText variant="h2">Sources & attribution</AppText>
          <AppText variant="body" tone="secondary">
            Bayān shows the documented lexical range author-lessly first, and named translations only as
            clearly-attributed references for comparison. The app takes no interpretive side. Every source below
            is credited both here and in context throughout the app.
          </AppText>
        </Card>

        {/* Data-under-test notice (private build) */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            padding: theme.spacing.base,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.danger,
            backgroundColor: theme.colors.dangerSoft,
            marginBottom: theme.spacing.lg,
          }}
        >
          <Icon name="flask-outline" size={16} color={theme.colors.danger} />
          <AppText variant="caption" tone={theme.colors.danger} style={{ flex: 1 }}>
            DATA UNDER TEST — not yet scholar-reviewed. Morphology and lexicon are imported verbatim from the
            sources below but have not been verified by a specialist. Meanings may be incomplete: about a fifth
            of roots (including some very common ones) have no bundled lexicon entry and show no meaning — these
            are left blank, never invented. Treat everything here as a study aid to check against the sources,
            not as final scholarship.
          </AppText>
        </View>

        <SectionHeader text="DATA SOURCES" />

        <CreditBlock
          title="Qur'anic text"
          source="Tanzil Project"
          status="public-domain"
          statusLabel="CC BY 3.0"
          link="https://tanzil.net"
          lines={[
            'Uthmani script. Used verbatim (modification is not permitted).',
            'Tanzil Qur\'an Text — Copyright © Tanzil Project. Licensed under Creative Commons Attribution 3.0. Match the exact copyright year to the version you bundle.',
          ]}
        />

        <CreditBlock
          title="Word morphology"
          source="Quranic Arabic Corpus, morphology v0.4"
          status="licensed"
          statusLabel="GNU GPL"
          link="https://corpus.quran.com"
          lines={[
            'Root, lemma, part of speech, and grammatical features for every word — imported verbatim from the Quranic Arabic Corpus.',
            'Copyright © 2011 Kais Dukes (University of Leeds). Used with its source clearly indicated and a link to corpus.quran.com, per its terms of use.',
            'Cite: Dukes & Habash, “Morphological Annotation of Quranic Arabic”, LREC 2010.',
          ]}
        />

        <CreditBlock
          title="Lexicon (root → meanings)"
          source="Lane's Arabic-English Lexicon, via the Perseus Digital Library"
          status="public-domain"
          statusLabel="CC BY-SA 3.0"
          link="https://www.perseus.tufts.edu"
          lines={[
            'Edward William Lane, An Arabic-English Lexicon (Williams & Norgate, 1863) — the underlying text is public domain.',
            'Digitized by the Perseus Digital Library, Tufts University, under Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0); this lexicon data is redistributed under the same terms.',
            'Only Lane\'s verbatim English definitions are bundled. About 81% of Qur\'anic roots have an entry; the rest (including some high-frequency roots) show no meaning and are left blank — never invented.',
          ]}
        />

        <SectionHeader text="REFERENCE TRANSLATIONS" />

        <CreditBlock
          title="Abdullah Yusuf Ali"
          source="The Holy Qur'an: Text, Translation and Commentary (1934)"
          status="public-domain"
          statusLabel="Public domain"
          lines={['Widely treated as public domain; distributed by the Tanzil Project.']}
        />
        <CreditBlock
          title="Marmaduke Pickthall"
          source="The Meaning of the Glorious Koran (1930)"
          status="public-domain"
          statusLabel="Public domain"
          lines={['Alfred A. Knopf, New York, 1930. Widely treated as public domain; distributed by the Tanzil Project.']}
        />
        <CreditBlock
          title="George Sale"
          source="The Koran (Alcoran of Mohammed) (1734)"
          status="public-domain"
          statusLabel="Public domain"
          lines={['London, 1734. Unambiguously public domain — included as the clean-PD third rendering.']}
        />
        <CreditBlock
          title="M. H. Shakir"
          source="The Holy Qur'an"
          status="contested"
          statusLabel="Rights contested"
          lines={['Copyright claimed by Tahrike Tarsile Qur\'an, Inc.; reportedly derivative of Muhammad Ali (1917).']}
          warn="Not bundled. This translator appears as a placeholder only. Supply verified text yourself, and enable it, only if you have confirmed the rights."
        />

        <SectionHeader text="TYPEFACES" />
        <CreditBlock
          title="Amiri Quran"
          source="The Amiri Quran Project Authors"
          status="licensed"
          statusLabel="SIL OFL 1.1"
          link="https://github.com/aliftype/amiri"
          lines={['Qur\'anic Arabic typeface. Bundled under the SIL Open Font License 1.1 (OFL.txt included).']}
        />
        <CreditBlock
          title="Scheherazade New"
          source="SIL Global"
          status="licensed"
          statusLabel="SIL OFL 1.1"
          link="https://software.sil.org/scheherazade"
          lines={['Alternative Arabic typeface. “Scheherazade” and “SIL” are reserved font names.']}
        />
        <CreditBlock
          title="Spectral"
          source="Production Type"
          status="licensed"
          statusLabel="SIL OFL 1.1"
          lines={['Latin serif used for the interface. Bundled under the SIL Open Font License 1.1.']}
        />

        <View
          style={{
            marginTop: theme.spacing.lg,
            padding: theme.spacing.base,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <AppText variant="caption" tone="tertiary">
            This screen documents sources for attribution and transparency. It is not legal advice — verify each
            licence against the exact data and fonts you bundle before public release.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );

  function SectionHeader({ text }: { text: string }) {
    return (
      <AppText variant="overline" tone="tertiary" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        {text}
      </AppText>
    );
  }

  function CreditBlock({
    title,
    source,
    status,
    statusLabel,
    link,
    lines,
    warn,
  }: {
    title: string;
    source: string;
    status: LicenseStatus;
    statusLabel: string;
    link?: string;
    lines: string[];
    warn?: string;
  }) {
    const statusColor =
      status === 'contested'
        ? { bg: theme.colors.dangerSoft, fg: theme.colors.danger }
        : status === 'licensed'
          ? { bg: theme.colors.goldSoft, fg: theme.colors.goldText }
          : { bg: theme.colors.primarySoft, fg: theme.colors.primaryText };
    return (
      <Card surface="surface" elevation="none" style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
          <AppText variant="h3" style={{ flex: 1 }}>
            {title}
          </AppText>
          <Chip label={statusLabel} small bg={statusColor.bg} fg={statusColor.fg} />
        </View>
        <AppText variant="callout" tone="secondary">
          {source}
        </AppText>
        <Divider />
        {lines.map((l, i) => (
          <AppText key={i} variant="caption" tone="tertiary">
            {l}
          </AppText>
        ))}
        {warn ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: 2 }}>
            <Icon name="alert-circle-outline" size={14} color={theme.colors.danger} />
            <AppText variant="caption" tone={theme.colors.danger} style={{ flex: 1 }}>
              {warn}
            </AppText>
          </View>
        ) : null}
        {link ? (
          <PressableScale
            haptic="selection"
            activeScale={0.98}
            onPress={() => Linking.openURL(link)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}
          >
            <Icon name="link-outline" size={14} tone="accent" />
            <AppText variant="caption" tone="accent">
              {link.replace('https://', '')}
            </AppText>
          </PressableScale>
        ) : null}
      </Card>
    );
  }
}
