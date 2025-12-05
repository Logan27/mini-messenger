import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { groupAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const GroupInfoScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { groupId } = route.params as { groupId: string };
    const { user: currentUser } = useAuthStore();

    const [group, setGroup] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchGroupDetails();
    }, [groupId]);

    const fetchGroupDetails = async () => {
        try {
            setIsLoading(true);
            const [groupRes, membersRes] = await Promise.all([
                groupAPI.getGroup(groupId),
                groupAPI.getGroupMembers(groupId)
            ]);

            setGroup(groupRes.data.data || groupRes.data);
            setMembers(membersRes.data.data || membersRes.data);
        } catch (error) {
            console.error('Error fetching group details:', error);
            Alert.alert('Error', 'Failed to load group details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveGroup = () => {
        Alert.alert(
            'Leave Group',
            'Are you sure you want to leave this group?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await groupAPI.leaveGroup(groupId);
                            navigation.navigate('Home' as never);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to leave group');
                        }
                    }
                }
            ]
        );
    };

    const renderMemberItem = ({ item }: { item: any }) => (
        <View style={styles.memberItem}>
            <View style={styles.memberAvatar}>
                {item.user?.avatar ? (
                    <Image source={{ uri: item.user.avatar }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>
                        {item.user?.username?.[0]?.toUpperCase() || 'U'}
                    </Text>
                )}
            </View>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                    {item.user?.firstName ? `${item.user.firstName} ${item.user.lastName || ''}` : item.user?.username}
                </Text>
                <Text style={styles.memberRole}>{item.role}</Text>
            </View>
            {currentUser?.id === item.userId && (
                <View style={styles.youBadge}>
                    <Text style={styles.youText}>You</Text>
                </View>
            )}
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Group Info</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView style={styles.content}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                    <View style={styles.groupAvatar}>
                        {group?.avatar ? (
                            <Image source={{ uri: group.avatar }} style={styles.groupAvatarImage} />
                        ) : (
                            <Ionicons name="people" size={40} color="#fff" />
                        )}
                    </View>
                    <Text style={styles.groupName}>{group?.name}</Text>
                    <Text style={styles.groupDescription}>{group?.description || 'No description'}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                    <TouchableOpacity style={styles.actionItem}>
                        <View style={[styles.actionIcon, { backgroundColor: '#e1f5fe' }]}>
                            <Ionicons name="notifications-outline" size={22} color="#0288d1" />
                        </View>
                        <Text style={styles.actionText}>Mute Notifications</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem}>
                        <View style={[styles.actionIcon, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="images-outline" size={22} color="#2e7d32" />
                        </View>
                        <Text style={styles.actionText}>Media & Files</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem}>
                        <View style={[styles.actionIcon, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="search-outline" size={22} color="#ef6c00" />
                        </View>
                        <Text style={styles.actionText}>Search</Text>
                    </TouchableOpacity>
                </View>

                {/* Members List */}
                <View style={styles.membersSection}>
                    <Text style={styles.sectionTitle}>{members.length} Members</Text>
                    {members.map(member => (
                        <View key={member.id || member.userId}>
                            {renderMemberItem({ item: member })}
                        </View>
                    ))}
                </View>

                {/* Danger Zone */}
                <View style={styles.dangerSection}>
                    <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        <Text style={styles.leaveButtonText}>Leave Group</Text>
                    </TouchableOpacity>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    },
    groupHeader: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    groupAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    groupAvatarImage: {
        width: '100%',
        height: '100%',
    },
    groupName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    groupDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    actionsSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 16,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    actionItem: {
        alignItems: 'center',
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        color: '#666',
    },
    membersSection: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginLeft: 16,
        marginBottom: 12,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e1e1e1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    memberRole: {
        fontSize: 12,
        color: '#666',
        textTransform: 'capitalize',
    },
    youBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    youText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
    dangerSection: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 32,
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
    },
    leaveButtonText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default GroupInfoScreen;
