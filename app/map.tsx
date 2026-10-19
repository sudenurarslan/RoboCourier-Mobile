import { useLanguage } from '@/providers/language';
import { useAppTheme } from '@/providers/theme';
import { HOCA_KATI_MAP } from '@/src/constants/hocaKatiMap';
import {
    imagePixelToMap,
    imagePixelToTouchOffset,
    touchToImagePixel,
} from '@/src/utils/mapCoordinates';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
    initRos,
    publishMapGoalPose,
    ROSBRIDGE_URL,
    ROS_GOAL_TOPIC,
    ros,
} from '@/src/services/ros.js';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    LayoutChangeEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type Selection = {
    ix: number;
    iy: number;
    mapX: number;
    mapY: number;
};

type RosLinkStatus = 'idle' | 'connected' | 'error' | 'closed';

export default function MapScreen() {
    const router = useRouter();
    const { t } = useLanguage();
    const { effectiveColorScheme } = useAppTheme();
    const isDarkMode = effectiveColorScheme === 'dark';

    const [box, setBox] = useState({ w: 0, h: 0 });
    const [selection, setSelection] = useState<Selection | null>(null);
    const [rosStatus, setRosStatus] = useState<RosLinkStatus>('idle');
    const [sendingGoal, setSendingGoal] = useState(false);

    useEffect(() => {
        initRos();
        const onConn = () => setRosStatus('connected');
        const onErr = () => setRosStatus('error');
        const onClose = () => setRosStatus('closed');
        ros.on('connection', onConn);
        ros.on('error', onErr);
        ros.on('close', onClose);
        if (ros.isConnected) {
            setRosStatus('connected');
        }
        return () => {
            ros.off('connection', onConn);
            ros.off('error', onErr);
            ros.off('close', onClose);
        };
    }, []);

    const sendGoalToRos = useCallback(() => {
        if (!selection) return;
        if (!ros.isConnected) {
            Alert.alert(
                t('rosNotConnected') || 'ROS bağlı değil',
                t('rosNotConnectedHint') ||
                    'Telefon ile Ubuntu aynı ağda mı? .env içinde EXPO_PUBLIC_ROSBRIDGE_URL doğru mu?'
            );
            return;
        }
        setSendingGoal(true);
        try {
            publishMapGoalPose({
                x: selection.mapX,
                y: selection.mapY,
                z: 0,
                yaw: 0,
                frameId: 'map',
            });
            Alert.alert(
                t('rosGoalSentTitle') || 'Gönderildi',
                `${ROS_GOAL_TOPIC}\nmap: (${selection.mapX.toFixed(3)}, ${selection.mapY.toFixed(3)})`
            );
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert(t('rosGoalError') || 'Gönderilemedi', msg);
        } finally {
            setSendingGoal(false);
        }
    }, [selection, t]);

    const onMapLayout = useCallback((e: LayoutChangeEvent) => {
        const { width: lw, height: lh } = e.nativeEvent.layout;
        setBox({ w: lw, h: lh });
    }, []);

    const onMapPress = useCallback(
        (lx: number, ly: number) => {
            if (box.w <= 0 || box.h <= 0) return;
            const pixel = touchToImagePixel(lx, ly, HOCA_KATI_MAP, box.w, box.h);
            if (!pixel) {
                setSelection(null);
                return;
            }
            const { x, y } = imagePixelToMap(HOCA_KATI_MAP, pixel.ix, pixel.iy);
            setSelection({ ix: pixel.ix, iy: pixel.iy, mapX: x, mapY: y });
        },
        [box.w, box.h]
    );

    const markerPos =
        selection && box.w > 0 && box.h > 0
            ? imagePixelToTouchOffset(selection.ix, selection.iy, HOCA_KATI_MAP, box.w, box.h)
            : null;

    return (
        <LinearGradient
            colors={isDarkMode ? ['#020617', '#0f172a', '#020617'] : ['#0b2a6a', '#2563eb', '#0ea5e9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                                <MaterialIcons name="chevron-left" size={28} color="#fff" />
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>{t('mapTitle') || 'Facility Map'}</Text>
                                <Text style={styles.subtitle}>
                                    {t('mapSubtitle') || 'Tap the map to choose a goal position (map frame).'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.mapCard} onLayout={onMapLayout}>
                            <Pressable
                                style={styles.mapPressable}
                                onPress={(e) => {
                                    const { locationX, locationY } = e.nativeEvent;
                                    onMapPress(locationX, locationY);
                                }}
                            >
                                <Image
                                    source={require('@/assets/maps/hoca_kati.png')}
                                    style={StyleSheet.absoluteFill}
                                    contentFit="contain"
                                    accessibilityLabel="Hoca katı haritası"
                                />
                                {markerPos && (
                                    <View
                                        pointerEvents="none"
                                        style={[
                                            styles.marker,
                                            {
                                                left: markerPos.left,
                                                top: markerPos.top,
                                            },
                                        ]}
                                    >
                                        <MaterialIcons name="place" size={36} color="#22c55e" />
                                    </View>
                                )}
                            </Pressable>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.row}>
                                <MaterialIcons name="touch-app" size={18} color="#eaf2ff" />
                                <Text style={styles.cardTitle}>
                                    {t('mapSelection') || 'Selected position'}
                                </Text>
                            </View>
                            {selection ? (
                                <>
                                    <Text style={styles.coordLine}>
                                        map_x: {selection.mapX.toFixed(3)} m · map_y:{' '}
                                        {selection.mapY.toFixed(3)} m
                                    </Text>
                                    <Text style={styles.coordHint}>
                                        {t('mapPixelHint') || 'Cell'}{' '}
                                        {selection.ix}, {selection.iy} · res {HOCA_KATI_MAP.resolution}{' '}
                                        m/px
                                    </Text>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.clearBtn}
                                            onPress={() => setSelection(null)}
                                        >
                                            <Text style={styles.clearBtnText}>
                                                {t('clearSelection') || 'Clear'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.sendRosBtn,
                                                (!ros.isConnected || sendingGoal) && styles.sendRosBtnDisabled,
                                            ]}
                                            disabled={!ros.isConnected || sendingGoal}
                                            onPress={sendGoalToRos}
                                        >
                                            {sendingGoal ? (
                                                <ActivityIndicator color="#0f172a" size="small" />
                                            ) : (
                                                <>
                                                    <MaterialIcons name="send" size={18} color="#0f172a" />
                                                    <Text style={styles.sendRosBtnText}>
                                                        {t('sendGoalRos') || "ROS'a gönder"}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.coordEmpty}>
                                    {t('mapTapPrompt') || 'Tap inside the map image to select a point.'}
                                </Text>
                            )}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.row}>
                                <MaterialIcons
                                    name={rosStatus === 'connected' ? 'cloud-done' : 'cloud-off'}
                                    size={18}
                                    color="#eaf2ff"
                                />
                                <Text style={styles.cardTitle}>
                                    {t('rosBridgeCard') || 'ROS bridge'}
                                </Text>
                            </View>
                            <Text style={styles.rosMeta} numberOfLines={2}>
                                {ROSBRIDGE_URL}
                            </Text>
                            <Text style={styles.rosMeta}>
                                → {ROS_GOAL_TOPIC} ({'geometry_msgs/PoseStamped'})
                            </Text>
                            <Text
                                style={[
                                    styles.rosStatusText,
                                    rosStatus === 'connected' && styles.rosStatusOk,
                                    (rosStatus === 'error' || rosStatus === 'closed') && styles.rosStatusBad,
                                ]}
                            >
                                {rosStatus === 'connected' &&
                                    (t('rosConnected') || 'Bağlı')}
                                {rosStatus === 'idle' &&
                                    (t('rosConnecting') || 'Bağlanıyor…')}
                                {rosStatus === 'error' &&
                                    (t('rosError') || 'Bağlantı hatası')}
                                {rosStatus === 'closed' &&
                                    (t('rosClosed') || 'Bağlantı kapandı')}
                            </Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.row}>
                                <MaterialIcons name="info-outline" size={18} color="#eaf2ff" />
                                <Text style={styles.cardTitle}>{t('legend') || 'Legend'}</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                                    <Text style={styles.legendText}>
                                        {t('legendGoal') || 'Chosen goal'}
                                    </Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#94a3b8' }]} />
                                    <Text style={styles.legendText}>
                                        {t('legendMapFrame') || 'ROS map frame'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 28,
    },
    container: {
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 12,
        marginBottom: 20,
    },
    backBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    subtitle: {
        marginTop: 6,
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 17,
    },
    mapCard: {
        height: width * 1.05,
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    mapPressable: {
        flex: 1,
    },
    marker: {
        position: 'absolute',
        marginLeft: -18,
        marginTop: -34,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 4,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderRadius: 18,
        borderWidth: 1.25,
        borderColor: 'rgba(255,255,255,0.22)',
        padding: 16,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
    },
    coordLine: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    coordHint: {
        marginTop: 6,
        color: 'rgba(255,255,255,0.65)',
        fontSize: 12,
        fontWeight: '600',
    },
    coordEmpty: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    clearBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    clearBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    sendRosBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#86efac',
        minWidth: 130,
        justifyContent: 'center',
    },
    sendRosBtnDisabled: {
        opacity: 0.45,
    },
    sendRosBtnText: {
        color: '#0f172a',
        fontSize: 13,
        fontWeight: '900',
    },
    rosMeta: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
    },
    rosStatusText: {
        marginTop: 8,
        color: 'rgba(255,255,255,0.75)',
        fontSize: 13,
        fontWeight: '800',
    },
    rosStatusOk: {
        color: '#86efac',
    },
    rosStatusBad: {
        color: '#fca5a5',
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 11,
        fontWeight: '700',
    },
});
