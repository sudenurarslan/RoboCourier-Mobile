import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export function BackgroundCircles() {
  return (
    <>
      {/* Top-left large circle */}
      <View style={[styles.circle, styles.circle1]} />
      {/* Bottom-right, smaller and different color */}
      <View style={[styles.circle, styles.circle2]} />
      {/* Bottom-center fade blob */}
      <View style={[styles.circle, styles.circle3]} />
    </>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.27,
    zIndex: 0,
  },
  circle1: {
    width: width * 1.1,
    height: width * 1.1,
    backgroundColor: Colors.light.accent,
    top: -width * 0.45,
    left: -width * 0.28,
  },
  circle2: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: Colors.light.secondary,
    bottom: -width * 0.19,
    right: -width * 0.15,
  },
  circle3: {
    width: width * 0.8,
    height: width * 0.2,
    backgroundColor: Colors.light.accent,
    bottom: -width * 0.12,
    left: width * 0.17,
    opacity: 0.17,
    borderRadius: width,
  },
});
