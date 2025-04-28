import request from 'supertest';
import { app, pool } from '../index.js';

describe('API Endpoints', () => {
  let testUserId;
  // Test user data based on schema.json structure
  const testUserData = {
    personal_info: {
      first_name: 'Test',
      last_name: 'User',
      dob: '1990-01-01',
      mbti: 'INTJ',
      height: { unit: 'cm', value: 180 },
      children: 0,
      maiden_name: '',
      civil_status: 'single',
      siblings: 1,
      blood_type: 'O+',
      quote: 'Testing is essential.',
      middle_name: '',
      citizenships: ['Testland'],
      preferred_pronouns: 'they/them',
      gender_identity: 'non-binary',
      biological_gender: 'female',
    },
    contact_info: {
      email: [{ label: 'work', address: 'test.user@example.com' }],
      phone: [{ label: 'mobile', number: '+1234567890' }],
      postal_address: {
        zip: '12345',
        city: 'Test City',
        state: 'Test State',
        country: 'Testland',
        address1: '123 Test St',
        address2: '',
      },
      pgp_public_key: 'testkey',
    },
    interests: {
      hobbies: ['coding', 'reading'],
      special_interests: ['AI', 'Open Source'],
      favorite_movies: ['The Matrix'],
      favorite_artists: ['Test Artist'],
      favorite_music_genres: ['Rock'],
    },
    online_profiles: [{ label: 'github', url: 'https://github.com/testuser' }],
    memberships: [{ organization: 'Test Org', role: 'Member' }],
    career: {
      current_positions: [
        {
          employer: 'TestCorp',
          position: 'Developer',
          from: '2020-01',
          to: '',
        },
      ],
      previous_positions: [
        {
          employer: 'OldCorp',
          position: 'Intern',
          from: '2018-01',
          to: '2019-12',
        },
      ],
    },
    skills: {
      languages: [{ language: 'English', proficiency: 'native' }],
      technical: {
        programming_languages: ['JavaScript', 'Python'],
        frameworks: ['Express', 'React'],
        cloud_platforms: ['AWS'],
        scripting_languages: ['Bash'],
        markup_styles: ['Markdown'],
        databases: ['PostgreSQL'],
        ux_ui: ['Figma'],
      },
    },
  };

  beforeAll(async () => {
    // Lege einen Test-User an, damit die GET-Tests funktionieren
    const res = await request(app)
      .post('/add')
      .send(testUserData)
      .set('Content-Type', 'application/json');
    testUserId = res.body.id;
  });

  afterAll(async () => {
    // Lösche den Test-User wieder aus der Datenbank
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await pool.end();
  });

  it('should return 400 on GET / without user ID', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Bad Request');
  });

  it('should return the schema on GET /schema', async () => {
    const res = await request(app).get('/schema');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('personal_info');
    expect(res.body).toHaveProperty('contact_info');
  });

  it('should return an array of all available userIDs on GET /users', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('userIDs');
    expect(Array.isArray(res.body.userIDs)).toBe(true);
    expect(res.body.userIDs).toContain(testUserId);
  });

  it('should return the user data on GET /:id', async () => {
    const res = await request(app).get(`/${testUserId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(testUserData);
  });

  it('should return 404 for non-existent user on GET /:id', async () => {
    const res = await request(app).get('/nonexistentid');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('should return nested data on GET /:id/personal_info', async () => {
    const res = await request(app).get(`/${testUserId}/personal_info`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('personal_info');
    expect(res.body.personal_info).toEqual(testUserData.personal_info);
  });

  it('should return nested data on GET /:id/personal_info/first_name', async () => {
    const res = await request(app).get(
      `/${testUserId}/personal_info/first_name`,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty(
      'first_name',
      testUserData.personal_info.first_name,
    );
  });

  it('should return 404 for invalid key path on GET /:id/invalid/path', async () => {
    const res = await request(app).get(`/${testUserId}/invalid/path`);
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
