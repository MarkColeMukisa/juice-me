import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { site } from "@/lib/site";
import { useColors } from "@/lib/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The glass's shape, in the logo's 512 box: the juice is clipped to it. */
const GLASS = "M150 170 H362 L338 430 Q336 452 314 452 H198 Q176 452 174 430 Z";
/** Where the juice starts (empty) and where it settles (the logo's level). */
const EMPTY = 470;
const FULL = 236;

const BROWN = "#3B1F0E";

/**
 * What the app opens on: the Juice Me glass fills with juice, the straw drops in, the leaf
 * pops, the name comes up, and "Powered by Nevela Framework" underneath. Then it fades into
 * the app. A tap skips it, and a phone set to reduce motion sees it settle at once.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const colors = useColors();
  const still = useReducedMotion();

  const glass = useSharedValue(still ? 1 : 0);
  const level = useSharedValue(still ? FULL : EMPTY);
  const straw = useSharedValue(still ? 1 : 0);
  const leaf = useSharedValue(still ? 1 : 0);
  const name = useSharedValue(still ? 1 : 0);
  const credit = useSharedValue(still ? 1 : 0);
  const shown = useSharedValue(1);

  const finish = () => {
    shown.value = withTiming(0, { duration: 320 }, (done) => {
      if (done) runOnJS(onDone)();
    });
  };

  useEffect(() => {
    if (still) {
      const timer = setTimeout(finish, 900);
      return () => clearTimeout(timer);
    }
    glass.value = withSpring(1, { damping: 12, stiffness: 140 });
    level.value = withDelay(350, withTiming(FULL, { duration: 950, easing: Easing.out(Easing.cubic) }));
    straw.value = withDelay(1050, withSpring(1, { damping: 10, stiffness: 160 }));
    leaf.value = withDelay(1250, withSequence(withSpring(1.25, { damping: 6, stiffness: 220 }), withSpring(1)));
    name.value = withDelay(1350, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }));
    credit.value = withDelay(1650, withTiming(1, { duration: 450 }));
    const timer = setTimeout(finish, 2600);
    return () => clearTimeout(timer);
    // Once, when it is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The juice: a wave on top that rises with the level.
  const juice = useAnimatedProps(() => {
    const top = level.value;
    return { d: `M140 ${top} Q182 ${top - 24} 224 ${top} T308 ${top} T392 ${top} V470 H140 Z` };
  });

  const glassStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, glass.value * 1.4), transform: [{ scale: 0.82 + 0.18 * glass.value }] }));
  const strawStyle = useAnimatedStyle(() => ({ opacity: straw.value, transform: [{ translateY: (1 - straw.value) * -60 }] }));
  const leafStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, leaf.value), transform: [{ scale: leaf.value }] }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: name.value, transform: [{ translateY: (1 - name.value) * 14 }] }));
  const creditStyle = useAnimatedStyle(() => ({ opacity: credit.value }));
  const screenStyle = useAnimatedStyle(() => ({ opacity: shown.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { backgroundColor: colors.background }, screenStyle]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${site.name}. Tap to skip`} style={styles.fill} onPress={finish}>
        <View style={styles.middle}>
          <Animated.View style={[styles.logo, glassStyle]}>
            {/* The straw, behind the glass, dropping in from above. */}
            <Animated.View style={[StyleSheet.absoluteFill, strawStyle]}>
              <Svg viewBox="0 0 512 512" width="100%" height="100%">
                <Path d="M286 200 L322 66 Q326 52 340 56 L378 66" fill="none" stroke="#7B2D8E" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Animated.View>
            {/* In a layer of its own, like the straw and the leaf, so the three stack in this order everywhere. */}
            <View style={StyleSheet.absoluteFill}>
            <Svg viewBox="0 0 512 512" width="100%" height="100%">
              <Defs>
                <LinearGradient id="juice" x1="0" y1="1" x2="0" y2="0">
                  <Stop offset="0" stopColor="#E8590C" />
                  <Stop offset="0.55" stopColor="#FF9F1C" />
                  <Stop offset="1" stopColor="#FFC94D" />
                </LinearGradient>
                <ClipPath id="glass">
                  <Path d={GLASS} />
                </ClipPath>
              </Defs>
              <G clipPath="url(#glass)">
                <Rect x={140} y={160} width={232} height={300} fill="#FFFFFF" />
                <AnimatedPath animatedProps={juice} fill="url(#juice)" />
                <Circle cx={214} cy={330} r={12} fill="#FFFFFF" opacity={0.55} />
                <Circle cx={244} cy={378} r={8} fill="#FFFFFF" opacity={0.45} />
                <Circle cx={290} cy={300} r={7} fill="#FFFFFF" opacity={0.5} />
              </G>
              <Path d={GLASS} fill="none" stroke={BROWN} strokeWidth={16} strokeLinejoin="round" />
              <G x={150} y={170}>
                <Circle r={58} fill="#FF9F1C" stroke={BROWN} strokeWidth={14} />
                <Circle r={40} fill="#FFD27A" />
                {[[0, -38], [33, -19], [33, 19], [0, 38], [-33, 19], [-33, -19]].map(([x, y]) => (
                  <Line key={`${x},${y}`} x1={0} y1={0} x2={x} y2={y} stroke="#FF9F1C" strokeWidth={6} strokeLinecap="round" />
                ))}
              </G>
            </Svg>
            </View>
            {/* The leaf, popping out at the rim. */}
            <Animated.View style={[StyleSheet.absoluteFill, leafStyle, { transformOrigin: "71% 33%" }]}>
              <Svg viewBox="0 0 512 512" width="100%" height="100%">
                <Path d="M362 170 Q420 128 446 168 Q404 204 362 170 Z" fill="#2F9E44" stroke={BROWN} strokeWidth={12} strokeLinejoin="round" />
              </Svg>
            </Animated.View>
          </Animated.View>

          <Animated.View style={nameStyle}>
            <Text accessibilityRole="header" style={[styles.name, { color: colors.text }]}>
              Juice <Text style={{ color: colors.brand }}>Me</Text>
            </Text>
            <Text style={[styles.tagline, { color: colors.muted }]}>Fresh juice, on campus</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.credit, creditStyle]}>
          <Text style={[styles.powered, { color: colors.muted }]}>
            Powered by <Text style={{ color: colors.text, fontWeight: "700" }}>Nevela Framework</Text>
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { zIndex: 10 },
  fill: { flex: 1 },
  middle: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  logo: { width: 200, height: 200 },
  name: { fontSize: 40, fontWeight: "800", letterSpacing: -1, textAlign: "center" },
  tagline: { fontSize: 15, textAlign: "center", marginTop: 2 },
  credit: { alignItems: "center", paddingBottom: 48 },
  powered: { fontSize: 13, letterSpacing: 0.2 },
});
