import React, { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IoIosArrowForward } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { getUser } from "../../redux/feature/auth/authSlice";
import { FaFacebookF, FaInstagram, FaLinkedin, FaUsers } from "react-icons/fa";
import { BiMessageSquareEdit } from "react-icons/bi";
import { BsTwitterX } from "react-icons/bs";
import EditProfileModal from "./EditProfileModal";
import axios from "axios";
import { IoIosArrowRoundForward } from "react-icons/io";
import { MdEventNote } from "react-icons/md";
import useRedirectLoggedOutUser from "../../components/UseRedirect/UseRedirectLoggedOutUser";
import Notification from "../../components/Notification/Notification";
import { AdminLink, SubscriberLink } from "../../components/Protect/HiddenLink";
import Sidebar from "../../components/Sidebar/Sidebar";
import PageLoader from "@/components/Loader/PageLoader";
import { HiAcademicCap } from "react-icons/hi";

const URL = import.meta.env.VITE_APP_BACKEND_URL;

const Profile = ({ userId }) => {
  useRedirectLoggedOutUser("/login");

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  // console.log(user)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [bookedEventsDetails, setBookedEventsDetails] = useState([]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const initialState = {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    username: user?.username || "",
    emailAddress: user?.emailAddress || "",
    phone: user?.phone || "",
    gender: user?.gender || "",
    isVerified: user?.isVerified || false,
    photo: user?.photo || "",
    role: user?.role || "",
    interests: user?.interests || "",
    location: user?.location || "",
    profession: user?.profession || "",
    facebook: user?.socialMediaLinks.facebook || "",
    linkedIn: user?.socialMediaLinks.linkedin || "",
    instagram: user?.socialMediaLinks.instagram || "",
    x: user?.socialMediaLinks.twitter || "",
  };
  const [profile, setProfile] = useState(initialState);
  const [courses, setCourses] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState([])


  useEffect(() => {
    if (userId) {
      dispatch(getUser(userId));
    }
  }, [dispatch, userId]);

  useLayoutEffect(() => {
    if (user) {
      setProfile({
        ...profile,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress,
        phone: user.phone,
        username: user.username,
        gender: user.gender,
        role: user.role,
        isVerified: user.isVerified,
        photo: user.photo,
        interests: user.interests,
        location: user.location,
        profession: user.profession,
        facebook: user?.socialMediaLinks.facebook,
        linkedIn: user?.socialMediaLinks.linkedin,
        instagram: user?.socialMediaLinks.instagram,
        x: user?.socialMediaLinks.twitter,
      });
    }
  }, [user]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const [threads, setThreads] = useState([]);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const response = await axios.get(`${URL}/discussion/all-threads`);
        setThreads(response.data);
        // console.log(response.data)
      } catch (error) {
        console.error("Error fetching threads:", error);
      }
    };

    fetchThreads();
  }, []);

  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const response = await fetch(`${URL}/events/upcoming`);
      const data = await response.json();
      setEvents(data);
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`${URL}/courses/get-all-course`);
        setCourses(response.data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  })

  useEffect(() => {
    const fetchBookedEvents = async () => {
      try {
        const eventDetailsPromises = user.bookedEvents.map(eventId =>
          axios.get(`${URL}/events/${eventId}`)
        );
        const eventDetailsResponses = await Promise.all(eventDetailsPromises);
        const eventDetails = eventDetailsResponses.map(response => response.data);
        setBookedEventsDetails(eventDetails);
      } catch (error) {
        setError('Failed to fetch booked event details.');
      } finally {
        setLoading(false);
      }
    };
    if (user?.bookedEvents?.length) {
      fetchBookedEvents();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // console.log(user)
    const fetchEnrolledCourse = async () => {
      try {
        if (user?.enrolledCourses?.length) {
          // Log the enrolledCourses to ensure it's populated
          // console.log('Enrolled Courses:', user.enrolledCourses);

          const enrolledCoursePromises = user.enrolledCourses.map((enrolledCourse) =>
            axios.get(`${URL}/courses/${enrolledCourse.course}`)
          );

          const enrolledCourseResponses = await Promise.all(enrolledCoursePromises);
          const enrolledCourseDetails = enrolledCourseResponses.map((response, index) => {
            const courseDetails = response.data;
            const { lastStudiedAt, progress, completedChapters, _id } = user.enrolledCourses[index];

            return {
              ...courseDetails,
              lastStudiedAt,
              progress,
              completedChapters,
              _id,
            };
          });

          setEnrolledCourses(enrolledCourseDetails);
          // console.log('Fetched Enrolled Course Details:', enrolledCourseDetails); // Debugging log
        } else {
          setEnrolledCourses([]); // Ensure state is cleared if no courses
        }
      } catch (error) {
        console.log('Failed to fetch enrolled course details.');
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourse();
  }, [user]);



  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center min-h-screen">
          <PageLoader />
        </div>
      ) :

        <div className="flex flex-col md:flex-row min-h-screen">
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            profile={profile}
            user={user}
          />
          {!isSidebarOpen && (
            <button
              className="p-2 bg-white fixed top-40 left-0 z-10 mt-2 mr-2 border rounded-full"
              onClick={toggleSidebar}
            >
              <IoIosArrowForward size={25} color="black" />
            </button>
          )}

          <div
            className={`w-full bg-white p-4 flex justify-center ${isSidebarOpen ? "md:ml-1/4" : ""
              }`}
          >
            <div className="flex flex-col items-left justify-center w-full md:w-5/6 p-4">
              {!profile.isVerified && <Notification />}
              <div className="p-4">
                <h1 className="font-normal text-[20px] md:text-[45px] ">General Overview</h1>
                <p className="text-neutral-400 text-[14px] md:text-[18px] ">
                  General Overview: A Snapshot of Your Information, Activities, and
                  Achievements.
                </p>
              </div>
              <div className="p-4">
                <p className="text-[18px] md:text-[24px] font-[500] ">Profile Overview</p>
                <div className="border p-6 rounded-lg">
                  <img
                    src={imagePreview === null ? user?.photo : imagePreview}
                    alt=""
                    style={{ width: "50px", height: "50px", borderRadius: "50%" }}
                    loading="lazy"
                  />
                  <div>
                    <p className="text-[16px] ">Name and Basic Info</p>
                    <p className="text-[14px] text-neutral-400 mt-2">
                      Name: {profile.firstName} {profile.lastName}
                    </p>
                    <p className="text-[14px] text-neutral-400">
                      Email: {profile.emailAddress}
                    </p>
                    <p className="text-[14px] text-neutral-400">
                      Interest: {profile.interests}
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center gap-2 rounded-lg border bg-neutral-100 w-[150px] my-4 p-3 cursor-pointer"
                    onClick={openModal}
                  >
                    <BiMessageSquareEdit
                      size={15}
                      color="black"
                      title="Edit Profile"
                    />
                    <p>Edit Profile</p>
                  </div>
                  <div className="flex gap-4">
                    <a href={profile.facebook}>
                      <FaFacebookF size={20} color="blue" />
                    </a>
                    <a href={profile.instagram}>
                      <FaInstagram size={20} color="#d62976" />
                    </a>
                    <a href={profile.linkedIn}>
                      <FaLinkedin size={20} color="#0077B5" />
                    </a>
                    <a href={profile.x}>
                      <BsTwitterX size={20} color="#121212" />
                    </a>
                  </div>
                </div>
              </div>

              {user?.isVerified && (
                <>

                  <AdminLink>
                    <div className="p-4">
                      <p className="text-[18px] md:text-[24px] font-[500]">Courses</p>
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full bg-white rounded-lg border">
                          <thead className="bg-gray-200">
                            <tr>
                              <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">
                                Title
                              </th>
                              <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {courses?.length > 0 ? (
                              courses.map((course) => (
                                <tr key={course._id} className="bg-neutral-100">
                                  <td className="px-6 py-4 border-b">
                                    <div className="flex items-center">
                                      <HiAcademicCap size={15} className="mr-2" />
                                      <span>{course.title}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 border-b">
                                    <Link to={`/course-info/${course._id}`} className="text-sm underline">
                                      View Details
                                    </Link>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                  No courses available.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </AdminLink>


                  {/* <SubscriberLink> */}

                    <div className="p-4">
                      <h1 className="text-[18px] md:text-[24px] font-[500]">Enrolled Courses</h1>
                      <div className="p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border">
                        {enrolledCourses.length > 0 ? (
                          <div className="w-full bg-blue-100 p-4 border rounded-lg cursor-pointer">
                            {enrolledCourses.map(course => (
                              <Link to={`/event/${course._id}`} key={course._id}>
                                <div className="bg-white shadow-lg rounded-lg p-6">
                                  <h2 className="text-2xl font-semibold mb-4">{course.title}</h2>
                                  <p className="text-gray-700 mb-2">{course.description}</p>
                                  <p className="text-gray-700 mb-2">$&nbsp;{course.price}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500">You have not enrolled in any course yet.</p>
                        )}
                      </div>
                    </div>
                  {/* </SubscriberLink> */}


                  <AdminLink>
                    <div className="p-4">
                      <p className="text-[18px] md:text-[24px] font-[500]">Upcoming Events</p>

                      <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full bg-white rounded-lg border">
                          <thead className="bg-gray-200">
                            <tr>
                              <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">
                                Title
                              </th>

                              <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">
                                Actions
                              </th>

                            </tr>
                          </thead>
                          <tbody>
                            {events?.length > 0 ? (
                              events.map((event) => (
                                <tr key={event._id} className="bg-neutral-100">
                                  <td className="px-6 py-4 border-b">
                                    <div className="flex items-center">
                                      <MdEventNote size={15} className="mr-2" />
                                      <span>{event.title}</span>
                                    </div>
                                  </td>

                                  <td className="px-6 py-4 border-b">
                                    <Link to={`/event/${event._id}`} className="text-sm underline">
                                      View Details
                                    </Link>
                                  </td>

                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                  No events available.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </AdminLink>

                  {/* <SubscriberLink> */}

                    <div className="p-4">
                      <h1 className="text-[18px] md:text-[24px] font-[500]">Booked Events</h1>
                      <div className="p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border">
                        {bookedEventsDetails.length > 0 ? (
                          bookedEventsDetails.map(event => (
                            <Link to={`/event/${event._id}`} key={event._id}>
                              <div className="bg-blue-100 shadow-lg rounded-lg p-6 cursor-pointer hover:shadow-xl transition-shadow duration-300 ">
                                <h2 className="text font-semibold mb-4">{event.title}</h2>
                                <p className="text-gray-700 mb-2">{event.subTitle}</p>
                                <p className="text-gray-500">Date: {new Date(event.date).toLocaleString()}</p>
                                <p className="text-gray-500">Location: {event.location}</p>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 col-span-full">You have no booked events.</p>
                        )}
                      </div>
                    </div>

                  {/* </SubscriberLink> */}

                  <div className="p-4">
                    <h1 className="text-[18px] md:text-[24px] font-[500]">Recent Forum Activity</h1>

                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full bg-white rounded-lg border">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">
                              Title
                            </th>

                            <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {threads?.length > 0 ? (
                            threads.map((thread) => (
                              <tr key={thread._id} className="bg-neutral-100">
                                <td className="px-6 py-4 border-b">
                                  <span >{thread.title}</span>
                                </td>

                                <td className="px-6 py-4 border-b">
                                  <Link
                                    to={`/threads/${thread._id}`}
                                    className="text-[12px] font-semibold text-black hover:underline flex items-center transition-transform duration-300 ease-in-out transform hover:translate-x-1"
                                  >
                                    <IoIosArrowRoundForward size={14} className="mr-1" />
                                    View Thread
                                  </Link>

                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                                No recent forum activity.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <EditProfileModal isOpen={isModalOpen} onClose={closeModal} />
        </div>
      }
    </>
  );
};

export default Profile;
