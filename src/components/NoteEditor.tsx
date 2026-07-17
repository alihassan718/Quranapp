import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useAnnotations } from '../state/AnnotationsContext';
import { useTheme } from '../theme/ThemeProvider';
import { haptics } from '../utils/haptics';
import { Icon } from './ui/Icon';
import { PressableScale } from './ui/PressableScale';
import { AppText } from './ui/Text';

interface NoteEditorProps {
  surah: number;
  ayah: number;
  onDone: () => void;
}

export function NoteEditor({ surah, ayah, onDone }: NoteEditorProps) {
  const theme = useTheme();
  const { getNote, saveNote, deleteNote } = useAnnotations();
  const existing = getNote(surah, ayah);
  const [text, setText] = useState(existing?.text ?? '');

  return (
    <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Icon name="create-outline" size={18} tone="accent" />
        <AppText variant="h3">Note on {surah}:{ayah}</AppText>
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        placeholder="Write your reflection, cross-reference, or question…"
        placeholderTextColor={theme.colors.textTertiary}
        style={{
          minHeight: 120,
          maxHeight: 240,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.base,
          fontFamily: theme.fonts.serif,
          fontSize: 16,
          lineHeight: 24,
          color: theme.colors.textPrimary,
          textAlignVertical: 'top',
        }}
      />

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.base }}>
        {existing ? (
          <PressableScale
            haptic="medium"
            onPress={async () => {
              await deleteNote(surah, ayah);
              onDone();
            }}
            style={{
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="trash-outline" size={20} color={theme.colors.danger} />
          </PressableScale>
        ) : null}
        <PressableScale
          haptic="medium"
          onPress={async () => {
            await saveNote(surah, ayah, text);
            haptics.success();
            onDone();
          }}
          style={{
            flex: 1,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="title" tone="onPrimary">
            Save note
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}
