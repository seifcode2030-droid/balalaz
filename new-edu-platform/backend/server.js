const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();
const path = require("path");
const session = require("express-session");
const studentOnly = require("./Middleware/studentOnly");

const User = require("./Middleware/User");
const checkAccountAge = require("./Middleware/outoBlock");
const adminOnly = require("./Middleware/adminOnly");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true
  }
}));

// ======================
// Video Model
// ======================

const videoSchema = new mongoose.Schema({
  title: String,

  videoUrl: String,

  className: {
    type: String,
    required: true
  },

  subject: {
    type: String,
    required: true
  }
});

const Video = mongoose.model("Video", videoSchema);

// ======================
// Video Routes
// ======================

// جلب جميع الفيديوهات
app.get(
  "/api/videos",
  studentOnly,
  async (req, res) => {

    try {

      const user = await User.findById(
        req.session.userId
      );


      if (!user) {
        return res.status(401).json({
          message: "User not found"
        });
      }


      const videos = await Video.find({
        className: user.className,
        subject: user.subject
      });


      res.json(videos);


    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }

  });

app.get(
  "/class/:className/:subject.html",
  studentOnly,
  async (req, res) => {

    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.redirect("/");
    }

    if (
      user.className !== req.params.className ||
      user.subject !== req.params.subject
    ) {
      return res.status(403).send("غير مصرح لك بالدخول");
    }

    res.sendFile(
      path.join(
        __dirname,
        "../frontend",
        "class",
        req.params.className,
        `${req.params.subject}.html`
      )
    );
  }
);

// جلب فيديو واحد
app.get("/api/videos/:id",studentOnly, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    res.json(video);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});




// إضافة فيديو
app.post("/api/videos", adminOnly, async (req, res) => {
  try {
    const video = await Video.create({
      title: req.body.title,
      videoUrl: req.body.videoUrl,
      className: req.body.className,
      subject: req.body.subject
    });

    res.status(201).json(video);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
});

// تعديل فيديو
app.put("/api/videos/:id", adminOnly, async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        videoUrl: req.body.videoUrl,
      },
      {
        new: true,
      }
    );

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    res.json(video);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// حذف فيديو
app.delete("/api/videos/:id", adminOnly, async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    res.json({
      message: "Video deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// ======================
// Users
// ======================



app.post("/add-user", adminOnly, async (req, res) => {
  try {
    const { name, email, password, className, subject } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.send("البريد الإلكتروني موجود بالفعل");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      className,
      subject,
    });

    res.json({
      message: "تم إضافة المستخدم بنجاح",
      user,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("حدث خطأ");
  }
});


mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.get("/test", async (req, res) => {
  const users = await User.find();
  res.send("OK");
});

app.use(express.static(path.join(__dirname, "../frontend")));
app.use(checkAccountAge);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/admin", (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "../frontend/admin.html"));
});

app.get("/users-count", async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});



app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      req.session.isAdmin = true;
      return res.redirect("/admin");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.send("المستخدم غير موجود");
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.send("كلمة المرور غير صحيحة");
    }

    req.session.userId = user._id;
    req.session.role = user.role;


    res.redirect(
      `/class/${user.className}/${user.subject}.html`
    );
  } catch (err) {
    console.log(err);
    res.status(500).send("حدث خطأ");
  }
});

app.get("/dashboard", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("/");
  }

  const user = await User.findById(req.session.userId);

  if (!user) {
    return res.redirect("/");
  }

  const now = new Date();
  const created = new Date(user.createdAt);

  const diffDays = Math.floor(
    (now - created) / (1000 * 60 * 60 * 24)
  );

  const remainingDays = 30 - diffDays;

  res.send(`
    <h1 style="text-align:center;">لوحة التحكم</h1>
    <p style="text-align:center;">البريد الإلكتروني: ${user.email}</p>
    <p style="text-align:center;">الصف: ${user.className}</p>
    <p style="text-align:center;">تاريخ الإنشاء: ${user.createdAt}</p>
    <p style="text-align:center;">الأيام المتبقية: ${remainingDays}</p>
  `);
});

app.delete("/api/users/:id", adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});