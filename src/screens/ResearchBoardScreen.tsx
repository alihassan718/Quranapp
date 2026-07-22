import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Platform, TextInput, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  makeMutable,
  runOnJS,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ArabicText } from '../components/ArabicText';
import { FIELD_LABELS, fieldDot } from '../components/research/ResearchEntryCard';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Icon, IconName } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { AppText } from '../components/ui/Text';
import { getResearchEntry } from '../data/researchStore';
import { SURAH_META } from '../data/registry';
import {
  addBoardEdge,
  BoardEdge,
  BoardNode,
  getBoardEdges,
  getBoardNodes,
  moveBoardNode,
  removeBoardEdge,
  removeBoardNode,
  setBoardNodeNote,
  updateBoardEdge,
} from '../data/userStore';
import { useUserDb } from '../state/DatabaseProvider';
import { useAppNavigation } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { haptics } from '../utils/haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const WORLD = 4000; // world-space canvas size (px, unscaled)
const WORLD_C = WORLD / 2; // RN view transforms act about the view's CENTER
const NODE_W = 176;

// ANDROID HARD CONSTRAINT: react-native-svg's SvgView rasterizes itself into a
// view-sized ARGB bitmap on every draw (SvgView.drawOutput → Bitmap.createBitmap
// of the view's PIXEL size, even with zero children). A world-sized Svg is
// ~12000×12000 px on a 3× phone ≈ 576 MB → instant OOM abort ("app keeps
// stopping"). So: no Svg may ever be laid out bigger than the screen. Edges are
// drawn in ONE screen-sized Svg with world→screen math done in worklets, and
// the dot grid is a tiled Image (images draw via GPU shader, no such bitmap).
const DOT_TILE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAADJUlEQVR4Ae3BoXEYBBzG0V//xGQCJENU43KxZQQWiYrJRBwXi84cHaEGgahA9DrB99779Pb2FrDpAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmHUBsy5g1gXMuoBZFzDrAmZdwKwLmPUQiz5XL9Vz371Xr9VHTHmINZ+rf6rH/veleq5+rz5ixsWal+qxHz1WLzHlYs1zP/ccUy5g1sWa937uPaZcrHmtvvWjb9VrTPnl6ekppnyt/q5+rX6r/q3+qv6sPmLKQyz6qP6IeRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCsC5h1AbMuYNYFzLqAWRcw6wJmXcCs/wAd6RXa2lgSJgAAAABJRU5ErkJggg==';

type Pos = { x: SharedValue<number>; y: SharedValue<number> };
type Camera = { tx: SharedValue<number>; ty: SharedValue<number>; scale: SharedValue<number> };
type Selection = { kind: 'node'; id: number } | { kind: 'edge'; id: number } | null;

/**
 * My Board — the user's own thinking space. Pin entries and āyāt as nodes,
 * drag them freely, and draw labeled connections between them. Everything
 * here is user-made, stored on-device in the user DB, surviving updates.
 */
export function ResearchBoardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useUserDb();
  const navigation = useAppNavigation();

  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  // connectFrom drives UI through state, but gesture callbacks read the REF:
  // node tap handlers live inside memoized RNGH gestures whose callbacks are
  // not reliably rebound on re-render, so a state closure goes stale there.
  const [connectFrom, setConnectFromState] = useState<number | null>(null);
  const connectFromRef = useRef<number | null>(null);
  const setConnectFrom = useCallback((v: number | null) => {
    connectFromRef.current = v;
    setConnectFromState(v);
  }, []);
  const [editing, setEditing] = useState<
    | { kind: 'node-note'; id: number; initial: string }
    | { kind: 'edge-label'; id: number | { from: number; to: number }; initial: string }
    | null
  >(null);

  // World-space positions as shared values, created OUTSIDE hooks so nodes and
  // edges can share them without hook-ordering issues.
  const positions = useRef<Map<number, Pos>>(new Map());
  const ensurePos = useCallback((n: BoardNode): Pos => {
    let p = positions.current.get(n.id);
    if (!p) {
      p = { x: makeMutable(n.x), y: makeMutable(n.y) };
      positions.current.set(n.id, p);
    }
    return p;
  }, []);

  const reload = useCallback(async () => {
    const [ns, es] = [await getBoardNodes(db), await getBoardEdges(db)];
    for (const n of ns) ensurePos(n);
    setNodes(ns);
    setEdges(es);
  }, [db, ensurePos]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  /* ---- canvas pan + pinch (all UI-thread; start values are shared, not refs) ---- */
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const startScale = useSharedValue(1);

  const canvasPan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    });
  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(2.5, Math.max(0.4, startScale.value * e.scale));
    });
  const canvasGesture = Gesture.Simultaneous(canvasPan, pinch);
  const camera = useMemo<Camera>(() => ({ tx, ty, scale }), [tx, ty, scale]);

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));
  // Same transform for the grid layer, which sits BELOW the screen-space edge
  // Svg while the node layer sits above it (grid < edges < nodes).
  const gridStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  /* ---- interactions ---- */
  const onNodeTap = useCallback(
    (node: BoardNode) => {
      const from = connectFromRef.current;
      if (from != null && from !== node.id) {
        setEditing({ kind: 'edge-label', id: { from, to: node.id }, initial: '' });
        setConnectFrom(null);
        return;
      }
      setSelection((cur) => (cur?.kind === 'node' && cur.id === node.id ? null : { kind: 'node', id: node.id }));
      haptics.selection();
    },
    [setConnectFrom],
  );

  const selectedNode = selection?.kind === 'node' ? nodes.find((n) => n.id === selection.id) : undefined;
  const selectedEdge = selection?.kind === 'edge' ? edges.find((e) => e.id === selection.id) : undefined;

  const openSelected = useCallback(() => {
    if (!selectedNode) return;
    if (selectedNode.type === 'entry') {
      navigation.navigate('ResearchEntry', { entryId: selectedNode.refId });
    } else {
      const [s, a] = selectedNode.refId.split(':').map(Number);
      if (s && a) navigation.navigate('Reader', { surah: s, ayah: a });
    }
  }, [selectedNode, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Canvas */}
      <GestureDetector gesture={canvasGesture}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {/* dot grid backdrop (subtle, non-interactive): a tiny tiled PNG,
              NOT an Svg — see the DOT_TILE note above */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: WORLD,
                height: WORLD,
                opacity: theme.scheme === 'dark' ? 0.5 : 0.4,
              },
              // RN-web's <Image> stretches instead of tiling, so tile via CSS there.
              Platform.OS === 'web'
                ? ({ backgroundImage: `url(${DOT_TILE})`, backgroundRepeat: 'repeat' } as unknown as ViewStyle)
                : null,
              gridStyle,
            ]}
          >
            {Platform.OS === 'web' ? null : (
              <Image
                source={{ uri: DOT_TILE }}
                resizeMode="repeat"
                fadeDuration={0}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </Animated.View>

          {/* edges: ONE screen-sized Svg (never world-sized — see DOT_TILE
              note); paths convert world→screen in their worklets so they
              still track nodes live during drag/pan/pinch */}
          <Svg
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="box-none"
          >
            {edges.map((e) => {
              const a = positions.current.get(e.fromId);
              const b = positions.current.get(e.toId);
              if (!a || !b) return null;
              return (
                <EdgePath
                  key={e.id}
                  a={a}
                  b={b}
                  camera={camera}
                  color={selection?.kind === 'edge' && selection.id === e.id ? theme.colors.primary : theme.colors.borderStrong}
                  onPress={() => {
                    setSelection({ kind: 'edge', id: e.id });
                    haptics.selection();
                  }}
                />
              );
            })}
          </Svg>

          <Animated.View
            pointerEvents="box-none"
            style={[{ position: 'absolute', width: WORLD, height: WORLD }, worldStyle]}
          >
            {/* edge labels */}
            {edges.map((e) => {
              const a = positions.current.get(e.fromId);
              const b = positions.current.get(e.toId);
              if (!a || !b || !e.label) return null;
              return <EdgeLabel key={`lbl-${e.id}`} a={a} b={b} label={e.label} />;
            })}

            {/* nodes */}
            {nodes.map((n) => (
              <BoardNodeView
                key={n.id}
                node={n}
                pos={ensurePos(n)}
                scale={scale}
                selected={selection?.kind === 'node' && selection.id === n.id}
                connectSource={connectFrom === n.id}
                onTap={onNodeTap}
                onDragEnd={(x, y) => {
                  void moveBoardNode(db, n.id, x, y);
                }}
              />
            ))}
          </Animated.View>

          {/* Empty state */}
          {nodes.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl }}>
              <Icon name="git-network-outline" size={40} tone="tertiary" />
              <AppText variant="h3" style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
                Your board is empty
              </AppText>
              <AppText variant="callout" tone="secondary" style={{ textAlign: 'center', marginTop: 6, maxWidth: 320 }}>
                Pin entries with the 📌 button (and āyāt from the Reader), drag them around, and draw your own
                connections — this space is yours.
              </AppText>
              <PressableScale
                haptic="selection"
                activeScale={0.97}
                onPress={() => navigation.goBack()}
                style={{
                  marginTop: theme.spacing.lg,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.md,
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <AppText variant="title" tone="onPrimary">
                  Browse entries
                </AppText>
              </PressableScale>
            </View>
          ) : null}
        </View>
      </GestureDetector>

      {/* Connect-mode banner */}
      {connectFrom != null ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: theme.spacing.lg,
            right: theme.spacing.lg,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.primarySoft,
            padding: theme.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <Icon name="git-branch-outline" size={16} tone="accent" />
          <AppText variant="label" tone={theme.colors.primaryText} style={{ flex: 1 }}>
            Tap another node to connect
          </AppText>
          <PressableScale haptic="selection" activeScale={0.9} onPress={() => setConnectFrom(null)}>
            <Icon name="close" size={16} tone="secondary" />
          </PressableScale>
        </View>
      ) : null}

      {/* Selection action bar */}
      {selectedNode || selectedEdge ? (
        <View
          style={{
            position: 'absolute',
            left: theme.spacing.lg,
            right: theme.spacing.lg,
            bottom: insets.bottom + theme.spacing.base,
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.backgroundElevated,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.sm,
            flexDirection: 'row',
            justifyContent: 'space-around',
            ...theme.elevation.lg,
          }}
        >
          {selectedNode ? (
            <>
              <BarAction icon="open-outline" label="Open" onPress={openSelected} />
              <BarAction
                icon="git-branch-outline"
                label="Connect"
                onPress={() => {
                  setConnectFrom(selectedNode.id);
                  setSelection(null);
                }}
              />
              <BarAction
                icon={selectedNode.note ? 'reader' : 'reader-outline'}
                label="Note"
                onPress={() => setEditing({ kind: 'node-note', id: selectedNode.id, initial: selectedNode.note ?? '' })}
              />
              <BarAction
                icon="trash-outline"
                label="Unpin"
                danger
                onPress={async () => {
                  await removeBoardNode(db, selectedNode.id);
                  positions.current.delete(selectedNode.id);
                  setSelection(null);
                  haptics.medium();
                  void reload();
                }}
              />
            </>
          ) : selectedEdge ? (
            <>
              <BarAction
                icon="pricetag-outline"
                label={selectedEdge.label ? 'Edit label' : 'Add label'}
                onPress={() => setEditing({ kind: 'edge-label', id: selectedEdge.id, initial: selectedEdge.label ?? '' })}
              />
              <BarAction
                icon="trash-outline"
                label="Remove"
                danger
                onPress={async () => {
                  await removeBoardEdge(db, selectedEdge.id);
                  setSelection(null);
                  haptics.medium();
                  void reload();
                }}
              />
            </>
          ) : null}
        </View>
      ) : null}

      {/* Note / label editor sheet */}
      <BottomSheet visible={editing != null} onClose={() => setEditing(null)} maxHeightRatio={0.6}>
        {editing ? (
          <BoardTextEditor
            title={editing.kind === 'node-note' ? 'Note on this node' : 'Connection label'}
            placeholder={
              editing.kind === 'node-note'
                ? 'Your thought about this…'
                : 'In your own words: “both about time”, “contradicts?”…'
            }
            initial={editing.initial}
            onDone={async (text) => {
              if (editing.kind === 'node-note') {
                await setBoardNodeNote(db, editing.id, text);
              } else if (typeof editing.id === 'number') {
                await updateBoardEdge(db, editing.id, { label: text || null });
              } else {
                await addBoardEdge(db, editing.id.from, editing.id.to, text || null);
                haptics.success();
              }
              setEditing(null);
              void reload();
            }}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}

/* ------------------------------------------------------------------ */

function BoardNodeView({
  node,
  pos,
  scale,
  selected,
  connectSource,
  onTap,
  onDragEnd,
}: {
  node: BoardNode;
  pos: Pos;
  scale: SharedValue<number>;
  selected: boolean;
  connectSource: boolean;
  onTap: (n: BoardNode) => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const theme = useTheme();
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const lift = useSharedValue(0);

  // Drag runs on the UI thread (worklets touch only shared values, so it stays
  // 60fps); only the DB write and selection cross to JS via runOnJS. Tap to
  // select vs. drag to move is resolved by a Race on movement distance.
  const composed = useMemo(() => {
    const t = Gesture.Tap()
      .maxDistance(8)
      .onEnd((_e, success) => {
        if (success) runOnJS(onTap)(node);
      });
    const p = Gesture.Pan()
      .minDistance(4)
      .onStart(() => {
        startX.value = pos.x.value;
        startY.value = pos.y.value;
        lift.value = withSpring(1, { damping: 16, stiffness: 240 });
      })
      .onUpdate((e) => {
        pos.x.value = startX.value + e.translationX / scale.value;
        pos.y.value = startY.value + e.translationY / scale.value;
      })
      .onEnd(() => {
        lift.value = withSpring(0, { damping: 14, stiffness: 200 });
      })
      .onFinalize(() => {
        runOnJS(onDragEnd)(Math.round(pos.x.value), Math.round(pos.y.value));
      });
    return Gesture.Race(p, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, onTap, onDragEnd, scale, pos]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: pos.x.value },
      { translateY: pos.y.value },
      { scale: 1 + lift.value * 0.04 },
    ],
  }));

  const entry = node.type === 'entry' ? getResearchEntry(node.refId) : undefined;
  const ayahRef = node.type === 'ayah' ? node.refId.split(':').map(Number) : null;
  const surahMeta = ayahRef ? SURAH_META.find((s) => s.number === ayahRef[0]) : null;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: NODE_W,
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surface,
            borderWidth: selected || connectSource ? 2 : 1,
            borderColor: connectSource
              ? theme.colors.gold
              : selected
                ? theme.colors.primary
                : theme.colors.border,
            padding: theme.spacing.md,
            gap: 6,
            ...theme.elevation.md,
          },
          style,
        ]}
      >
        {node.type === 'entry' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: fieldDot(theme, entry?.field ?? '') }}
              />
              <AppText variant="overline" tone="tertiary">
                {entry ? FIELD_LABELS[entry.field] : 'ENTRY'}
              </AppText>
            </View>
            <AppText variant="label" numberOfLines={3}>
              {entry?.title ?? `(removed: ${node.refId})`}
            </AppText>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="book-outline" size={12} tone="accent" />
              <AppText variant="overline" tone="tertiary">
                Q {node.refId}
              </AppText>
            </View>
            {surahMeta ? (
              <ArabicText text={surahMeta.nameArabic} size={18} scaled={false} align="left" />
            ) : null}
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {surahMeta?.nameTransliteration ?? 'Verse'}
            </AppText>
          </>
        )}
        {node.note ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="reader-outline" size={11} color={theme.colors.goldText} />
            <AppText variant="caption" tone={theme.colors.goldText} numberOfLines={1} style={{ flex: 1 }}>
              {node.note}
            </AppText>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * A gently curved connection line that follows both endpoints live. Endpoints
 * are world-space shared values, but the path renders inside the SCREEN-sized
 * Svg, so the worklet mirrors the world view's transform (which RN applies
 * about the view's center) to keep edges registered with nodes at every zoom.
 */
function EdgePath({
  a,
  b,
  camera,
  color,
  onPress,
}: {
  a: Pos;
  b: Pos;
  camera: Camera;
  color: string;
  onPress: () => void;
}) {
  const props = useAnimatedProps(() => {
    const s = camera.scale.value;
    const ox = camera.tx.value + WORLD_C * (1 - s);
    const oy = camera.ty.value + WORLD_C * (1 - s);
    const x1 = ox + s * (a.x.value + NODE_W / 2);
    const y1 = oy + s * (a.y.value + 44);
    const x2 = ox + s * (b.x.value + NODE_W / 2);
    const y2 = oy + s * (b.y.value + 44);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - Math.min(60, Math.abs(x2 - x1) * 0.15);
    return { d: `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}` };
  });
  return (
    <>
      <AnimatedPath animatedProps={props} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* generous invisible hit area */}
      <AnimatedPath animatedProps={props} stroke="transparent" strokeWidth={26} fill="none" onPress={onPress} />
    </>
  );
}

/** The user's own words on a connection, floating at its midpoint. */
function EdgeLabel({ a, b, label }: { a: Pos; b: Pos; label: string }) {
  const theme = useTheme();
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (a.x.value + b.x.value) / 2 + NODE_W / 2 - 60 },
      { translateY: (a.y.value + b.y.value) / 2 + 24 },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 120,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: theme.colors.goldSoft,
          borderRadius: theme.radii.pill,
          paddingHorizontal: 10,
          paddingVertical: 3,
          maxWidth: 120,
        }}
      >
        <AppText variant="caption" tone={theme.colors.goldText} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Animated.View>
  );
}

function BarAction({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: IconName;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale haptic="selection" activeScale={0.9} onPress={onPress} style={{ alignItems: 'center', gap: 2, minWidth: 64 }}>
      <Icon name={icon} size={20} color={danger ? theme.colors.danger : theme.colors.primary} />
      <AppText variant="caption" tone={danger ? theme.colors.danger : 'secondary'}>
        {label}
      </AppText>
    </PressableScale>
  );
}

function BoardTextEditor({
  title,
  placeholder,
  initial,
  onDone,
}: {
  title: string;
  placeholder: string;
  initial: string;
  onDone: (text: string) => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState(initial);
  return (
    <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs, gap: theme.spacing.base }}>
      <AppText variant="h3">{title}</AppText>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        style={{
          minHeight: 80,
          maxHeight: 180,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.base,
          fontFamily: theme.fonts.serif,
          fontSize: 16,
          color: theme.colors.textPrimary,
          textAlignVertical: 'top',
        }}
      />
      <PressableScale
        haptic="medium"
        onPress={() => onDone(text)}
        style={{
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
        }}
      >
        <AppText variant="title" tone="onPrimary">
          Save
        </AppText>
      </PressableScale>
    </View>
  );
}

