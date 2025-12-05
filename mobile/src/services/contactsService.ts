import * as Contacts from 'expo-contacts';
import { Alert, Platform } from 'react-native';
import { contactAPI, userAPI } from './api';

export interface DeviceContact {
  id: string;
  name: string;
  phoneNumbers?: Array<{ number: string; label?: string }>;
  emails?: Array<{ email: string; label?: string }>;
  imageAvailable?: boolean;
  image?: { uri: string };
}

export interface ContactMatch {
  deviceContact: DeviceContact;
  userContact?: {
    id: string;
    name: string;
    email: string;
  };
  isRegistered: boolean;
}

export class ContactsService {
  private static instance: ContactsService;

  static getInstance(): ContactsService {
    if (!ContactsService.instance) {
      ContactsService.instance = new ContactsService();
    }
    return ContactsService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status === 'granted') {
        return true;
      } else {
        Alert.alert(
          'Permission Required',
          'Contacts permission is required to help you connect with friends.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  async getDeviceContacts(): Promise<DeviceContact[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return [];

    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Image,
        ],
      });

      return data.map(contact => ({
        id: contact.id || '',
        name: contact.name || 'Unknown',
        phoneNumbers: contact.phoneNumbers?.map(phone => ({
          number: phone.number || '',
          label: phone.label,
        })),
        emails: contact.emails?.map(email => ({
          email: email.email || '',
          label: email.label,
        })),
        imageAvailable: contact.imageAvailable || false,
        image: contact.image?.uri ? { uri: contact.image.uri } : undefined,
      }));
    } catch (error) {
      console.error('Error getting device contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
      return [];
    }
  }

  async searchContacts(query: string): Promise<DeviceContact[]> {
    const contacts = await this.getDeviceContacts();

    if (!query.trim()) return contacts;

    const searchLower = query.toLowerCase();

    return contacts.filter(contact => {
      // Search in name
      if (contact.name.toLowerCase().includes(searchLower)) return true;

      // Search in phone numbers
      if (contact.phoneNumbers?.some(phone =>
        phone.number.includes(searchLower)
      )) return true;

      // Search in emails
      if (contact.emails?.some(email =>
        email.email.toLowerCase().includes(searchLower)
      )) return true;

      return false;
    });
  }

  async syncContactsWithServer(): Promise<ContactMatch[]> {
    const deviceContacts = await this.getDeviceContacts();
    const matches: ContactMatch[] = [];

    // Limit to first 20 contacts to avoid spamming the API during this "hacky" sync
    // In a real app, we need a bulk sync endpoint: POST /users/sync { emails, phones }
    const contactsToSync = deviceContacts.slice(0, 20);

    for (const contact of contactsToSync) {
      try {
        let userFound = null;

        // Try searching by email first
        if (contact.emails && contact.emails.length > 0) {
          const email = contact.emails[0].email;
          if (email) {
            const response = await userAPI.searchUsers(email);
            const users = response.data.data;
            if (users && users.length > 0) {
              // Exact match check might be needed if search is fuzzy
              userFound = users.find((u: any) => u.email === email) || users[0];
            }
          }
        }

        // If not found, try phone (if supported by search)
        if (!userFound && contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          const phone = contact.phoneNumbers[0].number;
          if (phone) {
            // Clean phone number
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length > 5) {
              const response = await userAPI.searchUsers(cleanPhone);
              const users = response.data.data;
              if (users && users.length > 0) {
                userFound = users[0];
              }
            }
          }
        }

        if (userFound) {
          matches.push({
            deviceContact: contact,
            userContact: {
              id: userFound.id,
              name: userFound.firstName ? `${userFound.firstName} ${userFound.lastName}` : userFound.username,
              email: userFound.email,
            },
            isRegistered: true,
          });
        }
      } catch (error) {
        console.warn(`Failed to sync contact ${contact.name}:`, error);
      }
    }

    return matches;
  }

  async addContactToMessenger(contact: DeviceContact): Promise<boolean> {
    try {
      // We need to find the user ID first if it's not already attached
      // This method assumes we are passing a DeviceContact that might NOT have been synced yet
      // But ideally, the UI should only allow adding synced contacts

      let userId = '';

      // If we have a way to pass the synced user ID, great. 
      // But DeviceContact doesn't have it. 
      // We'll do a quick search to confirm.

      if (contact.emails && contact.emails.length > 0) {
        const response = await userAPI.searchUsers(contact.emails[0].email);
        if (response.data.data.length > 0) {
          userId = response.data.data[0].id;
        }
      }

      if (!userId && contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        const response = await userAPI.searchUsers(contact.phoneNumbers[0].number);
        if (response.data.data.length > 0) {
          userId = response.data.data[0].id;
        }
      }

      if (!userId) {
        Alert.alert('User Not Found', 'This contact is not registered on Messenger.');
        return false;
      }

      await contactAPI.addContact(userId);
      Alert.alert('Success', 'Contact added to Messenger!');
      return true;
    } catch (error) {
      console.error('Error adding contact:', error);
      Alert.alert('Error', 'Failed to add contact');
      return false;
    }
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    return phoneNumber;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  sortContacts(contacts: DeviceContact[]): DeviceContact[] {
    return contacts.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export const contactsService = ContactsService.getInstance();