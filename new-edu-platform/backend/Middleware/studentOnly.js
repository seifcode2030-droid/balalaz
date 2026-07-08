module.exports = (req, res, next) => {

    if (!req.session.userId) {
        return res.status(401).json({
            message: "No user data"
        });
    }

    if (req.session.role !== "student") {
        return res.status(403).json({
            message: "Students only"
        });
    }

    next();
};