import { getApiBaseUrl } from '@/lib/api';
import { useAppTheme } from '@/providers/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/providers/language';
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

const SCREEN_HEIGHT = Dimensions.get('window').height;
// BURAYA LINK GELECEK
const API_BASE_URL = getApiBaseUrl();


export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { effectiveColorScheme } = useAppTheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleRegister = async () => {
    setError("");

    if (!API_BASE_URL) {
      const msg = "API link not set.";
      setError(msg);
      Alert.alert("Config Error", msg);
      return;
    }

    if (!fullName.trim() || !email.trim() || !password || !confirm) {
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

    if (password !== confirm) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          phoneNumber: phoneNumber.trim() || undefined,
          password,
        }),
      });

      if (!response.ok) {
        let message = t('registrationFailed');

        try {
          const errData = await response.json();
          if (errData?.error) {
            message = errData.error;
          }
        } catch {
          // body json değilse sessiz geç
        }

        setError(message);
        Alert.alert(t('registrationFailed'), message);
        return;
      }

      const data = await response.json();
      // data.user ve data.token burada (curl çıktısındaki gibi)
      console.log("REGISTER OK:", data);

      Alert.alert(
        t('accountCreatedTitle'),
        t('accountCreatedMsg'),
        [
          {
            text: "OK",
            onPress: () => {
              // Kayıt sonrası login ekranına git
              router.push("/login");
            },
          },
        ]
      );

      setFullName("");
      setEmail("");
      setPhoneNumber("");
      setPassword("");
      setConfirm("");
      setError("");
    } catch (err) {
      console.error("REGISTER ERROR:", err);
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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
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
              paddingTop: 8,
              paddingBottom: 20,
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
                <View style={styles.logoCircle}>
                  <Image source={require('@/assets/images/logoRobo.png')} style={styles.logoImg} />
                </View>

                <Text style={styles.title}>{t('createAccount')}</Text>
                <View style={styles.underline} />
                <Text style={styles.subtitle}>
                  {t('joinUsSubtitle')}
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
                {/* Full Name */}
                <View
                  style={[
                    styles.input,
                    {
                      borderColor: getBorderColor("name"),
                      backgroundColor: getInputBackgroundColor("name"),
                    },
                  ]}
                >
                  <MaterialIcons
                    name="person-outline"
                    size={20}
                    color={focusedInput === "name" ? '#1e40af' : '#64748b'}
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('fullName')}
                    placeholderTextColor="rgba(71,85,105,0.7)"
                    value={fullName}
                    onChangeText={setFullName}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="name"
                  />
                </View>

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

                {/* Phone Number (optional) */}
                <View
                  style={[
                    styles.input,
                    {
                      borderColor: getBorderColor("phone"),
                      backgroundColor: getInputBackgroundColor("phone"),
                    },
                  ]}
                >
                  <MaterialIcons
                    name="phone-android"
                    size={20}
                    color={focusedInput === "phone" ? '#1e40af' : '#64748b'}
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('phoneNumberOpt')}
                    placeholderTextColor="rgba(71,85,105,0.7)"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    onFocus={() => setFocusedInput("phone")}
                    onBlur={() => setFocusedInput(null)}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="tel"
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

                {/* Confirm Password */}
                <View
                  style={[
                    styles.input,
                    {
                      borderColor: getBorderColor("confirm"),
                      backgroundColor: getInputBackgroundColor("confirm"),
                    },
                  ]}
                >
                  <MaterialIcons
                    name="verified-user"
                    size={20}
                    color={focusedInput === "confirm" ? '#1e40af' : '#64748b'}
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('confirmPassword')}
                    placeholderTextColor="rgba(71,85,105,0.7)"
                    secureTextEntry={!showConfirm}
                    value={confirm}
                    onChangeText={setConfirm}
                    onFocus={() => setFocusedInput("confirm")}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeBtn}
                  >
                    <MaterialIcons
                      name={showConfirm ? "visibility" : "visibility-off"}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Strength */}
                {password.length > 0 && (
                  <View style={styles.strength}>
                    <View style={styles.strengthBar}>
                      <View
                        style={[
                          styles.strengthLevel,
                          {
                            width: password.length < 6 ? '33%' : password.length < 10 ? '66%' : '100%',
                            backgroundColor: password.length < 6 ? '#ef4444' : password.length < 10 ? '#fbbf24' : '#22c55e',
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.strengthText}>
                      {password.length < 6 ? t('weak') : password.length < 10 ? t('medium') : t('strong')}
                    </Text>
                  </View>
                )}

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
                  onPress={handleRegister}
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
                        <Text style={styles.buttonText}>{t('signUp')}</Text>
                        <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('alreadyHaveAccount')}</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/login')}>
                  <LinearGradient
                    colors={['#ffffff', '#f8fafc']}
                    style={styles.loginBtn}
                  >
                    <Text style={styles.loginText}>{t('signIn')}</Text>
                    <MaterialIcons name="login" size={16} color="#2563eb" />
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
    paddingBottom: 10,
  },

  header: {
    marginBottom: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },

  logoWrapper: {
    marginBottom: 14,
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 13,
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
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
    padding: 16,
    marginVertical: 6,
    width: '100%',
    maxWidth: 380,
  },

  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 6,
    paddingVertical: 1,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    minHeight: 42,
  },

  icon: {
    marginRight: 10,
  },

  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    color: '#1e293b',
    fontWeight: '600',
  },

  eyeBtn: {
    padding: 5,
  },

  strength: {
    marginBottom: 12,
    marginTop: -3,
  },

  strengthBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },

  strengthLevel: {
    height: '100%',
    borderRadius: 2,
  },

  strengthText: {
    fontSize: 10,
    color: '#1e293b',
    fontWeight: '700',
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
    marginTop: 4,
    borderRadius: 16,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonGradient: {
    paddingVertical: 12,
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

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 9,
    width: '100%',
  },

  footerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },

  loginBtn: {
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

  loginText: {
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
    marginBottom: 8,
  },
  logoImg: {
    width: 130,
    height: 130,
    resizeMode: 'cover',
    borderRadius: 65,
  },
});