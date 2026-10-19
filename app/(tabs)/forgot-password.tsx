import { getApiBaseUrl } from '@/lib/api';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const API_BASE_URL = getApiBaseUrl();

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { t } = useLanguage();
    const { effectiveColorScheme } = useAppTheme();
    const isDarkMode = effectiveColorScheme === 'dark';
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(25)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 35,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleReset = async () => {
        setError("");

        if (!email.trim()) {
            setError(t('fillAllFields'));
            return;
        }

        if (!email.includes("@")) {
            setError(t('invalidEmail'));
            return;
        }

        setIsLoading(true);

        try {
            const resp = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await resp.json();

            if (!resp.ok) {
                setError(data.error || "Şifre yenileme başarısız oldu.");
                return;
            }

            Alert.alert(
                t('accountCreatedTitle'), // Success
                data.message || t('resetInstructionsSent'),
                [
                    {
                        text: "OK",
                        onPress: () => router.push("/login"),
                    },
                ]
            );
            setEmail("");
            setError("");
        } catch (err) {
            console.error("RESET ERROR:", err);
            setError("Ağ hatası: Şifre yenileme talimatı gönderilemedi.");
        } finally {
            setIsLoading(false);
        }
    };

    const getBorderColor = (inputName: string) => {
        if (error) return '#ef4444';
        return focusedInput === inputName ? '#3b82f6' : 'rgba(203,213,225,0.35)';
    };

    const getInputBackgroundColor = (inputName: string) => {
        return focusedInput === inputName ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)';
    };

    return (
        <LinearGradient
            colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#1e40af', '#3b82f6', '#0ea5e9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBg}
        >
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                <StatusBar barStyle="light-content" />

                <View style={styles.backgroundLayer} pointerEvents="none">
                    <View style={[styles.circle, styles.circleTopLeft]} />
                    <View style={[styles.circle, styles.circleTopRight]} />
                    <View style={[styles.circle, styles.circleCenterLeft]} />
                    <View style={[styles.circle, styles.circleBottom]} />
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={44}
                >
                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: 'center',
                            paddingTop: 16,
                            paddingBottom: 28,
                        }}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        <Animated.View style={[
                            styles.container,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}>
                            <View style={styles.header}>
                                <View style={styles.logoCircle}>
                                    <MaterialIcons name="lock-reset" size={48} color="#2563eb" />
                                </View>

                                <Text style={styles.title}>{t('resetPassword')}</Text>
                                <View style={styles.underline} />
                                <Text style={styles.subtitle}>{t('forgotPasswordSubtitle')}</Text>
                            </View>

                            <View style={styles.card}>
                                <View
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: getBorderColor("email"),
                                            backgroundColor: getInputBackgroundColor("email"),
                                        },
                                    ]}
                                >
                                    <MaterialIcons
                                        name="mail-outline"
                                        size={20}
                                        color={focusedInput === "email" ? '#1e40af' : '#64748b'}
                                        style={styles.icon}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder={t('emailAddress')}
                                        placeholderTextColor="rgba(71,85,105,0.7)"
                                        value={email}
                                        onChangeText={setEmail}
                                        onFocus={() => setFocusedInput("email")}
                                        onBlur={() => setFocusedInput(null)}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        spellCheck={false}
                                        autoComplete="email"
                                    />
                                </View>

                                {error ? (
                                    <View style={styles.error}>
                                        <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                ) : null}

                                <TouchableOpacity
                                    style={[styles.button, isLoading && styles.buttonDisabled]}
                                    onPress={handleReset}
                                    disabled={isLoading}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={['#3b82f6', '#2563eb']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.buttonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <Text style={styles.buttonText}>{t('sendResetLink')}</Text>
                                                <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.footer}>
                                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/login')}>
                                    <LinearGradient
                                        colors={['#ffffff', '#f8fafc']}
                                        style={styles.backBtn}
                                    >
                                        <MaterialIcons name="arrow-back" size={16} color="#2563eb" />
                                        <Text style={styles.backText}>{t('backToLogin')}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradientBg: { flex: 1 },
    safeArea: { flex: 1 },
    backgroundLayer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
    circle: { position: 'absolute', borderRadius: 999 },
    circleTopLeft: { width: 250, height: 250, top: -80, left: -90, backgroundColor: 'rgba(255,255,255,0.07)' },
    circleTopRight: { width: 220, height: 220, top: -40, right: -70, backgroundColor: 'rgba(255,255,255,0.05)' },
    circleCenterLeft: { width: 300, height: 300, top: SCREEN_HEIGHT * 0.4, left: -130, backgroundColor: 'rgba(255,255,255,0.04)' },
    circleBottom: { width: 320, height: 320, bottom: -140, right: -120, backgroundColor: 'rgba(255,255,255,0.06)' },

    container: { width: '100%', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 10 },
    header: { marginBottom: 10, alignItems: 'center', width: '100%', marginTop: 8 },
    logoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8, marginBottom: 12 },
    title: { fontSize: 26, lineHeight: 30, fontWeight: '800', letterSpacing: -0.5, color: '#fff', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    underline: { height: 3, width: 65, backgroundColor: '#fff', borderRadius: 2, marginBottom: 8, opacity: 0.95 },
    subtitle: { color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 6, letterSpacing: 0.2, textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, textAlign: 'center' },

    card: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 6, padding: 20, marginVertical: 10, width: '100%', maxWidth: 380 },
    input: { flexDirection: 'row', alignItems: 'center', borderRadius: 13, marginBottom: 16, paddingVertical: 3, paddingHorizontal: 13, borderWidth: 1.5, minHeight: 46 },
    icon: { marginRight: 10 },
    textInput: { flex: 1, fontSize: 15, paddingVertical: 8, color: '#1e293b', fontWeight: '600' },

    error: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(254,226,226,0.95)', padding: 10, borderRadius: 10, marginBottom: 12, marginTop: -6, gap: 7, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
    errorText: { color: '#991b1b', fontSize: 12, flex: 1, fontWeight: '600' },

    button: { marginTop: 6, borderRadius: 13, width: '100%', overflow: 'hidden', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
    buttonDisabled: { opacity: 0.7 },
    buttonGradient: { paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 4, gap: 9 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    backText: { color: '#2563eb', fontSize: 13, fontWeight: '800' },
});
