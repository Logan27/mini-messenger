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

    describe('POST /api/files/upload', () => {
        it('should upload a file successfully', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();

            const response = await request(app)
                .post('/api/files/upload')
                .set('Authorization', userAuth.authHeader)
                .attach('file', testFilePath)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.filename).toBeDefined();
            expect(response.body.data.originalName).toBe('test-file.txt');
        });

        // Skipped: ECONNRESET due to supertest stream teardown with file attachments
        it.skip('should require authentication', async () => {
            await request(app)
                .post('/api/files/upload')
                .attach('file', testFilePath)
                .expect(401);
        });

        it('should validate file presence', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();

            const response = await request(app)
                .post('/api/files/upload')
                .set('Authorization', userAuth.authHeader)
                .expect(400);

            // Expect 400 Bad Request (validation error)
            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/files/:id', () => {
        // GET /:id IS the download endpoint, so we expect headers and stream, not JSON metadata
        it('should download file by ID', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();

            // Use uploads directory to pass path traversal check
            const uploadsDir = path.resolve(__dirname, '../uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const safeFilename = `download-actual-${Date.now()}.txt`;
            const safeFilePath = path.join(uploadsDir, safeFilename);
            fs.writeFileSync(safeFilePath, 'File content for download');

            const file = await testFactory.createFile(userAuth.user, {
                filePath: safeFilePath,
                fileSize: 25 // bytes
            });

            const response = await request(app)
                .get(`/api/files/${file.id}`)
                .set('Authorization', userAuth.authHeader);

            if (response.status !== 200) {
                console.log('Download Error:', JSON.stringify(response.body, null, 2));
            }
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBeDefined();
            expect(response.headers['content-disposition']).toContain('attachment');
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

    describe('POST /api/files/:id/delete', () => {
        it('should delete file', async () => {
            const userAuth = await testFactory.createAuthenticatedUser();
            const file = await testFactory.createFile(userAuth.user);

            const response = await request(app)
                .post(`/api/files/${file.id}/delete`)
                .set('Authorization', userAuth.authHeader)
                .expect(200);

            expect(response.body.message).toBeDefined();
        });

        it('should prevent deleting other users files', async () => {
            const owner = await testFactory.createAuthenticatedUser();
            const attacker = await testFactory.createAuthenticatedUser();
            const file = await testFactory.createFile(owner.user);

            await request(app)
                .post(`/api/files/${file.id}/delete`)
                .set('Authorization', attacker.authHeader)
                .expect(403);
        });
    });


});
