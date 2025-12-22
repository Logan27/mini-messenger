import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock queue service BEFORE importing app to prevent background workers from starting
jest.unstable_mockModule('../src/services/queueService.js', () => ({
    emailQueue: { add: jest.fn(), process: jest.fn(), on: jest.fn(), close: jest.fn() },
    fileQueue: { add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }), process: jest.fn(), on: jest.fn(), close: jest.fn() },
    messageCleanupQueue: { add: jest.fn(), process: jest.fn(), on: jest.fn(), close: jest.fn() },
    notificationQueue: { add: jest.fn(), process: jest.fn(), on: jest.fn(), close: jest.fn() },
    queueEmail: jest.fn(),
    queueFileProcessing: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    queueNotification: jest.fn(),
    closeQueues: jest.fn(),
    scheduleMessageCleanup: jest.fn(),
}));

const request = (await import('supertest')).default;
const { default: app } = await import('../src/app.js');

describe('Files API', () => {
    const { factory: testFactory } = global.testUtils;

    // Create temp test file
    const testFilePath = path.join(__dirname, 'test-file.txt');

    beforeAll(() => {
        fs.writeFileSync(testFilePath, 'Test file content');
    });

    afterAll(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    beforeEach(async () => {
        await testFactory.cleanup();
    });

    describe('POST /api/files/upload/messages', () => {
        it('should upload a file successfully', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();

            const response = await request(app)
                .post('/api/files/upload/messages')
                .set('Authorization', userAuth.authHeader)
                .Attach('file', testFilePath)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.filename).toBeDefined();
            expect(response.body.data.originalName).toBe('test-file.txt');
        });

        it('should require authentication', async () => {
            await request(app)
                .post('/api/files/upload/messages')
                .attach('file', testFilePath)
                .expect(401);
        });

        it('should validate file presence', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();

            const response = await request(app)
                .post('/api/files/upload/messages')
                .set('Authorization', userAuth.authHeader)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/files/:id', () => {
        it('should get file details', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();
            const file = await testFactory.createFile(userAuth.user);

            const response = await request(app)
                .get(`/api/files/${file.id}`)
                .set('Authorization', userAuth.authHeader)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(file.id);
        });

        it('should require authentication', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();
            const file = await testFactory.createFile(userAuth.user);

            await request(app)
                .get(`/api/files/${file.id}`)
                .expect(401);
        });

        it('should return 404 for non-existent file', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();

            await request(app)
                .get('/api/files/00000000-0000-0000-0000-000000000000')
                .set('Authorization', userAuth.authHeader)
                .expect(404);
        });
    });

    describe('DELETE /api/files/:id', () => {
        it('should delete file', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();
            const file = await testFactory.createFile(userAuth.user);

            const response = await request(app)
                .delete(`/api/files/${file.id}`)
                .set('Authorization', userAuth.authHeader)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should prevent deleting other users files', async () => {
            const owner = await testFactory.createAuthenticatedUser();
            const attacker = await testFactory.createAuthenticatedUser();
            const file = await testFactory.createFile(owner.user);

            await request(app)
                .delete(`/api/files/${file.id}`)
                .set('Authorization', attacker.authHeader)
                .expect(403);
        });
    });

    describe('GET /api/files/:id/download', () => {
        it('should download file', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();

            // Use a safe temp path for the file
            const safeFilePath = path.join(__dirname, `download-test-${Date.now()}.txt`);

            const file = await testFactory.createFile(userAuth.user, {
                filePath: safeFilePath
            });

            // Create the file content
            fs.writeFileSync(safeFilePath, 'Simulated content');

            const response = await request(app)
                .get(`/api/files/${file.id}/download`)
                .set('Authorization', userAuth.authHeader)
                .expect(200);

            expect(response.headers['content-type']).toBeDefined();

            // Cleanup
            if (fs.existsSync(safeFilePath)) fs.unlinkSync(safeFilePath);
        });
    });
});
