import { ContactsService, contactsService, DeviceContact } from '../contactsService';
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('expo-contacts');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock global fetch
global.fetch = jest.fn();

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

      expect(result).toEqual([
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
          image: undefined,
        },
      ]);

      expect(Contacts.getContactsAsync).toHaveBeenCalledWith({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Image,
        ],
      });
    });

    it('returns empty array when permission is denied', async () => {
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await contactsService.getDeviceContacts();

      expect(result).toEqual([]);
      expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
    });

    it('handles contacts without names', async () => {
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockContacts = [
        {
          id: 'contact-3',
          phoneNumbers: [{ number: '5555555555' }],
        },
      ];

      (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
        data: mockContacts,
      });

      const result = await contactsService.getDeviceContacts();

      expect(result[0].name).toBe('Unknown');
      expect(result[0].id).toBe('contact-3');
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
      expect(consoleErrorSpy).toHaveBeenCalled();

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
        {
          id: 'contact-3',
          name: 'Bob Johnson',
          phoneNumbers: [{ number: '5555555555' }],
          emails: [{ email: 'bob@company.com' }],
        },
      ];

      (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
        data: mockContacts,
      });
    });

    it('returns all contacts when query is empty', async () => {
      const result = await contactsService.searchContacts('');

      expect(result.length).toBe(3);
    });

    it('searches contacts by name', async () => {
      const result = await contactsService.searchContacts('john');

      expect(result.length).toBe(2); // John Doe and Bob Johnson
      expect(result.some(c => c.name === 'John Doe')).toBe(true);
      expect(result.some(c => c.name === 'Bob Johnson')).toBe(true);
    });

    it('searches contacts by phone number', async () => {
      const result = await contactsService.searchContacts('1234');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('searches contacts by email', async () => {
      const result = await contactsService.searchContacts('test');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Jane Smith');
    });

    it('search is case insensitive', async () => {
      const result = await contactsService.searchContacts('JANE');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Jane Smith');
    });

    it('returns empty array when no matches', async () => {
      const result = await contactsService.searchContacts('nonexistent');

      expect(result.length).toBe(0);
    });

    it('handles whitespace in query', async () => {
      const result = await contactsService.searchContacts('  ');

      expect(result.length).toBe(3); // Returns all when trimmed query is empty
    });
  });

  describe('syncContactsWithServer', () => {
    beforeEach(() => {
      (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
    });

    it('syncs contacts and returns registered users', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          emails: [{ email: 'john@example.com' }],
        },
        {
          id: 'contact-2',
          name: 'Jane Smith',
          emails: [{ email: 'jane@test.com' }],
        },
        {
          id: 'contact-3',
          name: 'Bob Johnson',
          emails: [{ email: 'bob@company.com' }],
        },
      ];

      (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
        data: mockContacts,
      });

      const mockRegisteredUsers = [
        { id: 'user-1', email: 'john@example.com', name: 'John Doe' },
        { id: 'user-3', email: 'bob@company.com', name: 'Bob Johnson' },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRegisteredUsers,
      });

      const result = await contactsService.syncContactsWithServer();

      expect(result.length).toBe(2);
      expect(result[0].isRegistered).toBe(true);
      expect(result[0].userContact?.email).toBe('john@example.com');
      expect(result[1].isRegistered).toBe(true);
      expect(result[1].userContact?.email).toBe('bob@company.com');

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/contacts/check-registered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: ['john@example.com', 'jane@test.com', 'bob@company.com'],
        }),
      });
    });

    it('returns empty array when no contacts have emails', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          phoneNumbers: [{ number: '1234567890' }],
        },
      ];

      (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
        data: mockContacts,
      });

      const result = await contactsService.syncContactsWithServer();

      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('shows alert and returns empty array when fetch fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockContacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          emails: [{ email: 'john@example.com' }],
        },
      ];

      (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
        data: mockContacts,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await contactsService.syncContactsWithServer();

      expect(result).toEqual([]);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to sync contacts with server');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('handles fetch throwing error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockContacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          emails: [{ email: 'john@example.com' }],
        },
      ];

      (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
        data: mockContacts,
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await contactsService.syncContactsWithServer();

      expect(result).toEqual([]);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to sync contacts with server');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('addContactToMessenger', () => {
    it('adds contact successfully', async () => {
      const mockContact: DeviceContact = {
        id: 'contact-1',
        name: 'John Doe',
        emails: [{ email: 'john@example.com' }],
        phoneNumbers: [{ number: '1234567890' }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await contactsService.addContactToMessenger(mockContact);

      expect(result).toBe(true);
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Contact added successfully');
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          phoneNumber: '1234567890',
        }),
      });
    });

    it('handles contact without email', async () => {
      const mockContact: DeviceContact = {
        id: 'contact-2',
        name: 'Jane Smith',
        phoneNumbers: [{ number: '0987654321' }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await contactsService.addContactToMessenger(mockContact);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Jane Smith',
          email: undefined,
          phoneNumber: '0987654321',
        }),
      });
    });

    it('shows error alert and returns false when fetch fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockContact: DeviceContact = {
        id: 'contact-1',
        name: 'John Doe',
        emails: [{ email: 'john@example.com' }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await contactsService.addContactToMessenger(mockContact);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to add contact');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('handles fetch throwing error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockContact: DeviceContact = {
        id: 'contact-1',
        name: 'John Doe',
      };

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await contactsService.addContactToMessenger(mockContact);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to add contact');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats 10-digit US phone number', () => {
      expect(contactsService.formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('formats phone number with non-digit characters', () => {
      expect(contactsService.formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
      expect(contactsService.formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
      expect(contactsService.formatPhoneNumber('123.456.7890')).toBe('(123) 456-7890');
    });

    it('returns original number for non-10-digit numbers', () => {
      expect(contactsService.formatPhoneNumber('12345')).toBe('12345');
      expect(contactsService.formatPhoneNumber('123456789012')).toBe('123456789012');
    });

    it('handles empty string', () => {
      expect(contactsService.formatPhoneNumber('')).toBe('');
    });

    it('handles international format', () => {
      // International format has 11 digits after cleaning, so returns original
      expect(contactsService.formatPhoneNumber('+1 (123) 456-7890')).toBe('+1 (123) 456-7890');
    });
  });

  describe('getInitials', () => {
    it('gets initials from two-word name', () => {
      expect(contactsService.getInitials('John Doe')).toBe('JD');
    });

    it('gets initials from three-word name', () => {
      expect(contactsService.getInitials('John Michael Doe')).toBe('JM');
    });

    it('gets initial from single-word name', () => {
      expect(contactsService.getInitials('John')).toBe('J');
    });

    it('handles lowercase names', () => {
      expect(contactsService.getInitials('john doe')).toBe('JD');
    });

    it('handles names with extra spaces', () => {
      // Extra spaces create empty strings when split, resulting in only first initial
      expect(contactsService.getInitials('John  Doe')).toBe('J');
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

    it('sorts case-insensitively', () => {
      const contacts: DeviceContact[] = [
        { id: '1', name: 'zebra' },
        { id: '2', name: 'Apple' },
        { id: '3', name: 'banana' },
      ];

      const sorted = contactsService.sortContacts(contacts);

      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('banana');
      expect(sorted[2].name).toBe('zebra');
    });

    it('handles empty array', () => {
      const sorted = contactsService.sortContacts([]);

      expect(sorted).toEqual([]);
    });

    it('handles single contact', () => {
      const contacts: DeviceContact[] = [{ id: '1', name: 'John' }];

      const sorted = contactsService.sortContacts(contacts);

      expect(sorted.length).toBe(1);
      expect(sorted[0].name).toBe('John');
    });
  });
});
