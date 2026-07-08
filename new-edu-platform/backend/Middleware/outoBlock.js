const User = require("./User");

const checkAccountAge = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return next();
    }

    const user = await User.findById(
      req.session.userId
    );

    if (!user) {
      return res.redirect("/");
    }

    const now = new Date();
    const created = new Date(user.createdAt);

    const diffDays =
      (now - created) / (1000 * 60 * 60 * 24);

    if (diffDays > 30) {
      req.session.destroy(() => {});

      return res.send(
        "تم إغلاق الحساب بعد 30 يوم."
      );
    }

    next();
  } catch (err) {
    console.log(err);
    next();
  }
};

module.exports = checkAccountAge;