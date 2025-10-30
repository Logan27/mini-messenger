import * as Contacts from 'expo-contacts';
import { Alert, Platform } from 'react-native';

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
        image: contact.image,
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
    try {
      const deviceContacts = await this.getDeviceContacts();

      // Extract email addresses from device contacts
      const emailAddresses: string[] = [];
      deviceContacts.forEach(contact => {
        contact.emails?.forEach(email => {
          if (email.email) {
            emailAddresses.push(email.email);
          }
        });
      });

      if (emailAddresses.length === 0) {
        return [];
      }

      // In a real app, you would send these emails to your server
      // to check which contacts are registered users
      // For now, we'll simulate this

      // Simulate API call to check registered users
      const response = await fetch('/api/v1/contacts/check-registered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails: emailAddresses }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync contacts');
      }

      const registeredUsers = await response.json();

      // Match device contacts with registered users
      const matches: ContactMatch[] = deviceContacts.map(deviceContact => {
        const userEmail = deviceContact.emails?.[0]?.email;
        const userContact = registeredUsers.find((user: any) => user.email === userEmail);

        return {
          deviceContact,
          userContact,
          isRegistered: !!userContact,
        };
      });

      return matches.filter(match => match.isRegistered);
    } catch (error) {
      console.error('Error syncing contacts:', error);
      Alert.alert('Error', 'Failed to sync contacts with server');
      return [];
    }
  }

  async addContactToMessenger(contact: DeviceContact): Promise<boolean> {
    try {
      // In a real app, this would send the contact info to your server
      // to create a contact relationship

      const response = await fetch('/api/v1/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: contact.name,
          email: contact.emails?.[0]?.email,
          phoneNumber: contact.phoneNumbers?.[0]?.number,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add contact');
      }

      Alert.alert('Success', 'Contact added successfully');
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