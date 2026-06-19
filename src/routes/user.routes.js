const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const identity = require('../middleware/identity.middleware');

// Route interne — pas de middleware identity, vérification par INTERNAL_SECRET
router.post('/sync', ctrl.syncUser);

// Routes protégées par le middleware identity (x-user-id obligatoire)
router.get('/search', identity, ctrl.search);
router.get('/:id', identity, ctrl.getUser);
router.get('/:id/followers', identity, ctrl.getFollowers);
router.get('/:id/following', identity, ctrl.getFollowing);
router.post('/:id/follow', identity, ctrl.follow);
router.delete('/:id/follow', identity, ctrl.unfollow);
router.put('/:id/ban', identity, ctrl.banUser);

module.exports = router;
