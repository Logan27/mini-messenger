import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { authAPI } from '../../services/api';

const SecuritySettingsScreen = () => {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [isLoading, setIsLoading] = useState(false);

    // Change Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showChangePassword, setShowChangePassword] = useState(false);

    // 2FA State (Mocked for now as backend support is unclear)
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters long');
            return;
        }

        setIsLoading(true);
        try {
            await authAPI.updatePassword({
                currentPassword,
                newPassword
            });

            Alert.alert('Success', 'Your password has been updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowChangePassword(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to change password');
        } finally {
            setIsLoading(false);
        }
    };

    const toggle2FA = () => {
        navigation.navigate('TwoFactorAuth');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.content}>
                {/* Two-Factor Authentication */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>TWO-FACTOR AUTHENTICATION</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.rowInfo}>
                                <Text style={styles.rowLabel}>Enable 2FA</Text>
                                <Text style={styles.rowSubtitle}>
                                    Add an extra layer of security to your account
                                </Text>
                            </View>
                            <Switch
                                value={is2FAEnabled}
                                onValueChange={toggle2FA}
                                trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                            />
                        </View>
                    </View>
                </View>

                {/* Change Password */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PASSWORD</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => setShowChangePassword(!showChangePassword)}
                        >
                            <Text style={styles.rowLabel}>Change Password</Text>
                            <Ionicons
                                name={showChangePassword ? "chevron-up" : "chevron-down"}
                                size={20}
                                color="#666"
                            />
                        </TouchableOpacity>

                        {showChangePassword && (
                            <View style={styles.passwordForm}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Current Password"
                                    secureTextEntry
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="New Password"
                                    secureTextEntry
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm New Password"
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleChangePassword}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Update Password</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Active Sessions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACTIVE SESSIONS</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => Alert.alert('Coming Soon', 'Session management is under construction')}
                        >
                            <View style={styles.rowInfo}>
                                <Text style={styles.rowLabel}>Manage Devices</Text>
                                <Text style={styles.rowSubtitle}>
                                    Log out of other devices
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 4,
        minWidth: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    headerRight: {
        minWidth: 40,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        padding: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowInfo: {
        flex: 1,
        marginRight: 16,
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
        marginBottom: 4,
    },
    rowSubtitle: {
        fontSize: 13,
        color: '#666',
    },
    passwordForm: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default SecuritySettingsScreen;
