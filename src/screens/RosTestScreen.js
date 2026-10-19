import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAppTheme } from "../../providers/theme";
import {
  EXPECTED_HEX_TOPIC,
  OPEN_TOPBOX_TOPIC,
  ROSBRIDGE_URL,
  STATUS_NOTE_TOPIC,
  initRos,
  publishExpectedHex,
  subscribeOpenTopbox,
  subscribeStatusNote,
  subscribeRosBridge,
} from "../services/ros";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomThreeChars() {
  return Array.from({ length: 3 }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).join("");
}

function toExpectedHex(value) {
  const source = value.slice(0, 3);
  if (!source) return "";

  return `0x${Array.from(source)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")}`;
}

function normalizeHexInput(value) {
  const cleaned = (value || "")
    .replace(/[^0-9a-fx]/gi, "")
    .replace(/^0x/i, "")
    .toUpperCase();

  if (!cleaned) return "";
  return `0x${cleaned}`;
}

export default function RosTestScreen() {
  const router = useRouter();
  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === "dark";

  const [sampleText, setSampleText] = useState(() => randomThreeChars());
  const [hexInput, setHexInput] = useState("0x313233");
  const [lastPublished, setLastPublished] = useState("-");
  const [statusNote, setStatusNote] = useState("-");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [robotCatchStatus, setRobotCatchStatus] = useState("Waiting");
  const [lastGateValue, setLastGateValue] = useState("false");

  const suggestedHex = toExpectedHex(sampleText);

  useEffect(() => {
    initRos();

    const unsubscribeBridge = subscribeRosBridge((status) => {
      setConnectionStatus(status);
    });

    const unsubscribeStatus = subscribeStatusNote((message) => {
      setStatusNote(message || "-");
    });
    const unsubscribeGate = subscribeOpenTopbox((isOpen) => {
      setLastGateValue(isOpen ? "true" : "false");
      if (isOpen) {
        setRobotCatchStatus("Yes, robot caught the hex");
      }
    });

    return () => {
      try {
        unsubscribeStatus?.();
        unsubscribeGate?.();
      } catch { }
    };
  }, []);

  return (
    <LinearGradient colors={isDarkMode ? ["#020617", "#0f172a", "#020617"] : ["#0b2a6a", "#2563eb", "#0ea5e9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <MaterialIcons name="chevron-left" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>ROS Expected Hex</Text>
                <Text style={styles.subtitle}>
                  Status: {connectionStatus}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <MaterialIcons name="memory" size={18} color="#eaf2ff" />
                <Text style={styles.cardTitle}>Hex Publisher</Text>
              </View>

              <Text style={styles.label}>Expected hex to publish</Text>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(value) => setHexInput(normalizeHexInput(value))}
                placeholder="0x313233"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={[styles.input, isDarkMode && styles.inputDark]}
                value={hexInput}
              />

              <Text style={styles.label}>3-character helper</Text>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={3}
                onChangeText={(value) => setSampleText(value.toUpperCase().replace(/\s+/g, "").slice(0, 3))}
                placeholder="123"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={[styles.input, isDarkMode && styles.inputDark]}
                value={sampleText}
              />

              <View style={styles.hexBox}>
                <Text style={styles.labelAligned}>Suggested hex from helper</Text>
                <Text style={styles.hexValue}>{suggestedHex || "-"}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setSampleText(randomThreeChars())}>
                  <Text style={styles.secondaryBtnText}>Random 3 chars</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => {
                  if (!suggestedHex) return;
                  setHexInput(suggestedHex);
                }}>
                  <Text style={styles.secondaryBtnText}>Use helper hex</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryBtn} onPress={() => {
                  const normalized = normalizeHexInput(hexInput);
                  if (!normalized) return;
                  publishExpectedHex(normalized);
                  setHexInput(normalized);
                  setLastPublished(normalized);
                  setRobotCatchStatus("Waiting for robot");
                  setLastGateValue("false");
                }}>
                  <LinearGradient colors={isDarkMode ? ["#3b82f6", "#1d4ed8"] : ["#22c55e", "#16a34a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                    <Text style={styles.primaryBtnText}>Publish expected hex</Text>
                    <MaterialIcons name="publish" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <MaterialIcons name="info-outline" size={18} color="#eaf2ff" />
                <Text style={styles.cardTitle}>Status Information</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last published:</Text>
                <Text style={styles.infoValue}>{lastPublished}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Did robot catch hex?</Text>
                <Text style={styles.infoValue}>{robotCatchStatus}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last /open_topbox value:</Text>
                <Text style={styles.infoValue}>{lastGateValue}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status note:</Text>
                <Text style={[styles.infoValue, { color: isDarkMode ? "#60a5fa" : "#86efac" }]}>{statusNote}</Text>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 34,
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: "rgba(255,255,255,0.22)",
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  label: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 8,
  },
  labelAligned: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    borderRadius: 12,
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "center",
    letterSpacing: 2,
  },
  inputDark: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  hexBox: {
    alignItems: "center",
    marginVertical: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
  },
  hexValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  infoRow: {
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
    borderRadius: 10,
  },
  infoLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  infoValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  primaryGradient: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});
