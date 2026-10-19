import { getApiBaseUrl } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
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

// BURAYA LINK GELECEK
const API_BASE_URL = getApiBaseUrl();


const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleLogin = async () => {
    setError("");

    if (!API_BASE_URL) {
      const msg = "API link not set.";
      setError(msg);
      Alert.alert("Config Error", msg);
      return;
    }

    if (!email.trim() || !password) {
      setError(t('fillAllFields'));
      return;
    }

    if (!email.includes("@")) {
      setError(t('invalidEmail'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    setIsLoading(true);

    try {
      console.log("LOGIN REQUEST", { email });

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      console.log("LOGIN STATUS", response.status);

      if (!response.ok) {
        const rawText = await response.text();
        console.log("LOGIN ERROR BODY RAW:", rawText);

        const normalizeAuthError = (input: unknown): string | null => {
          if (typeof input !== "string") return null;
          const s = input.trim();
          if (!s) return null;
          // Normalize common Turkish auth error (seen in some deployments)
          if (/email\s+veya\s+şifre\s+hatal/i.test(s)) return "Invalid email or password";
          return s;
        };

        let message = t('loginFailed');

        try {
          const errData = JSON.parse(rawText);
          console.log("LOGIN ERROR JSON:", errData);
          const normalizedError = normalizeAuthError(errData?.error);
          const normalizedMessage = normalizeAuthError(errData?.message);
          if (normalizedError) {
            message = normalizedError;
          } else if (normalizedMessage) {
            // If it wasn't recognized/normalized to English, keep generic
            message = normalizedMessage === "Invalid email or password"
              ? t('loginFailed') // we can map "Invalid email..." to generic failed for simplicity in i18n
              : t('loginFailed');
          }
        } catch {
          // Ignore non-JSON bodies
          const normalizedRaw = normalizeAuthError(rawText);
          if (normalizedRaw) {
            message = normalizedRaw === "Invalid email or password"
              ? t('loginFailed')
              : t('loginFailed');
          }
        }

        setError(message);
        Alert.alert("Login Failed", message);
        return;
      }

      const data = await response.json();
      console.log("LOGIN OK:", data);

      // Backend `backend/index.js` şu an user objesi döndürüyor.
      // users tablosuna göre: id, full_name, email, role, is_active, created_at
      signIn({
        id: data.id,
        fullName: data.full_name ?? data.fullName ?? "",
        email: data.email,
        role: data.role,
        isActive: data.is_active ?? data.isActive ?? true,
        createdAt: data.created_at,
      });

      Alert.alert("Success", "Welcome back!");

      // Login sonrası açılacak ekran: (tabs)/index.tsx role-based dashboard render edecek.
      router.replace("/");

      setEmail("");
      setPassword("");
      setError("");
    } catch (err) {
      console.error("LOGIN NETWORK ERROR:", err);
      const msg =
        "Could not connect to the server. Please check your connection and that the API is running.";
      setError(msg);
      Alert.alert("Network Error", msg);
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
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoWrapper}>
                  <View style={styles.logoCircle}>
                    <Image source={require('@/assets/images/logoRobo.png')} style={styles.logoImg} />
                  </View>
                </View>

                <Text style={styles.title}>{t('welcomeBack')}</Text>
                <View style={styles.underline} />
                <Text style={styles.subtitle}>
                  {t('signInSubtitle')}
                </Text>

                <View style={styles.badges}>
                  <View style={styles.badge}>
                    <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.badgeText}>{t('secure')}</Text>
                  </View>
                  <View style={styles.badge}>
                    <View style={[styles.dot, { backgroundColor: '#60a5fa' }]} />
                    <Text style={styles.badgeText}>{t('fast')}</Text>
                  </View>
                  <View style={styles.badge}>
                    <View style={[styles.dot, { backgroundColor: '#38bdf8' }]} />
                    <Text style={styles.badgeText}>{t('smart')}</Text>
                  </View>
                </View>
              </View>

              {/* Card */}
              <View style={styles.card}>
                {/* Email */}
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

                {/* Password */}
                <View
                  style={[
                    styles.input,
                    {
                      borderColor: getBorderColor("pass"),
                      backgroundColor: getInputBackgroundColor("pass"),
                    },
                  ]}
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={20}
                    color={focusedInput === "pass" ? '#1e40af' : '#64748b'}
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('password')}
                    placeholderTextColor="rgba(71,85,105,0.7)"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedInput("pass")}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPassword}
                  activeOpacity={0.7}
                  onPress={() => router.push('/forgot-password' as any)}
                >
                  <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
                </TouchableOpacity>

                {/* Error */}
                {error ? (
                  <View style={styles.error}>
                    <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Button */}
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
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
                        <Text style={styles.buttonText}>{t('signIn')}</Text>
                        <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Info Text */}
                <View style={styles.infoBox}>
                  <MaterialIcons name="info-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.infoText}>
                    {t('encryptedInfo')}
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('dontHaveAccount')}</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/register')}>
                  <LinearGradient
                    colors={['#ffffff', '#f8fafc']}
                    style={styles.signupBtn}
                  >
                    <Text style={styles.signupText}>{t('signUp')}</Text>
                    <MaterialIcons name="person-add" size={16} color="#2563eb" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <Text style={styles.version}>{t('appVersion')}</Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circleTopLeft: {
    width: 250,
    height: 250,
    top: -80,
    left: -90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleTopRight: {
    width: 220,
    height: 220,
    top: -40,
    right: -70,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circleCenterLeft: {
    width: 300,
    height: 300,
    top: SCREEN_HEIGHT * 0.4,
    left: -130,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  circleBottom: {
    width: 320,
    height: 320,
    bottom: -140,
    right: -120,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  header: {
    marginBottom: 10,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },

  logoWrapper: {
    marginBottom: 10,
  },

  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },

  logoImg: {
    width: 130,
    height: 130,
    resizeMode: 'cover',
    borderRadius: 65,
  },

  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  underline: {
    height: 3,
    width: 65,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginBottom: 8,
    opacity: 0.95,
  },

  subtitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  badges: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  badgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
    padding: 18,
    marginVertical: 10,
    width: '100%',
    maxWidth: 380,
  },

  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    marginBottom: 8,
    paddingVertical: 3,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    minHeight: 46,
  },

  icon: {
    marginRight: 10,
  },

  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    color: '#1e293b',
    fontWeight: '600',
  },

  eyeBtn: {
    padding: 5,
  },

  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    marginTop: -4,
  },

  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textDecorationLine: 'underline',
  },

  error: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254,226,226,0.95)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    marginTop: 2,
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },

  errorText: {
    color: '#991b1b',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },

  button: {
    marginTop: 6,
    borderRadius: 13,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 4,
  },

  infoText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 4,
    gap: 9,
  },

  footerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },

  signupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  signupText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },

  version: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '500',
  },
});

