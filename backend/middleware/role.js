module.exports = (roles) => {
  return async (req, res, next) => {
    const user = await require('../models/User').findById(req.user);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    next();
  };
};