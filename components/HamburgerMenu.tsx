import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth';
import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

type Props = {
    visible: boolean;
    onClose: () => void;
};

export default function HamburgerMenu({ visible, onClose }: Props) {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { t } = useLanguage();
    const { effectiveColorScheme } = useAppTheme();

    const isDarkMode = effectiveColorScheme === 'dark';

    const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -MENU_WIDTH,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);


    const handleNavigate = (path: any) => {
        onClose();
        // small delay to allow menu closing animation to start
        setTimeout(() => {
            router.push(path);
        }, 150);
    };

    const roleLabel = React.useMemo(() => {
        if (!user) return '';
        if (user.role === 'sender') return t('roleSender');
        if (user.role === 'receiver') return t('roleReceiver');
        return t('roleAdmin');
    }, [user, t]);


    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.overlayContainer}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                </Animated.View>

                {/* Sliding Menu */}
                <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
                    <LinearGradient
                        colors={isDarkMode ? ['rgba(15,23,42,0.95)', 'rgba(30,41,59,0.95)', 'rgba(15,23,42,0.95)'] : ['rgba(30,64,175,0.95)', 'rgba(59,130,246,0.95)', 'rgba(14,165,233,0.95)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientBg}
                    >
                        <SafeAreaView style={styles.safeArea}>

                            {/* Header */}
                            <View style={styles.header}>
                                <View style={styles.profileSection}>
                                    <View style={styles.avatarCircle}>
                                        <MaterialIcons name="person" size={24} color="#2563eb" />
                                    </View>
                                    <View>
                                        <Text style={styles.userName} numberOfLines={1}>{user?.fullName || user?.email}</Text>
                                        <Text style={styles.userRole}>{roleLabel.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <MaterialIcons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Menu Items */}
                            <View style={styles.menuItems}>
                                <MenuItem icon="home" title={t('home')} onPress={() => { onClose(); router.push('/'); }} />
                                <MenuItem icon="map" title={t('mapTitle')} onPress={() => handleNavigate('/map')} />

                                {user?.role === 'sender' && (
                                    <MenuItem icon="add-circle-outline" title={t('newDelivery')} onPress={() => handleNavigate('/new-delivery')} />
                                )}

                                <MenuItem icon="local-shipping" title={t('deliveries')} onPress={() => handleNavigate('/deliveries')} />

                                {user?.role === 'receiver' && (
                                    <MenuItem icon="qr-code-scanner" title={t('scanQR')} onPress={() => handleNavigate('/scan-qr')} />
                                )}

                                <MenuItem icon="notifications-none" title={t('notifications')} onPress={() => handleNavigate('/notifications')} />

                                {(user?.role === 'sender' || user?.role === 'receiver') && (
                                    <MenuItem icon="smart-toy" title={t('robotStatus')} onPress={() => handleNavigate('/robot-status')} />
                                )}

                                {user?.role === 'admin' && (
                                    <>
                                        <View style={styles.divider} />
                                        <MenuItem icon="smart-toy" title={t('robotStatus')} onPress={() => handleNavigate('/robot-status')} />
                                        <MenuItem icon="meeting-room" title={t('rooms')} onPress={() => handleNavigate('/rooms')} />
                                    </>
                                )}

                                <View style={styles.divider} />
                                <MenuItem icon="settings" title={t('settings')} onPress={() => handleNavigate('/profile-settings')} />
                            </View>

                            {/* Footer / Sign Out */}
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={styles.signOutBtn}
                                    onPress={() => {
                                        onClose();
                                        signOut();
                                        router.replace('/');
                                    }}
                                >
                                    <MaterialIcons name="logout" size={18} color="#fca5a5" />
                                    <Text style={styles.signOutText}>{t('signOut')}</Text>
                                </TouchableOpacity>
                            </View>

                        </SafeAreaView>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
}

function MenuItem({ icon, title, onPress }: { icon: any; title: string; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <MaterialIcons name={icon} size={20} color="rgba(255,255,255,0.9)" style={styles.menuIcon} />
            <Text style={styles.menuText}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuContainer: {
        width: MENU_WIDTH,
        height: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 10, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 15,
        borderTopRightRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    gradientBg: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    userName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
        letterSpacing: 0.3,
    },
    userRole: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
    },
    menuItems: {
        flex: 1,
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginVertical: 4,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(255,255,255,0.2)',
    },
    menuIcon: {
        marginRight: 16,
        width: 24,
        textAlign: 'center',
    },
    menuText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 16,
        marginVertical: 12,
    },
    footer: {
        padding: 24,
        paddingBottom: 36,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
    },
    signOutText: {
        color: '#fca5a5',
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 10,
    },
});
