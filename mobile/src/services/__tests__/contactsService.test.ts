import { ContactsService, contactsService, DeviceContact } from '../contactsService';
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';

// Mock expo-contacts (global mock exists but we override for control)
jest.mock('expo-contacts');

// Mock the API - this is key to avoid loading the full api.ts module chain
jest.mock('../api', () => ({
  contactAPI: {
    addContact: jest.fn(),
    removeContact: jest.fn(),
    getContacts: jest.fn(),
  },
  userAPI: {
    searchUsers: jest.fn(),
    getUser: jest.fn(),
  },
}));

// Spy on Alert.alert instead of mocking entire react-native
jest.spyOn(Alert, 'alert').mockImplementation(() => { });

// Import mocked modules after mocking
const { contactAPI, userAPI } = require('../api');

describe('ContactsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = ContactsService.getInstance();
      const instance2 = ContactsService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(contactsService);
    });
  });

  describe('requestPermissions', () => {
    it('returns true when permission is granted', async () => {
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await contactsService.requestPermissions();

      expect(result).toBe(true);
      expect(Contacts.requestPermissionsAsync).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('shows alert and returns false when permission is denied', async () => {
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await contactsService.requestPermissions();

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Required',
        'Contacts permission is required to help you connect with friends.',
        [{ text: 'OK' }]
      );
    });

    it('returns false when permission request throws error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (Contacts.requestPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const result = await contactsService.requestPermissions();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error requesting contacts permission:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getDeviceContacts', () => {
    it('returns formatted device contacts when permission is granted', async () => {
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockContacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          phoneNumbers: [{ number: '1234567890', label: 'mobile' }],
          emails: [{ email: 'john@example.com', label: 'work' }],
          imageAvailable: true,
          image: { uri: 'file://image.jpg' },
        },
        {
          id: 'contact-2',
          name: 'Jane Smith',
          phoneNumbers: [{ number: '0987654321', label: 'home' }],
          emails: [],
          imageAvailable: false,
        },
      ];

      (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
        data: mockContacts,
      });

      const result = await contactsService.getDeviceContacts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
    });

    it('returns empty array when permission is denied', async () => {
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await contactsService.getDeviceContacts();

      expect(result).toEqual([]);
      expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
    });

    it('shows alert and returns empty array on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Contacts.getContactsAsync as jest.Mock).mockRejectedValue(
        new Error('Contacts error')
      );

      const result = await contactsService.getDeviceContacts();

      expect(result).toEqual([]);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load contacts');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('searchContacts', () => {
    beforeEach(() => {
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockContacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          phoneNumbers: [{ number: '1234567890' }],
          emails: [{ email: 'john@example.com' }],
        },
        {
          id: 'contact-2',
          name: 'Jane Smith',
          phoneNumbers: [{ number: '0987654321' }],
          emails: [{ email: 'jane@test.com' }],
        },
      ];

      (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
        data: mockContacts,
      });
    });

    it('returns all contacts when query is empty', async () => {
      const result = await contactsService.searchContacts('');

      expect(result.length).toBe(2);
    });

    it('searches contacts by name', async () => {
      const result = await contactsService.searchContacts('john');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('search is case insensitive', async () => {
      const result = await contactsService.searchContacts('JANE');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Jane Smith');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats 10-digit US phone number', () => {
      expect(contactsService.formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('returns original number for non-10-digit numbers', () => {
      expect(contactsService.formatPhoneNumber('12345')).toBe('12345');
    });

    it('handles empty string', () => {
      expect(contactsService.formatPhoneNumber('')).toBe('');
    });
  });

  describe('getInitials', () => {
    it('gets initials from two-word name', () => {
      expect(contactsService.getInitials('John Doe')).toBe('JD');
    });

    it('gets initial from single-word name', () => {
      expect(contactsService.getInitials('John')).toBe('J');
    });

    it('handles empty string', () => {
      expect(contactsService.getInitials('')).toBe('');
    });
  });

  describe('sortContacts', () => {
    it('sorts contacts alphabetically by name', () => {
      const contacts: DeviceContact[] = [
        { id: '3', name: 'Zoe' },
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];

      const sorted = contactsService.sortContacts(contacts);

      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Zoe');
    });

    it('handles empty array', () => {
      const sorted = contactsService.sortContacts([]);

      expect(sorted).toEqual([]);
    });
  });

  describe('addContactToMessenger', () => {
    it('returns false when user not found', async () => {
      const mockContact: DeviceContact = {
        id: 'contact-1',
        name: 'John Doe',
        emails: [{ email: 'john@example.com' }],
      };

      (userAPI.searchUsers as jest.Mock).mockResolvedValue({
        data: { data: [] },
      });

      const result = await contactsService.addContactToMessenger(mockContact);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('User Not Found', 'This contact is not registered on Messenger.');
    });

    it('adds contact successfully when user found', async () => {
      const mockContact: DeviceContact = {
        id: 'contact-1',
        name: 'John Doe',
        emails: [{ email: 'john@example.com' }],
      };

      (userAPI.searchUsers as jest.Mock).mockResolvedValue({
        data: { data: [{ id: 'user-1', email: 'john@example.com' }] },
      });
      (contactAPI.addContact as jest.Mock).mockResolvedValue({ success: true });

      const result = await contactsService.addContactToMessenger(mockContact);

      expect(result).toBe(true);
      expect(contactAPI.addContact).toHaveBeenCalledWith('user-1');
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Contact added to Messenger!');
    });

    it('handles errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockContact: DeviceContact = {
        id: 'contact-1',
        name: 'John Doe',
        emails: [{ email: 'john@example.com' }],
      };

      (userAPI.searchUsers as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await contactsService.addContactToMessenger(mockContact);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to add contact');

      consoleErrorSpy.mockRestore();
    });
  });
});
