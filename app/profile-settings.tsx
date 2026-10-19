
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';
import { useAuth } from '@/providers/auth';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Switch, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { getApiBaseUrl } from '@/lib/api';

const API_BASE_URL = getApiBaseUrl();
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ProfileSettingsScreen() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const { themeMode, setThemeMode, effectiveColorScheme } = useAppTheme();

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    const initialPhone = user?.phoneNumber || user?.phone_number || '';
    const [phoneNumber, setPhoneNumber] = useState(initialPhone);
    const [isSavingPhone, setIsSavingPhone] = useState(false);

    React.useEffect(() => {
        setPhoneNumber(user?.phoneNumber || user?.phone_number || '');
    }, [user]);

    const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && effectiveColorScheme === 'dark');

    const handleToggleDarkMode = (val: boolean) => {
        setThemeMode(val ? 'dark' : 'light');
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            Alert.alert("Eksik Bilgi", t('fillAllFields') || "Lütfen tüm alanları doldurun.");
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert("Geçersiz Şifre", t('passwordMinLength') || "Şifre en az 6 karakter olmalı.");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert("Uyumsuz Şifre", t('passwordsDoNotMatch') || "Yeni şifreler eşleşmiyor.");
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, oldPassword, newPassword })
            });
            const data = await res.json();
            if (!res.ok) {
                Alert.alert("Hata", data.error || "İşlem başarısız.");
                return;
            }
            Alert.alert("Başarılı", data.message || "Şifreniz başarıyla değiştirildi.");
            setPasswordModalVisible(false);
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (e) {
            Alert.alert("Hata", "Ağ bağlantısı hatası.");
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleSavePhone = async () => {
        setIsSavingPhone(true);
        try {
            const res = await fetch(`${API_BASE_URL}/users/${user?.id}/phone`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber })
            });
            const data = await res.json();
            if (!res.ok) {
                Alert.alert("Hata", data.error || "Numara güncellenemedi.");
                return;
            }
            Alert.alert("Başarılı", "Telefon numarası başarıyla güncellendi.");
        } catch (e) {
            Alert.alert("Hata", "Ağ bağlantısı hatası.");
        } finally {
            setIsSavingPhone(false);
        }
    };

    const roleLabel = React.useMemo(() => {
        if (!user) return '';
        if (user.role === 'sender') return t('roleSender');
        if (user.role === 'receiver') return t('roleReceiver');
        return t('roleAdmin');
    }, [user, t]);

    return (
        <LinearGradient
            colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#0b2a6a', '#2563eb', '#0ea5e9']}
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

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('profile')} & {t('settings')}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    {/* Profile Header Card */}
                    <View style={styles.profileCard}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                            style={styles.profileGradient}
                        >
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarInitial}>
                                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.userName} numberOfLines={1}>{user?.fullName || 'User'}</Text>
                                <Text style={styles.userRole}>{roleLabel.toUpperCase()}</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Account Settings */}
                    <Text style={styles.sectionTitle}>{t('account')}</Text>
                    <View style={styles.settingsGroup}>

                        <View style={styles.inputRow}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' }]}>
                                <MaterialIcons name="mail" size={16} color="#93c5fd" />
                            </View>
                            <View style={styles.inputStack}>
                                <Text style={styles.inputLabel}>{t('emailAddress')}</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={user?.email || ''}
                                    editable={false}
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputRow}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }]}>
                                <MaterialIcons name="phone" size={16} color="#6ee7b7" />
                            </View>
                            <View style={styles.inputStack}>
                                <Text style={styles.inputLabel}>{t('phoneNumber')}</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="+1 (555) 000-0000"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                />
                            </View>
                            {phoneNumber !== initialPhone && (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.editBtn, isSavingPhone && { opacity: 0.5 }]}
                                    onPress={handleSavePhone}
                                    disabled={isSavingPhone}
                                >
                                    {isSavingPhone ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={[styles.editBtnText, { color: '#6ee7b7' }]}>Kaydet</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.divider} />

                        <View style={styles.inputRow}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }]}>
                                <MaterialIcons name="lock" size={16} color="#fca5a5" />
                            </View>
                            <View style={styles.inputStack}>
                                <Text style={styles.inputLabel}>{t('password')}</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="••••••••"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    secureTextEntry
                                    editable={false}
                                />
                            </View>
                            <TouchableOpacity activeOpacity={0.8} style={styles.editBtn} onPress={() => setPasswordModalVisible(true)}>
                                <Text style={styles.editBtnText}>{t('edit')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* App Preferences */}
                    <Text style={styles.sectionTitle}>{t('appearance')}</Text>
                    <View style={styles.settingsGroup}>

                        {/* Notifications */}
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' }]}>
                                    <MaterialIcons name="notifications-active" size={16} color="#fbbf24" />
                                </View>
                                <Text style={styles.settingLabel}>{t('pushNotifications')}</Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#3b82f6' }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Language */}
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(236,72,153,0.15)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)' }]}>
                                    <MaterialIcons name="language" size={16} color="#f9a8d4" />
                                </View>
                                <Text style={styles.settingLabel}>{t('language')}</Text>
                            </View>
                            <View style={styles.langOptions}>
                                <TouchableOpacity
                                    style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                                    onPress={() => setLanguage('en')}
                                >
                                    <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>EN</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.langBtn, language === 'tr' && styles.langBtnActive]}
                                    onPress={() => setLanguage('tr')}
                                >
                                    <Text style={[styles.langText, language === 'tr' && styles.langTextActive]}>TR</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Night Mode */}
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(168,85,247,0.15)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' }]}>
                                    <MaterialIcons name="dark-mode" size={16} color="#d8b4fe" />
                                </View>
                                <Text style={styles.settingLabel}>{t('darkMode')}</Text>
                            </View>
                            <Switch
                                value={isDarkMode}
                                onValueChange={handleToggleDarkMode}
                                trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#3b82f6' }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>

                    {/* Sign Out Button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={signOut}
                        style={styles.signOutBtnWrapper}
                    >
                        <LinearGradient
                            colors={['#ef4444', '#b91c1c']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.signOutBtn}
                        >
                            <MaterialIcons name="power-settings-new" size={18} color="#fff" />
                            <Text style={styles.signOutText}>{t('signOut') || 'Sign Out'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Version Info */}
                    <Text style={styles.versionText}>{t('appVersion')}</Text>

                </ScrollView>

                {/* CHANGE PASSWORD MODAL */}
                <Modal visible={isPasswordModalVisible} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.glassModalContent}>
                            <LinearGradient
                                colors={isDarkMode ? ['rgba(30,41,59,0.95)', 'rgba(15,23,42,0.95)'] : ['rgba(255,255,255,0.98)', 'rgba(248,250,252,0.96)']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                            />

                            <View style={styles.modalHeader}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', marginRight: 0 }]}>
                                    <MaterialIcons name="lock-reset" size={24} color="#3b82f6" />
                                </View>
                                <Text style={[styles.modalTitle, isDarkMode && styles.textLight]}>{t('resetPassword') || "Şifre Değiştir"}</Text>
                            </View>

                            <View style={[styles.modalInputWrapper, isDarkMode && styles.modalInputWrapperDark]}>
                                <MaterialIcons name="vpn-key" size={18} color={isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.glassInput, isDarkMode && styles.glassInputDark]}
                                    secureTextEntry
                                    placeholder="Mevcut Şifre"
                                    placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)"}
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                />
                            </View>

                            <View style={[styles.modalInputWrapper, isDarkMode && styles.modalInputWrapperDark]}>
                                <MaterialIcons name="lock-outline" size={18} color={isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.glassInput, isDarkMode && styles.glassInputDark]}
                                    secureTextEntry
                                    placeholder="Yeni Şifre"
                                    placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)"}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                />
                            </View>

                            <View style={[styles.modalInputWrapper, isDarkMode && styles.modalInputWrapperDark]}>
                                <MaterialIcons name="lock" size={18} color={isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.glassInput, isDarkMode && styles.glassInputDark]}
                                    secureTextEntry
                                    placeholder="Yeni Şifre (Tekrar)"
                                    placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)"}
                                    value={confirmNewPassword}
                                    onChangeText={setConfirmNewPassword}
                                />
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setPasswordModalVisible(false);
                                        setOldPassword('');
                                        setNewPassword('');
                                        setConfirmNewPassword('');
                                    }}
                                >
                                    <Text style={[styles.modalCancelText, isDarkMode && styles.textLight]}>İptal</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalSaveBtn, passwordLoading && { opacity: 0.7 }]}
                                    activeOpacity={0.9}
                                    onPress={handleChangePassword}
                                    disabled={passwordLoading}
                                >
                                    <LinearGradient
                                        colors={['#3b82f6', '#2563eb']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={styles.modalSaveGradient}
                                    >
                                        {passwordLoading ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.modalSaveText}>Kaydet</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradientBg: { flex: 1 },
    safeArea: { flex: 1 },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    circle: {
        position: 'absolute',
        borderRadius: 999,
    },
    circleTopLeft: {
        width: 250, height: 250, top: -80, left: -90, backgroundColor: 'rgba(255,255,255,0.07)',
    },
    circleTopRight: {
        width: 220, height: 220, top: -40, right: -70, backgroundColor: 'rgba(255,255,255,0.05)',
    },
    circleCenterLeft: {
        width: 300, height: 300, top: SCREEN_HEIGHT * 0.4, left: -130, backgroundColor: 'rgba(255,255,255,0.04)',
    },
    circleBottom: {
        width: 320, height: 320, bottom: -140, right: -120, backgroundColor: 'rgba(255,255,255,0.06)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    container: {
        paddingHorizontal: 16,
        paddingBottom: 50,
        paddingTop: 10,
    },
    profileCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
    },
    profileGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    avatarCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    avatarInitial: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1e40af',
    },
    profileInfo: {
        flex: 1,
    },
    userName: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    userRole: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        overflow: 'hidden'
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 10,
        marginLeft: 8,
    },
    settingsGroup: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.15)',
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 5,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    inputStack: {
        flex: 1,
    },
    inputLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 2,
    },
    textInput: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        padding: 0,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    langOptions: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    langBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    langBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    langText: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '800',
        fontSize: 11,
    },
    langTextActive: {
        color: '#2563eb',
    },
    editBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    editBtnText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    signOutBtnWrapper: {
        marginHorizontal: 4,
        marginTop: 10,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 10,
    },
    signOutText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    versionText: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    glassModalContent: {
        width: '100%',
        borderRadius: 28,
        padding: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 15,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.15)' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginLeft: 12 },
    textLight: { color: '#fff' },

    modalInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(148,163,184,0.1)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.2)',
        marginBottom: 16,
        paddingHorizontal: 16
    },
    modalInputWrapperDark: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
    inputIcon: { marginRight: 10 },
    glassInput: { flex: 1, paddingVertical: 14, fontSize: 15, fontWeight: '600', color: '#0f172a' },
    glassInputDark: { color: '#fff' },

    modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
    modalCancelBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14 },
    modalCancelText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
    modalSaveBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    modalSaveGradient: { paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
    modalSaveText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
});
