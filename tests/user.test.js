process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://users_user:devpassword@localhost:5433/breezy_users_test';
process.env.INTERNAL_SECRET = 'test-internal-secret';
process.env.AUTH_SERVICE_URL = 'http://localhost:3001';
process.env.CORS_ORIGIN = 'http://localhost:3000';

jest.mock('axios', () => ({ post: jest.fn(), get: jest.fn() }));

const request = require('supertest');
const axios = require('axios');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');
const UserProfile = require('../src/models/userProfile.model');
const Follow = require('../src/models/follow.model');

const U1 = '11111111-1111-1111-1111-111111111111';
const U2 = '22222222-2222-2222-2222-222222222222';
const U3 = '33333333-3333-3333-3333-333333333333';

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await Follow.destroy({ where: {} });
  await UserProfile.destroy({ where: {} });
  axios.post.mockResolvedValue({ data: { ok: true } });
});

describe('POST /users/sync', () => {
  it('sans INTERNAL_SECRET → 401', async () => {
    const res = await request(app)
      .post('/users/sync')
      .send({ id: U1, username: 'user1', role: 'user' });

    expect(res.status).toBe(401);
  });

  it('avec bon INTERNAL_SECRET → 201 et profil créé', async () => {
    const res = await request(app)
      .post('/users/sync')
      .set('x-internal-secret', process.env.INTERNAL_SECRET)
      .send({ id: U1, username: 'synceduser', role: 'user' });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);

    const profile = await UserProfile.findByPk(U1);
    expect(profile).not.toBeNull();
    expect(profile.username).toBe('synceduser');
  });
});

describe('GET /users/:id', () => {
  it('sans headers identity → 401 MISSING_IDENTITY', async () => {
    const res = await request(app).get(`/users/${U1}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_IDENTITY');
  });

  it('utilisateur inexistant → 404', async () => {
    const res = await request(app)
      .get(`/users/${U1}`)
      .set('x-user-id', U2)
      .set('x-user-role', 'user');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('utilisateur existant → 200 avec profil', async () => {
    await UserProfile.create({ id: U1, username: 'alice', role: 'user' });

    const res = await request(app)
      .get(`/users/${U1}`)
      .set('x-user-id', U2)
      .set('x-user-role', 'user');

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
  });
});

describe('POST /users/:id/follow', () => {
  beforeEach(async () => {
    await UserProfile.bulkCreate([
      { id: U1, username: 'user1', role: 'user' },
      { id: U2, username: 'user2', role: 'user' },
    ]);
  });

  it('succès → 200 et relation créée', async () => {
    const res = await request(app)
      .post(`/users/${U2}/follow`)
      .set('x-user-id', U1)
      .set('x-user-role', 'user');

    expect(res.status).toBe(200);

    const follow = await Follow.findOne({ where: { follower_id: U1, followed_id: U2 } });
    expect(follow).not.toBeNull();
  });

  it('se suivre soi-même → 400 CANNOT_SELF_FOLLOW', async () => {
    const res = await request(app)
      .post(`/users/${U1}/follow`)
      .set('x-user-id', U1)
      .set('x-user-role', 'user');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_SELF_FOLLOW');
  });

  it('déjà suivi → 409 ALREADY_FOLLOWING', async () => {
    await request(app)
      .post(`/users/${U2}/follow`)
      .set('x-user-id', U1)
      .set('x-user-role', 'user');

    const res = await request(app)
      .post(`/users/${U2}/follow`)
      .set('x-user-id', U1)
      .set('x-user-role', 'user');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_FOLLOWING');
  });
});

describe('DELETE /users/:id/follow', () => {
  it('succès → 204', async () => {
    await UserProfile.bulkCreate([
      { id: U1, username: 'user1', role: 'user' },
      { id: U2, username: 'user2', role: 'user' },
    ]);
    await Follow.create({ follower_id: U1, followed_id: U2 });

    const res = await request(app)
      .delete(`/users/${U2}/follow`)
      .set('x-user-id', U1)
      .set('x-user-role', 'user');

    expect(res.status).toBe(204);

    const follow = await Follow.findOne({ where: { follower_id: U1, followed_id: U2 } });
    expect(follow).toBeNull();
  });
});

describe('GET /users/:id/followers', () => {
  it('→ 200 avec liste paginée', async () => {
    await UserProfile.bulkCreate([
      { id: U1, username: 'user1', role: 'user' },
      { id: U2, username: 'user2', role: 'user' },
      { id: U3, username: 'user3', role: 'user' },
    ]);
    await Follow.bulkCreate([
      { follower_id: U2, followed_id: U1 },
      { follower_id: U3, followed_id: U1 },
    ]);

    const res = await request(app)
      .get(`/users/${U1}/followers`)
      .set('x-user-id', U1)
      .set('x-user-role', 'user');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });
});

describe('GET /users/:id/following', () => {
  it('→ 200 avec liste d\'IDs', async () => {
    await UserProfile.bulkCreate([
      { id: U1, username: 'user1', role: 'user' },
      { id: U2, username: 'user2', role: 'user' },
      { id: U3, username: 'user3', role: 'user' },
    ]);
    await Follow.bulkCreate([
      { follower_id: U1, followed_id: U2 },
      { follower_id: U1, followed_id: U3 },
    ]);

    const res = await request(app)
      .get(`/users/${U1}/following`)
      .set('x-user-id', U1)
      .set('x-user-role', 'user');

    expect(res.status).toBe(200);
    expect(res.body.data).toContain(U2);
    expect(res.body.data).toContain(U3);
  });
});

describe('PUT /users/:id/ban', () => {
  beforeEach(async () => {
    await UserProfile.create({ id: U2, username: 'target', role: 'user' });
  });

  it('sans rôle moderator/admin → 403 FORBIDDEN', async () => {
    const res = await request(app)
      .put(`/users/${U2}/ban`)
      .set('x-user-id', U1)
      .set('x-user-role', 'user');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('avec rôle moderator → 200 et utilisateur banni', async () => {
    const res = await request(app)
      .put(`/users/${U2}/ban`)
      .set('x-user-id', U1)
      .set('x-user-role', 'moderator');

    expect(res.status).toBe(200);

    const user = await UserProfile.findByPk(U2);
    expect(user.is_banned).toBe(true);
  });
});
