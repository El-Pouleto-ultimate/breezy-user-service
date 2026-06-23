const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const UserProfile = require('../models/userProfile.model');
const Follow = require('../models/follow.model');
const axios = require('axios');

// Reçoit les données d'un nouvel utilisateur depuis l'auth-service et crée/met à jour son profil
exports.syncUser = async (req, res) => {
  try {
    if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
    }

    const { id, username, role } = req.body;
    await UserProfile.upsert({ id, username, role });

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[User] syncUser error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};

// Retourne le profil public d'un utilisateur
exports.getUser = async (req, res) => {
  try {
    const user = await UserProfile.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' } });
    }
    const currentUserId = req.userId;
    let followedByMe = false;
    if (currentUserId && currentUserId !== req.params.id) {
      const follow = await Follow.findOne({ where: { follower_id: currentUserId, followed_id: req.params.id } });
      followedByMe = !!follow;
    }
    return res.json({ ...user.toJSON(), followedByMe });
  } catch (err) {
    console.error('[User] getUser error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};

// Recherche insensible à la casse, filtre les comptes bannis et inactifs
exports.search = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: { code: 'QUERY_TOO_SHORT', message: 'Minimum 2 caractères.' } });
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await UserProfile.findAndCountAll({
      where: {
        username: { [Op.iLike]: `%${q}%` },
        is_active: true,
        is_banned: false,
      },
      limit: parseInt(limit),
      offset,
      order: [['followers_count', 'DESC']],
    });

    return res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, hasNext: offset + rows.length < count }
    });
  } catch (err) {
    console.error('[User] search error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};

// Crée la relation et met à jour les compteurs dans une transaction atomique
exports.follow = async (req, res) => {
  try {
    const followerId = req.userId;
    const followedId = req.params.id;

    if (followerId === followedId) {
      return res.status(400).json({ error: { code: 'CANNOT_SELF_FOLLOW', message: 'Vous ne pouvez pas vous suivre vous-même.' } });
    }

    const target = await UserProfile.findByPk(followedId);
    if (!target) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' } });
    }

    await sequelize.transaction(async (t) => {
      const [, created] = await Follow.findOrCreate({
        where: { follower_id: followerId, followed_id: followedId },
        transaction: t,
      });
      if (!created) {
        const err = new Error('Déjà suivi');
        err.status = 409;
        err.code = 'ALREADY_FOLLOWING';
        throw err;
      }
      await UserProfile.increment('following_count', { where: { id: followerId }, transaction: t });
      await UserProfile.increment('followers_count', { where: { id: followedId }, transaction: t });
    });

    // Envoyer une notification de type 'follow' au profil-service (Fx16)
    try {
      await axios.post(`${process.env.PROFIL_SERVICE_URL}/api/notifications/internal`, {
        recipient_user_id: followedId,
        type: 'follow',
        from_user_id: followerId,
        from_username: req.username,
      }, {
        headers: { 'x-internal-secret': process.env.INTERNAL_SECRET },
        timeout: 1000,
      });
    } catch (e) {
      // Notification non critique — on log juste
      console.warn('[User] Échec envoi notification follow:', e.message);
    }

    return res.json({ message: `Vous suivez maintenant ${target.username}.` });
  } catch (err) {
    if (err.code === 'ALREADY_FOLLOWING') {
      return res.status(409).json({ error: { code: 'ALREADY_FOLLOWING', message: 'Vous suivez déjà cet utilisateur.' } });
    }
    console.error('[User] follow error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};

// Supprime la relation et décrémente les compteurs dans une transaction atomique
exports.unfollow = async (req, res) => {
  try {
    const followerId = req.userId;
    const followedId = req.params.id;

    await sequelize.transaction(async (t) => {
      const deleted = await Follow.destroy({
        where: { follower_id: followerId, followed_id: followedId },
        transaction: t,
      });
      if (deleted === 0) {
        const err = new Error('Non suivi');
        err.status = 404;
        err.code = 'NOT_FOLLOWING';
        throw err;
      }
      await UserProfile.decrement('following_count', { where: { id: followerId }, transaction: t });
      await UserProfile.decrement('followers_count', { where: { id: followedId }, transaction: t });
    });

    return res.status(204).send();
  } catch (err) {
    if (err.code === 'NOT_FOLLOWING') {
      return res.status(404).json({ error: { code: 'NOT_FOLLOWING', message: 'Vous ne suivez pas cet utilisateur.' } });
    }
    console.error('[User] unfollow error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};

// Retourne la liste paginée des followers avec leurs profils
exports.getFollowers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Follow.findAndCountAll({
      where: { followed_id: req.params.id },
      limit: parseInt(limit),
      offset,
    });

    const followerIds = rows.map(f => f.follower_id);
    const users = await UserProfile.findAll({ where: { id: followerIds } });

    return res.json({
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, hasNext: offset + rows.length < count }
    });
  } catch (err) {
    console.error('[User] getFollowers error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};

// Retourne les utilisateurs suivis (objets complets pour l'affichage)
exports.getFollowing = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Follow.findAndCountAll({
      where: { follower_id: req.params.id },
      limit: parseInt(limit),
      offset,
    });

    const followedIds = rows.map(f => f.followed_id);
    const users = await UserProfile.findAll({ where: { id: followedIds } });

    return res.json({
      data: users,
      ids: followedIds,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, hasNext: offset + rows.length < count }
    });
  } catch (err) {
    console.error('[User] getFollowing error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};

// Réservé aux modérateurs et admins — propage le bannissement vers l'auth-service
exports.banUser = async (req, res) => {
  try {
    if (req.userRole !== 'moderator' && req.userRole !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Action réservée aux modérateurs et administrateurs.' } });
    }

    const user = await UserProfile.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' } });
    }

    await user.update({ is_banned: true });

    // Non bloquant : si l'auth-service est indisponible, le ban local reste appliqué
    try {
      await axios.post(`${process.env.AUTH_SERVICE_URL}/auth/internal/ban`, {
        userId: req.params.id,
      }, {
        headers: { 'x-internal-secret': process.env.INTERNAL_SECRET },
        timeout: 3000,
      });
    } catch (err) {
      console.warn('[User] Sync ban auth-service échoué (non critique):', err.message);
    }

    return res.json({ message: `Utilisateur ${user.username} banni.` });
  } catch (err) {
    console.error('[User] banUser error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};

// Retourne le profil public d'un utilisateur via son username
exports.getByUsername = async (req, res) => {
  try {
    const user = await UserProfile.findOne({ where: { username: req.params.username } });
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' } });
    }
    return res.json(user);
  } catch (err) {
    console.error('[User] getByUsername error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};
