const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();
const path = require("path");
const teacherOrStudent = require("./Middleware/teacherOrStudent");

const checkSubscription = require("./Middleware/checkSubscription");
const session = require("express-session");

const adminOrTeacher = require("./Middleware/adminOrTeacher");
const studentOnly = require("./Middleware/studentOnly");
const Content = require("./Middleware/Content");
const User = require("./Middleware/User");
const checkAccountAge = require("./Middleware/outoBlock");
const adminOnly = require("./Middleware/adminOnly");
const teacherOnly = require("./Middleware/teacherOnly");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }
  })
);

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const videoSchema = new mongoose.Schema({
  title: String,
  videoUrl: String,

  className: {
    type: String,
    required: true,
  },

  subject: {
    type: String,
    required: true,
  },
});

const Video = mongoose.model("Video", videoSchema);

app.use(
  express.static(
    path.join(__dirname, "../frontend")
  )
);

app.use(checkAccountAge);

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/login.html"
    )
  );
});




app.get("/admin", adminOnly, (req, res) => {

  if (!req.session.isAdmin) {
    return res.redirect("/");
  }
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/protect/admin.html"
    )
  );

});

app.get("/protect/teacher.html", (req, res) => {
  res.send("Cannot GET /protect/teacher.html")
})

app.get("/protect/subjects.html", (req, res) => {
  res.send("Cannot GET /protect/subjects.html")
})

app.get("/protect/teacher-content.html", (req, res) => {
  res.send("Cannot GET /protect/teacher-content.html")
})

app.get("/protect/teacher-profile.html", (req, res) => {
  res.send("Cannot GET /protect/teacher-profile.html")
})

app.get("/protect/teachers.html", (req, res) => {
  res.send("Cannot GET /protect/teachers.html")
})

app.get("/admin", adminOnly, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/protect/admin.html")
  );
});

app.get("/subjects.html", studentOnly, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/protect/subjects.html"
    )
  );
});

app.get("/teacher", teacherOnly, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/protect/teacher.html"
    )
  );
});

app.get("/teachers.html", studentOnly, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/protect/teachers.html"
    )
  );
});

app.get("/teacher-profile.html", studentOnly, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/protect/teacher-profile.html"
    )
  );
});

app.get("/teacher-content.html", studentOnly, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/protect/teacher-content.html"
    )
  );
});

app.patch(
  "/api/users/:id/renew",
  adminOnly,
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {

        return res.status(404).json({
          success: false,
          message: "User not found"
        });

      }

      const end = new Date(
        user.subscriptionEnd > new Date()
          ? user.subscriptionEnd
          : new Date()
      );

      end.setDate(
        end.getDate() + 30
      );

      user.subscriptionEnd = end;

      await user.save();

      res.json({
        success: true,
        user
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false
      });

    }

  }
);

app.delete(
  "/api/content/:id",
  adminOrTeacher,
  async (req, res) => {

    try {

      const content =
        await Content.findByIdAndDelete(
          req.params.id
        );

      if (!content) {

        return res.status(404).json({
          message: "Content not found"
        });

      }

      res.json({
        message:
          "Content deleted successfully"
      });

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.get(
  "/api/content",
  studentOnly,
  async (req, res) => {

    try {

      const user = await User.findById(
        req.session.userId
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      const contents = await Content.find({
        className: user.className,
        subject: {
          $in: user.subjects
        }
      });

      res.json(contents);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message: err.message
      });

    }

  }
);

app.get(
  "/api/content/all",
  adminOrTeacher,
  async (req, res) => {

    try {

      // الأدمن يرى كل المحتويات
      if (
        req.session.isAdmin ||
        req.session.role === "admin"
      ) {

        const contents =
          await Content.find();

        return res.json(contents);

      }

      // المدرس يرى محتوياته فقط
      const contents =
        await Content.find({
          teacherId: req.session.userId
        });

      res.json(contents);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message: err.message
      });

    }

  }
);

app.get(
  "/api/content/:className/:subject/:type",
  async (req, res) => {

    try {

      const {
        className,
        subject,
        type
      } = req.params;

      const contents =
        await Content.find({
          className,
          subject,
          type
        });

      res.json(contents);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: "Server Error"
      });

    }

  }
);

app.get(
  "/api/content/all",
  adminOrTeacher,
  async (req, res) => {

    try {

      if (
        req.session.role === "admin" ||
        req.session.isAdmin
      ) {

        const contents =
          await Content.find();

        return res.json(contents);

      }

      if (
        req.session.role === "teacher"
      ) {

        const contents =
          await Content.find({
            teacherId: req.session.userId
          });

        return res.json(contents);

      }

      res.status(403).json({
        message: "غير مصرح"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.get(
  "/api/teacher/content",
  teacherOnly,
  async (req, res) => {

    try {

      const teacher = await User.findById(
        req.session.userId
      );

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher not found"
        });
      }

      const contents = await Content.find({
        teacherId: teacher._id
      });


      res.json(contents);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.get("/logout", (req, res) => {

  req.session.destroy(() => {
    res.redirect("/");
  });

});

app.get("/test", async (req, res) => {
  res.send("OK");
});

app.get(
  "/api/my-subjects",
  studentOnly,
  async (req, res) => {

    const user =
      await User.findById(
        req.session.userId
      );

    res.json(
      user.subjects || []
    );

  }
);

app.get(
  "/users-count",
  async (req, res) => {

    const count =
      await User.countDocuments({
        role: "student"
      });

    res.json({ count });

  }
);

app.get(
  "/teachers-count",
  async (req, res) => {

    const count =
      await User.countDocuments({
        role: "teacher"
      });

    res.json({ count });

  }
);

app.get(
  "/api/users",
  async (req, res) => {

    try {

      if (!req.session.isAdmin) {

        return res.status(401).json({
          message: "Admin only"
        });

      }

      const users =
        await User.find()
          .select("-password");

      res.json(users);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message: err.message
      });

    }

  }
);

app.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {

      req.session.isAdmin = true;
      req.session.userId = "admin";
      req.session.role = "admin";

      return req.session.save(() => {
        res.redirect("/admin");
      });

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

    req.session.save((err) => {

      if (err) {
        console.log(err);
        return res.status(500).send("Session Error");
      }

      if (user.role === "teacher") {
        return res.redirect("/teacher");
      }

      res.redirect("/subjects.html");

    });

  } catch (err) {

    console.log(err);

    res.status(500).send("حدث خطأ");

  }

});

app.get("/teacher", teacherOnly, (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "../frontend/teacher.html"
    )
  );

});

app.get(
  "/class/:className/:subject.html",
  studentOnly,
  async (req, res) => {

    const user = await User.findById(
      req.session.userId
    );

    if (!user) {
      return res.redirect("/");
    }

    if (
      user.className !== req.params.className ||
      !user.subjects.includes(
        req.params.subject
      )
    ) {

      return res
        .status(403)
        .send("غير مصرح لك بالدخول");

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

app.get("/api/videos", async (req, res) => {

  try {

    if (req.session.isAdmin) {

      const videos =
        await Video.find();

      return res.json(videos);

    }

    if (!req.session.userId) {

      return res.status(401).json({
        message: "No user data"
      });

    }

    const user =
      await User.findById(
        req.session.userId
      );

    if (!user) {

      return res.status(401).json({
        message: "User not found"
      });

    }

    const videos =
      await Video.find({
        className: user.className,
        subject: {
          $in: user.subjects
        }
      });

    res.json(videos);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

app.get(
  "/api/videos/:id",
  studentOnly,
  async (req, res) => {

    try {

      const video =
        await Video.findById(
          req.params.id
        );

      if (!video) {

        return res.status(404).json({
          message: "Video not found"
        });

      }

      res.json(video);

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.post(
  "/api/videos",
  adminOnly,
  async (req, res) => {

    try {

      const video =
        await Video.create({

          title: req.body.title,
          videoUrl: req.body.videoUrl,
          className: req.body.className,
          subject: req.body.subject

        });

      res.status(201).json(video);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.put(
  "/api/videos/:id",
  adminOnly,
  async (req, res) => {

    try {

      const video =
        await Video.findByIdAndUpdate(
          req.params.id,
          {
            title: req.body.title,
            videoUrl: req.body.videoUrl
          },
          {
            new: true
          }
        );

      if (!video) {

        return res.status(404).json({
          message: "Video not found"
        });

      }

      res.json(video);

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.delete(
  "/api/videos/:id",
  adminOnly,
  async (req, res) => {

    try {

      const video =
        await Video.findByIdAndDelete(
          req.params.id
        );

      if (!video) {

        return res.status(404).json({
          message: "Video not found"
        });

      }

      res.json({
        message:
          "Video deleted successfully"
      });

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.post(
  "/add-teacher",
  adminOnly,
  async (req, res) => {

    try {

      const {
        name,
        email,
        password,
        subjects
      } = req.body;

      const existingTeacher =
        await User.findOne({ email });

      if (existingTeacher) {

        return res.status(400).json({
          message:
            "البريد الإلكتروني موجود بالفعل"
        });

      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const teacher =
        await User.create({

          name,
          email,
          password: hashedPassword,
          role: "teacher",
          subjects

        });

      res.status(201).json({
        message:
          "تم إضافة المدرس بنجاح",
        teacher
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.post(
  "/add-user",
  adminOnly,
  async (req, res) => {

    try {

      const {
        name,
        email,
        password,
        className,
        subjects
      } = req.body;

      const existingUser =
        await User.findOne({ email });

      if (existingUser) {

        return res.send(
          "البريد الإلكتروني موجود بالفعل"
        );

      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const user =
        await User.create({

          name,
          email,
          password: hashedPassword,
          className,
          subjects

        });

      res.json({
        message:
          "تم إضافة المستخدم بنجاح",
        user
      });

    } catch (err) {

      console.log(err);

      res.status(500)
        .send("حدث خطأ");

    }

  }
);

app.get(
  "/api/teachers/:subject",
  studentOnly,
  async (req, res) => {

    try {

      const teachers = await User.find({
        role: "teacher",
        subjects: req.params.subject
      }).select("-password");

      res.json(teachers);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.delete(
  "/api/users/:id",
  adminOnly,
  async (req, res) => {

    try {

      await User.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false
      });

    }

  }
);

app.get(
  "/api/teachers",
  adminOnly,
  async (req, res) => {

    try {

      const teachers = await User.find({
        role: "teacher"
      }).select("-password");

      res.json(teachers);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.get(
  "/content-count",
  async (req, res) => {

    try {

      const count =
        await Content.countDocuments();

      res.json({
        count
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: "Server Error"
      });

    }

  }
);

app.delete(
  "/api/teachers/:id",
  async (req, res) => {

    try {

      const teacher =
        await User.findOneAndDelete({
          _id: req.params.id,
          role: "teacher"
        });

      if (!teacher) {

        return res.status(404).json({
          success: false,
          message: "المدرس غير موجود"
        });

      }

      res.json({
        success: true,
        message: "تم حذف المدرس"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        success: false,
        message: "خطأ في السيرفر"
      });

    }

  }
);

app.get(
  "/dashboard",
  async (req, res) => {

    if (
      !req.session ||
      !req.session.userId
    ) {
      return res.redirect("/");
    }

    const user =
      await User.findById(
        req.session.userId
      );

    if (!user) {
      return res.redirect("/");
    }

    const now = new Date();
    const created = new Date(
      user.createdAt
    );

    const diffDays = Math.floor(
      (now - created) /
      (1000 * 60 * 60 * 24)
    );

    const remainingDays =
      30 - diffDays;

    res.send(`
      <h1 style="text-align:center;">
        لوحة التحكم
      </h1>

      <p style="text-align:center;">
        البريد الإلكتروني:
        ${user.email}
      </p>

      <p style="text-align:center;">
        الصف:
        ${user.className}
      </p>

      <p style="text-align:center;">
        تاريخ الإنشاء:
        ${user.createdAt}
      </p>

      <p style="text-align:center;">
        الأيام المتبقية:
        ${remainingDays}
      </p>
    `);

  }
);

app.get(
  "/api/teacher-content/:teacherId",
  studentOnly,
  async (req, res) => {

    try {

      const teacher =
        await User.findById(req.params.teacherId);

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher not found"
        });
      }

      const contents = await Content.find({
        teacherId: teacher._id
      });

      res.json(contents);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.get("/api/teacher/subjects", teacherOnly, async (req, res) => {

  let user = null;

  if (req.session.userId !== "admin") {
    user = await User.findById(req.session.userId);
  }

  res.json(user.subjects);

});

app.get(
  "/api/student/content",
  studentOnly,
  async (req, res) => {

    try {

      const user = await User.findById(
        req.session.userId
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      const contents = await Content.find({
        className: user.className,
        subject: {
          $in: user.subjects
        }
      });

      res.json(contents);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message: err.message
      });

    }

  }
);

app.post(
  "/api/content",
  adminOrTeacher,
  async (req, res) => {

    try {

      let subject = req.body.subject;

      // المدرس
      if (req.session.role === "teacher") {

        const teacher = await User.findById(
          req.session.userId
        );

        if (!teacher) {
          return res.status(404).json({
            message: "Teacher not found"
          });
        }

        if (!subject) {
          return res.status(400).json({
            message: "يجب اختيار المادة"
          });
        }

        if (
          !teacher.subjects.includes(subject)
        ) {
          return res.status(403).json({
            message: "غير مسموح بهذه المادة"
          });
        }

      }

      const content = await Content.create({

        title: req.body.title,

        url: req.body.url,

        className: req.body.className,

        subject: subject,

        unit: req.body.unit,

        lesson: req.body.lesson,

        type: req.body.type,

        teacherId:
          req.session.role === "teacher"
            ? req.session.userId
            : req.body.teacherId

      });

      res.status(201).json(content);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message: err.message
      });

    }

  }
);

app.get(
  "/api/content", teacherOrStudent, async (req, res) => {

    // const contents = await Content.find({
    //   teacherId: req.session.userId
    // });

    const contents = await Content.find({
      className: user.className,
      subject: {
        $in: user.subjects
      }
    });

    res.json(contents);

  });

app.get(
  "/test-content",
  async (req, res) => {

    try {

      const contents =
        await Content.find();

      res.json(contents);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message: err.message
      });

    }

  }
);

app.get("/api/admin/teachers", adminOnly, async (req, res) => {
  const teachers = await User.find({
    role: "teacher"
  }).select("name subjects");

  res.json(teachers);
});

app.get(
  "/api/teacher/:id/content",
  studentOnly,
  async (req, res) => {

    try {

      const teacher =
        await User.findById(
          req.params.id
        );

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher not found"
        });
      }

      

      const contents = await Content.find({
        subject: {
          $in: teacher.subjects
        }
      });

       ("Contents found:", contents);

      res.json(contents);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});