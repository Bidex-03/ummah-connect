const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/multerConfig");

router.get("/get-all-course",  courseController.getAllCourses);

router.get("/statistics", protect, courseController.getCourseStatistics);

router.get("/:id",  courseController.getCourseById);
router.get("/all/paginated", protect, courseController.getPaginatedCourses);

router.post(
  "/create-course",
  protect,
  upload.fields([
    { name: "article", maxCount: 10 },
    { name: "video", maxCount: 5 },
    { name: "audio", maxCount: 5 },
  ]),
  courseController.createCourse
);
router.get("/enrolled-courses/all", protect, courseController.getEnrolledCourses)
router.post('/:courseId/chapters/:chapterIndex/complete', protect, courseController.completeChapter)

router.post(
  "/enroll/:courseId",
  protect,
  courseController.enrollCourse
);

router.put(
  "/:id",
  protect,
  upload.fields([
    { name: "article", maxCount: 10 },
    { name: "video", maxCount: 5 },
    { name: "audio", maxCount: 5 },
  ]),
  courseController.updateCourse
);

router.delete("/:id", protect, courseController.deleteCourse);

router.get("/search", protect, courseController.searchCourses);

router.get(
  "/instructor/:instructorId",
  protect,
  courseController.getCoursesByInstructor
);

router.post("/:id/reviews", protect, courseController.addReview);

module.exports = router;
